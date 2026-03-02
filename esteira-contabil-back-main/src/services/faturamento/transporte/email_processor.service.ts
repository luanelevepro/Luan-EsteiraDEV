import transporteService from '@/services/faturamento/transporte/transporte.service';
import xmlUploadService from '@/services/faturamento/transporte/xmlUpload.service';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

interface ProcessedEmail {
  messageId: string;
  subject: string;
  from: string;
  processedAt: Date;
  xmlCount: number;
  success: boolean;
  error?: string;
}

class EmailProcessorService {
  private readonly mailboxEmail = process.env.MICROSOFT_USER;
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.CLIENT_ID!,
          client_secret: process.env.CLIENT_SECRET!,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      return response.data.access_token;
    } catch (error: any) {
      console.error('Error getting access token:', error.message);
      throw new Error('Failed to get access token');
    }
  }

  async processEmail(messageId: string): Promise<ProcessedEmail> {
    const result: ProcessedEmail = {
      messageId,
      subject: '',
      from: '',
      processedAt: new Date(),
      xmlCount: 0,
      success: false,
    };

    try {
      const message = await transporteService.getMessageById(messageId);
      result.subject = message.subject;
      result.from = message.from.emailAddress.address;

      console.log(`\n📧 Processing Email: ${messageId}`);
      console.log(`   From: ${result.from}`);
      console.log(`   Subject: ${result.subject}`);

      if (!message.hasAttachments) {
        console.log('   📭 No attachments - Archiving');
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Arquivados');
        result.success = true;
        return result;
      }

      const attachments =
        await transporteService.getMessageAttachments(messageId);

      const xmlAttachments = attachments.filter(
        (att) => att.contentType === 'text/xml' || att.name.endsWith('.xml')
      );

      if (xmlAttachments.length === 0) {
        console.log('   📭 No XML attachments - Archiving');
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Arquivados');
        result.success = true;
        return result;
      }

      console.log(`   📎 Found ${xmlAttachments.length} XML attachment(s)`);

      let processedXmlCount = 0;
      let failedXmlCount = 0;

      for (const attachment of xmlAttachments) {
        try {
          console.log(`\n   📄 Processing: ${attachment.name}`);

          const xmlContent =
            await transporteService.getAttachmentAsString(attachment);

          // Use XmlUploadService to process the XML
          const files = [
            {
              buffer: Buffer.from(xmlContent, 'utf-8'),
              fileName: attachment.name,
            },
          ];

          const results = await xmlUploadService.processXmlFiles(files);

          if (results.length > 0 && results[0].success) {
            processedXmlCount++;
            console.log(
              `   ✅ ${results[0].type} saved successfully (ID: ${results[0].id})`
            );
          } else {
            failedXmlCount++;
            const errorMsg =
              results[0]?.error ||
              'Required company (transportadora/tomador) not found in database';
            console.log(`   ⚠️  Failed to save document - ${errorMsg}`);
          }
        } catch (error: any) {
          failedXmlCount++;
          console.error(
            `   ❌ Error processing ${attachment.name}:`,
            error.message
          );
        }
      }

      result.xmlCount = processedXmlCount;

      console.log(`\n   📊 Processing Summary:`);
      console.log(`      Total XMLs: ${xmlAttachments.length}`);
      console.log(`      Successfully processed: ${processedXmlCount}`);
      console.log(`      Failed: ${failedXmlCount}`);

      if (processedXmlCount > 0 && failedXmlCount === 0) {
        console.log(
          `   ✅ All XMLs processed successfully - Moving to Extraídos`
        );
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Extraídos');
        result.success = true;
      } else if (processedXmlCount > 0 && failedXmlCount > 0) {
        console.log(
          `   ⚠️  Partial success (${processedXmlCount}/${xmlAttachments.length}) - Moving to Não extraídos`
        );
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Não extraídos');
        result.success = false;
        result.error = `Only ${processedXmlCount} of ${xmlAttachments.length} XMLs were processed successfully`;
      } else {
        console.log(
          `   ❌ Failed to process any XMLs - Moving to Não extraídos`
        );
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Não extraídos');
        result.success = false;
        result.error = 'Failed to process all XML attachments';
      }

      console.log(
        `   ✅ Email processing completed (${processedXmlCount} XMLs extracted)`
      );
      return result;
    } catch (error: any) {
      console.error(`   ❌ Critical error processing email:`, error.message);
      console.error(`   Stack trace:`, error.stack);

      try {
        await transporteService.markAsRead(messageId);
        await transporteService.moveToFolder(messageId, 'Não extraídos');
      } catch (moveError: any) {
        console.error(
          `   ❌ Failed to move email to error folder:`,
          moveError.message
        );
      }

      result.success = false;
      result.error = error.message;
      return result;
    }
  }

  async processUnreadEmails(): Promise<ProcessedEmail[]> {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   📬 EMAIL PROCESSING CRON JOB STARTED                 ║');
    console.log('║   ' + new Date().toISOString() + '                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const results: ProcessedEmail[] = [];

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            $select: 'id,subject,from,receivedDateTime,hasAttachments,isRead',
            $filter: 'isRead eq false',
            $orderby: 'receivedDateTime DESC',
            $top: 50,
          },
        }
      );

      const unreadMessages = response.data.value;
      console.log(`📊 Found ${unreadMessages.length} unread email(s)\n`);

      if (unreadMessages.length === 0) {
        console.log('✨ No emails to process. All caught up!\n');
        return results;
      }

      const withAttachments = unreadMessages.filter(
        (msg: any) => msg.hasAttachments
      );
      const withoutAttachments = unreadMessages.filter(
        (msg: any) => !msg.hasAttachments
      );

      console.log(`📎 Emails with attachments: ${withAttachments.length}`);
      console.log(
        `📭 Emails without attachments: ${withoutAttachments.length}\n`
      );

      for (const message of unreadMessages) {
        const result = await this.processEmail(message.id);
        results.push(result);
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      const totalXmls = results.reduce((sum, r) => sum + r.xmlCount, 0);
      const archived = results.filter(
        (r) => r.success && r.xmlCount === 0
      ).length;

      console.log(
        '\n╔════════════════════════════════════════════════════════╗'
      );
      console.log('║   📊 PROCESSING SUMMARY                                ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log(
        `║   Total Emails: ${unreadMessages.length.toString().padEnd(40)} ║`
      );
      console.log(`║   Successful: ${successful.toString().padEnd(42)} ║`);
      console.log(`║   Failed: ${failed.toString().padEnd(46)} ║`);
      console.log(
        `║   Archived (No Attachments): ${archived.toString().padEnd(23)} ║`
      );
      console.log(
        `║   Total XMLs Processed: ${totalXmls.toString().padEnd(32)} ║`
      );
      console.log(
        '╚════════════════════════════════════════════════════════╝\n'
      );

      return results;
    } catch (error: any) {
      console.error('\n❌ Critical error in cron job:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default new EmailProcessorService();
