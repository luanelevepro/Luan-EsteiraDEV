import axios from 'axios';
import { parseStringPromise } from 'xml2js';

import { PrismaClient, StatusFaturamento } from '@prisma/client';

const prisma = new PrismaClient();

interface GetAllDfeParams {
  id: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  type?: 'NFE' | 'CTE';
  status?: 'ERRO' | 'IMPORTADO' | 'INTEGRADO';
}

interface PaginatedResponse<T> {
  data: T[];
  error?: string;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

interface MessageOptions {
  select?: string;
  limit?: number;
  filter?: string;
  orderBy?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
}

interface GraphResponse<T> {
  value: T[];
  '@odata.context': string;
  '@odata.nextLink'?: string;
}

interface Message {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  isRead?: boolean;
  importance?: string;
}

interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

interface Attachment {
  '@odata.type': string;
  '@odata.mediaContentType': string;
  id: string;
  lastModifiedDateTime: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  contentId: string;
  contentLocation: string | null;
  contentBytes: string;
}

interface AttachmentsResponse {
  '@odata.context': string;
  value: Attachment[];
}

interface ParsedXMLData {
  type: 'NFe' | 'CTe';
  emitDate: string;
  sender: string;
  receiver: string;
  emitterDocument: string;
  receiverDocument: string;
  value: string;
  fileName: string;
  xmlContent: string;
}

interface FolderStats {
  id: string;
  displayName: string;
  totalItemCount: number;
  unreadItemCount: number;
}

interface EmailStatsResponse {
  arquivados: number;
  extraidos: number;
  naoExtraidos: number;
  inbox: number;
}

interface EmailAddress {
  name: string;
  address: string;
}

interface Recipient {
  emailAddress: EmailAddress;
}

interface Message {
  id: string;
  subject: string;
  toRecipients: Recipient[];
  ccRecipients: Recipient[];
  bccRecipients: Recipient[];
  sender: { emailAddress: EmailAddress };
  receivedDateTime: string;
}

interface GraphMessagesResponse {
  value: Message[];
  '@odata.nextLink'?: string;
}

interface EmailStatsResponse {
  arquivados: number;
  extraidos: number;
  naoExtraidos: number;
  inbox: number;
  messagesByRecipient?: {
    email: string;
    messages: Message[];
    count: number;
  };
}

interface PaginatedEmailsParams {
  id: string;
  page?: number;
  take?: number;
  folderName?: string;
}

interface EmailWithEnterprise extends Message {
  enterprise?: {
    id: string;
    ds_razao_social: string | null;
    ds_documento: string | null;
  } | null;
}

interface PaginatedEmailsResponse {
  data: EmailWithEnterprise[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
interface AssignEmailParams {
  id_enterprise: string;
  id_email: string;
}

interface MoveEmailsParams {
  messageIds: string[];
  targetFolderName: string;
}

interface MoveEmailsResponse {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: {
    messageId: string;
    success: boolean;
    error?: string;
  }[];
}

class transporteService {
  private readonly mailboxEmail = process.env.MICROSOFT_USER;

  async convertXMLToJSON(xmlContent: string): Promise<any> {
    try {
      const jsonResult = await parseStringPromise(xmlContent, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
      });
      return jsonResult;
    } catch (error: any) {
      console.error('Error converting XML to JSON:', error.message);
      throw new Error('Failed to convert XML to JSON');
    }
  }

  async getEmailStatistics(): Promise<EmailStatsResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<GraphResponse<MailFolder>>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(response.data);

      const folders = response.data.value;

      const inbox = folders.find(
        (f) => f.displayName === 'Inbox' || f.displayName === 'Caixa de Entrada'
      );

      const arquivados = folders.find((f) => f.displayName === 'Arquivados');

      const extraidos = folders.find(
        (f) => f.displayName === 'Extraídos' || f.displayName === 'extraídos'
      );

      const naoExtraidos = folders.find(
        (f) => f.displayName === 'Não extraídos'
      );

      return {
        arquivados: arquivados?.totalItemCount || 0,
        extraidos: extraidos?.totalItemCount || 0,
        naoExtraidos: naoExtraidos?.totalItemCount || 0,
        inbox: inbox?.totalItemCount || 0,
      };
    } catch (error: any) {
      console.error(
        'Error fetching email statistics:',
        error.response?.data || error.message
      );
      throw new Error('Failed to fetch email statistics');
    }
  }

  async getEmailStatisticsByEmail(id: string): Promise<EmailStatsResponse> {
    try {
      const accessToken = await this.getAccessToken();

      const foldersResponse = await axios.get<GraphResponse<MailFolder>>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const recipientEmail = await prisma.sis_profiles.findFirst({
        where: {
          id,
        },
      });

      const folders = foldersResponse.data.value;
      const inbox = folders.find(
        (f) => f.displayName === 'Inbox' || f.displayName === 'Caixa de Entrada'
      );
      const arquivados = folders.find((f) => f.displayName === 'Arquivados');
      const extraidos = folders.find(
        (f) => f.displayName === 'Extraídos' || f.displayName === 'extraídos'
      );
      const naoExtraidos = folders.find(
        (f) => f.displayName === 'Não extraídos'
      );

      const inboxCount = inbox?.id
        ? await this.countMessagesForRecipient(
            accessToken,
            inbox.id,
            recipientEmail.ds_email
          )
        : 0;

      const arquivadosCount = arquivados?.id
        ? await this.countMessagesForRecipient(
            accessToken,
            arquivados.id,
            recipientEmail.ds_email
          )
        : 0;

      const extraidosCount = extraidos?.id
        ? await this.countMessagesForRecipient(
            accessToken,
            extraidos.id,
            recipientEmail.ds_email
          )
        : 0;

      const naoExtraidosCount = naoExtraidos?.id
        ? await this.countMessagesForRecipient(
            accessToken,
            naoExtraidos.id,
            recipientEmail.ds_email
          )
        : 0;

      return {
        arquivados: arquivadosCount,
        extraidos: extraidosCount,
        naoExtraidos: naoExtraidosCount,
        inbox: inboxCount,
      };
    } catch (error: any) {
      console.error(
        'Error fetching email statistics:',
        error.response?.data || error.message
      );
      throw new Error('Failed to fetch email statistics');
    }
  }

  async getEmailsByUser(
    params: PaginatedEmailsParams
  ): Promise<PaginatedEmailsResponse> {
    const { id, page = 1, take = 10 } = params;

    try {
      const userProfile = await prisma.sis_profiles.findFirst({
        where: { id },
      });

      if (!userProfile || !userProfile.ds_email) {
        throw new Error('User profile or email not found');
      }

      const accessToken = await this.getAccessToken();
      const normalizedEmail = userProfile.ds_email.toLowerCase();

      const validPage = Math.max(1, page);
      const validTake = Math.min(Math.max(1, take), 100);

      const folders = await this.getMailFolders();

      const matchingMessages: Message[] = [];
      const batchSize = 100;
      const targetMessageCount = validPage * validTake;

      for (const folder of folders) {
        let nextLink: string | undefined =
          `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders/${folder.id}/messages`;

        while (nextLink && matchingMessages.length < targetMessageCount) {
          const response = await axios.get<GraphMessagesResponse>(nextLink, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            params: nextLink.includes('?')
              ? {}
              : {
                  $select:
                    'id,subject,toRecipients,ccRecipients,bccRecipients,sender,receivedDateTime,hasAttachments,isRead,importance',
                  $top: batchSize,
                  $orderby: 'receivedDateTime DESC',
                },
          });

          const filteredMessages = response.data.value.filter((m) => {
            const isCC = m.ccRecipients?.some(
              (r) => r.emailAddress.address.toLowerCase() === normalizedEmail
            );
            const isBCC = m.bccRecipients?.some(
              (r) => r.emailAddress.address.toLowerCase() === normalizedEmail
            );
            return isCC || isBCC;
          });

          matchingMessages.push(...filteredMessages);

          nextLink = response.data['@odata.nextLink'];

          if (matchingMessages.length >= targetMessageCount) break;
        }
      }

      const totalItems = matchingMessages.length;
      const totalPages = Math.ceil(totalItems / validTake);

      const startIndex = (validPage - 1) * validTake;
      const endIndex = startIndex + validTake;

      const paginatedData = matchingMessages.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        pagination: {
          page: validPage,
          pageSize: validTake,
          totalItems,
          totalPages,
          hasNextPage: validPage < totalPages,
          hasPreviousPage: validPage > 1,
        },
      };
    } catch (error: any) {
      console.error(
        'Error fetching emails by user:',
        error.response?.data || error.message
      );
      throw new Error('Failed to fetch emails for user');
    }
  }

  async moveEmailsBetweenFolders(
    params: MoveEmailsParams
  ): Promise<MoveEmailsResponse> {
    const { messageIds, targetFolderName } = params;

    if (!messageIds || messageIds.length === 0) {
      throw new Error('At least one message ID is required');
    }

    if (!targetFolderName || targetFolderName.trim() === '') {
      throw new Error('Target folder name is required');
    }

    try {
      const accessToken = await this.getAccessToken();

      const folders = await this.getMailFolders();
      const normalizedFolderName = targetFolderName.toLowerCase();
      const targetFolder = folders.find(
        (folder) => folder.displayName.toLowerCase() === normalizedFolderName
      );

      if (!targetFolder) {
        const availableFolders = folders.map((f) => f.displayName).join(', ');
        throw new Error(
          `Folder "${targetFolderName}" not found. Available folders: ${availableFolders}`
        );
      }

      console.log(
        `📁 Moving ${messageIds.length} email(s) to folder: "${targetFolder.displayName}" (ID: ${targetFolder.id})`
      );

      const results: MoveEmailsResponse['results'] = [];

      for (const messageId of messageIds) {
        try {
          await axios.post(
            `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages/${messageId}/move`,
            { destinationId: targetFolder.id },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          results.push({
            messageId,
            success: true,
          });

          console.log(`✅ Email ${messageId} moved successfully`);
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error?.message || error.message;

          results.push({
            messageId,
            success: false,
            error: errorMessage,
          });

          console.error(`❌ Failed to move email ${messageId}:`, errorMessage);
        }
      }

      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;

      console.log(
        `\n📊 Move operation completed: ${successful} successful, ${failed} failed`
      );

      return {
        totalProcessed: messageIds.length,
        successful,
        failed,
        results,
      };
    } catch (error: any) {
      console.error('Error moving emails between folders:', error.message);
      throw new Error(`Failed to move emails: ${error.message}`);
    }
  }

  async assignEmailToCompany(params: AssignEmailParams) {
    const { id_enterprise, id_email } = params;

    if (!id_enterprise?.trim()) {
      throw new Error('Enterprise ID is required');
    }

    if (!id_email?.trim()) {
      throw new Error('Email ID is required');
    }

    try {
      const enterprise = await prisma.sis_empresas.findFirst({
        where: { id: id_enterprise },
      });

      if (!enterprise) {
        throw new Error(`Enterprise with ID ${id_enterprise} not found`);
      }

      const accessToken = await this.getAccessToken();

      const foldersResponse = await axios.get(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const folders = foldersResponse.data.value;
      let emailFound = false;

      for (const folder of folders) {
        try {
          await axios.get(
            `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders/${folder.id}/messages/${id_email}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          emailFound = true;
          break;
        } catch (err: any) {
          if (err.response?.status !== 404) {
            console.error(
              `Graph error while checking folder ${folder.displayName}:`,
              err.message
            );
          }
        }
      }

      if (!emailFound) {
        throw new Error(`Email with ID ${id_email} not found in ANY folder`);
      }

      const existingAssignment = await prisma.sis_email_enterprise.findFirst({
        where: {
          id_enterprise,
          id_email,
        },
      });

      if (existingAssignment) {
        throw new Error('This email is already assigned to this enterprise');
      }

      const assignment = await prisma.sis_email_enterprise.create({
        data: {
          id_enterprise,
          id_email,
        },
      });

      const enterpriseData = await prisma.sis_empresas.findFirst({
        where: { id: id_enterprise },
        select: {
          id: true,
          ds_razao_social: true,
          ds_documento: true,
        },
      });

      console.log(
        `✅ Email ${id_email} assigned to enterprise ${enterprise.ds_razao_social || id_enterprise}`
      );

      return {
        ...assignment,
        sis_empresas: enterpriseData,
      };
    } catch (error: any) {
      console.error('Error assigning email to company:', error.message);
      throw error;
    }
  }

  private isRecipientInMessage(message: Message, email: string): boolean {
    const normalizedEmail = email.toLowerCase();

    const isInTo = message.toRecipients?.some(
      (r) => r.emailAddress.address.toLowerCase() === normalizedEmail
    );

    const isInCc = message.ccRecipients?.some(
      (r) => r.emailAddress.address.toLowerCase() === normalizedEmail
    );

    const isInBcc = message.bccRecipients?.some(
      (r) => r.emailAddress.address.toLowerCase() === normalizedEmail
    );

    return isInTo || isInCc || isInBcc;
  }

  private async countMessagesForRecipient(
    accessToken: string,
    folderId: string,
    recipientEmail: string
  ): Promise<number> {
    try {
      let count = 0;
      let nextLink: string | undefined =
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders/${folderId}/messages`;

      while (nextLink) {
        const response = await axios.get<GraphMessagesResponse>(nextLink, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: nextLink.includes('?')
            ? {}
            : {
                $select: 'toRecipients,ccRecipients,bccRecipients',
                $top: 100,
              },
        });

        const filteredCount = response.data.value.filter((message) => {
          return this.isRecipientInMessage(message, recipientEmail);
        }).length;

        count += filteredCount;
        nextLink = response.data['@odata.nextLink'];
      }

      return count;
    } catch (error: any) {
      console.error(
        `Error counting messages in folder ${folderId}:`,
        error.response?.data || error.message
      );
      return 0;
    }
  }

  async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post<TokenResponse>(
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
      console.error(
        'Error getting access token:',
        error.response?.data || error.message
      );
      throw new Error('Failed to get access token');
    }
  }

  async parseXMLAttachment(
    xmlContent: string,
    fileName: string
  ): Promise<ParsedXMLData | null> {
    try {
      const parsed = await parseStringPromise(xmlContent);

      if (parsed.nfeProc) {
        const nfe = parsed.nfeProc.NFe[0].infNFe[0];
        const emit = nfe.emit[0];
        const dest = nfe.dest[0];
        const total = nfe.total[0].ICMSTot[0];

        return {
          type: 'NFe',
          emitDate: nfe.ide[0].dhEmi[0].trim(),
          sender: emit.xNome[0].trim(),
          receiver: dest.xNome[0].trim(),
          emitterDocument: (emit.CNPJ?.[0] || emit.CPF?.[0] || '').trim(),
          receiverDocument: (dest.CNPJ?.[0] || dest.CPF?.[0] || '').trim(),
          value: total.vNF[0].trim(),
          fileName: fileName,
          xmlContent: xmlContent,
        };
      }

      if (parsed.cteProc) {
        const cte = parsed.cteProc.CTe[0].infCte[0];
        const emit = cte.emit[0];
        const dest = cte.dest?.[0];
        const vPrest = cte.vPrest[0];

        return {
          type: 'CTe',
          emitDate: cte.ide[0].dhEmi[0].trim(),
          sender: emit.xNome[0].trim(),
          receiver: dest?.xNome?.[0]?.trim() || 'N/A',
          emitterDocument: (emit.CNPJ?.[0] || emit.CPF?.[0] || '').trim(),
          receiverDocument: (dest?.CNPJ?.[0] || dest?.CPF?.[0] || '').trim(),
          value: vPrest.vTPrest[0].trim(),
          fileName: fileName,
          xmlContent: xmlContent,
        };
      }

      console.log('Unknown XML format:', fileName);
      return null;
    } catch (error: any) {
      console.error('Error parsing XML:', error.message);
      return null;
    }
  }

  async getMessages(options: MessageOptions = {}): Promise<ParsedXMLData[]> {
    const parsedData: ParsedXMLData[] = [];

    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<GraphResponse<Message>>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            $select:
              options.select || 'subject,from,receivedDateTime,hasAttachments',
            $top: options.limit || 25,
            $filter: options.filter,
            $orderby: options.orderBy || 'receivedDateTime DESC',
          },
        }
      );

      const hasAttachments = response.data.value.filter(
        (msg) => msg.hasAttachments
      );

      console.log(`Found ${hasAttachments.length} messages with attachments`);

      for (const email of hasAttachments) {
        try {
          console.log(`Processing message: ${email.id}`);

          const attachments = await this.getMessageAttachments(email.id);

          console.log(`Found ${attachments.length} attachments`);

          for (const attachment of attachments) {
            if (
              attachment.contentType === 'text/xml' ||
              attachment.name.endsWith('.xml')
            ) {
              console.log(`Processing XML: ${attachment.name}`);

              const xmlContent = await this.getAttachmentAsString(attachment);
              const parsed = await this.parseXMLAttachment(
                xmlContent,
                attachment.name
              );

              if (parsed) {
                parsedData.push(parsed);
                console.log(
                  `✅ Parsed: ${parsed.type} - ${parsed.sender} (${parsed.emitterDocument})`
                );
              }
            }
          }
        } catch (error: any) {
          console.error(`Error processing message ${email.id}:`, error.message);
        }
      }

      console.log(`\n📊 Total parsed documents: ${parsedData.length}`);

      return parsedData;
    } catch (error: any) {
      console.error(
        'Error fetching messages:',
        error.response?.data || error.message
      );
      throw new Error('Failed to fetch messages from Microsoft Graph');
    }
  }

  async getMessageById(messageId: string): Promise<Message> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<Message>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        'Error fetching message:',
        error.response?.data || error.message
      );
      throw new Error(`Failed to fetch message with ID: ${messageId}`);
    }
  }

  async getMailFolders(): Promise<MailFolder[]> {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.get<GraphResponse<MailFolder>>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/mailFolders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.value;
    } catch (error: any) {
      console.error(
        'Error fetching folders:',
        error.response?.data || error.message
      );
      throw new Error('Failed to fetch mail folders');
    }
  }

  async getMessageAttachments(messageId: string): Promise<Attachment[]> {
    try {
      const accessToken = await this.getAccessToken();
      const response = await axios.get<AttachmentsResponse>(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages/${messageId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.value;
    } catch (error: any) {
      console.error(
        'Error fetching attachments:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to fetch attachments for message ID: ${messageId}`
      );
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      await axios.patch(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages/${messageId}`,
        { isRead: true },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`✅ Email ${messageId} marked as read`);
    } catch (error: any) {
      console.error(
        `Error marking email as read:`,
        error.response?.data || error.message
      );
      throw new Error(`Failed to mark email as read: ${messageId}`);
    }
  }

  async moveToFolder(messageId: string, folderName: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      const folders = await this.getMailFolders();

      const normalizedFolderName = folderName.toLowerCase();

      const targetFolder = folders.find(
        (folder) => folder.displayName.toLowerCase() === normalizedFolderName
      );

      if (!targetFolder) {
        console.error(
          `Available folders:`,
          folders.map((f) => f.displayName)
        );
        throw new Error(`Folder "${folderName}" not found`);
      }

      console.log(
        `   📁 Moving to folder: "${targetFolder.displayName}" (ID: ${targetFolder.id})`
      );

      await axios.post(
        `${process.env.MICROSOFT_GRAPH_URL}/users/${this.mailboxEmail}/messages/${messageId}/move`,
        { destinationId: targetFolder.id },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(
        `   ✅ Email ${messageId} moved to folder: ${targetFolder.displayName}`
      );
    } catch (error: any) {
      console.error(
        `Error moving email to folder:`,
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to move email ${messageId} to folder: ${folderName}`
      );
    }
  }

  async decodeAttachment(attachment: Attachment): Promise<{
    name: string;
    content: Buffer;
    contentType: string;
  }> {
    try {
      const content = Buffer.from(attachment.contentBytes, 'base64');

      return {
        name: attachment.name,
        content: content,
        contentType: attachment.contentType,
      };
    } catch (error: any) {
      console.error('Error decoding attachment:', error.message);
      throw new Error(`Failed to decode attachment: ${attachment.name}`);
    }
  }

  async getAttachmentAsString(attachment: Attachment): Promise<string> {
    try {
      const decoded = await this.decodeAttachment(attachment);
      return decoded.content.toString('utf-8');
    } catch (error: any) {
      console.error('Error getting attachment as string:', error.message);
      throw new Error(`Failed to get attachment as string: ${attachment.name}`);
    }
  }

  async getAllDfe(params: any): Promise<PaginatedResponse<any>> {
    const {
      id,
      page = 1,
      pageSize = 10,
      startDate,
      endDate,
      sortBy = 'dt_created',
      sortOrder = 'desc',
      search,
      type,
      status,
      emit,
      situacao,
    } = params;
    if (!id || id.trim() === '') {
      throw new Error('ID parameter is required and cannot be empty');
    }

    const sis_empresa = await prisma.sis_empresas.findUnique({
      where: { id },
    });

    const modules = await prisma.sis_empresas_modules.findMany({
      where: { id_empresa: id },
      include: { module: true },
    });

    if (!sis_empresa) {
      throw new Error('Empresa not found');
    }

    const fis_empresa = await prisma.fis_empresas.findUnique({
      where: {
        id_sis_empresas: sis_empresa.id,
      },
    });

    if (!fis_empresa) {
      throw new Error('Empresa not found on fis_empresa table');
    }

    if (!modules || modules.length === 0) {
      return {
        data: [],
        error:
          'Empresa does not have access to FATURAMENTO module or it is not activated',
        pagination: {
          page: 1,
          pageSize: 0,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const faturamentoModule = modules.find(
      (mod) =>
        mod.module.ds_module === 'FATURAMENTO' && mod.is_activated === true
    );

    if (!faturamentoModule) {
      return {
        data: [],
        error:
          'Empresa does not have access to FATURAMENTO module or it is not activated',
        pagination: {
          page: 1,
          pageSize: 0,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 100);

    let actualStartDate = startDate ? new Date(startDate) : undefined;
    let actualEndDate = endDate ? new Date(endDate) : undefined;

    if (actualStartDate) {
      actualStartDate.setUTCHours(0, 0, 0, 0);
    }

    if (actualEndDate) {
      actualEndDate.setUTCHours(23, 59, 59, 999);
    }

    if (actualStartDate && actualEndDate && actualEndDate < actualStartDate) {
      actualEndDate = actualStartDate;
    }

    const andConditions: any[] = [];

    if (emit == true || emit == 'true') {
      andConditions.push({
        OR: [{ ds_documento_emitente: sis_empresa.ds_documento }],
      });
    } else {
      andConditions.push({
        AND: [
          {
            OR: [
              { ds_documento_transportador: sis_empresa.ds_documento },
              { ds_documento_subcontratada: sis_empresa.ds_documento },
            ],
          },
          {
            NOT: {
              ds_documento_emitente: sis_empresa.ds_documento,
            },
          },
        ],
      });
    }

    if (actualStartDate || actualEndDate) {
      const dateFilter: any = {};

      if (actualStartDate) {
        dateFilter.gte = actualStartDate;
      }

      if (actualEndDate) {
        dateFilter.lte = actualEndDate;
      }

      andConditions.push({
        dt_emissao: dateFilter,
      });
    }

    if (type) {
      const upperType = type.toUpperCase();
      const validTypes = ['CTE', 'NFE', 'NFSE'];

      if (validTypes.includes(upperType)) {
        andConditions.push({
          ds_tipo: upperType,
        });
      }
    }

    if (status) {
      let statusList: string[] = [];

      if (Array.isArray(status)) {
        statusList = status;
      } else if (typeof status === 'string') {
        statusList = status.split(',');
      }

      const statuses = statusList.map((s) => s.trim()).filter(Boolean);

      if (statuses.length > 0) {
        andConditions.push({
          ds_situacao_integracao: {
            in: statuses,
          },
        });
      }
    }

    if (situacao) {
      let situacaoList: string[] = [];

      if (Array.isArray(situacao)) {
        situacaoList = situacao;
      } else if (typeof situacao === 'string') {
        situacaoList = situacao.split(',');
      }

      const situacoes = situacaoList.map((s) => s.trim()).filter(Boolean);

      if (situacoes.length > 0) {
        andConditions.push({
          ds_status: {
            in: situacoes,
          },
        });
      }
    }

    const whereFilter = {
      AND: andConditions,
    };

    const inMemorySortFields = [
      'ds_numero',
      'ds_serie',
      'valorTotal',
      'nomeEmitente',
      'nomeDestinatario',
      'xMunIni',
      'UFIni',
      'xMunFim',
      'UFFim',
      'obs',
    ];

    const needsInMemorySort = inMemorySortFields.includes(sortBy);
    const needsSearch = search && search.trim() !== '';

    let orderByConfig: any = {};
    let allData: any[];

    if (needsInMemorySort || needsSearch) {
      orderByConfig = [{ dt_emissao: sortOrder }, { dt_created: sortOrder }];

      allData = await prisma.fis_documento_dfe.findMany({
        where: whereFilter,
        orderBy: orderByConfig,
        include: {
          fis_documento: true,
          js_nfe: true,
          js_nfse: true,
          js_cte: true,
        },
      });
    } else {
      const fetchSkip = (validPage - 1) * validPageSize;
      orderByConfig = [{ [sortBy]: sortOrder }, { dt_emissao: 'asc' }];

      allData = await prisma.fis_documento_dfe.findMany({
        where: whereFilter,
        skip: fetchSkip,
        take: validPageSize,
        orderBy: orderByConfig,
        include: {
          fis_documento: true,
          js_nfe: true,
          js_nfse: true,
          js_cte: true,
        },
      });
    }

    const cteIds = allData.map((item) => item.id_cte).filter(Boolean);
    const nfeIds = allData.map((item) => item.id_nfe).filter(Boolean);

    const [cteData, nfeData, alteracoesPendentes] = await Promise.all([
      cteIds.length > 0
        ? prisma.fis_cte.findMany({
            where: { id: { in: cteIds } },
            select: {
              id: true,
              ds_chave: true,
              ds_numero: true,
              ds_serie: true,
              ds_nome_mun_ini: true,
              ds_uf_ini: true,
              ds_nome_mun_fim: true,
              ds_uf_fim: true,
            },
          })
        : Promise.resolve([]),
      nfeIds.length > 0
        ? prisma.fis_nfe.findMany({
            where: { id: { in: nfeIds } },
            select: {
              id: true,
              ds_chave: true,
              ds_numero: true,
              ds_serie: true,
            },
          })
        : Promise.resolve([]),
      cteIds.length > 0
        ? prisma.fis_cte_subcontratacao_alter.findMany({
            where: {
              id_fis_cte: { in: cteIds },
              ds_status_alteracao: 'PENDENTE',
            },
            select: {
              id: true,
              id_fis_cte: true,
              ds_motivo: true,
              ds_razao_social_subcontratada_original: true,
              id_usuario_solicitante: true,
              sis_profiles_usuario_solicitante: {
                select: {
                  ds_name: true,
                  ds_email: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const cteMap = new Map(cteData.map((cte) => [cte.id, cte]));
    const nfeMap = new Map(nfeData.map((nfe) => [nfe.id, nfe]));
    const alteracoesMap = new Map(
      alteracoesPendentes.map((alt) => [alt.id_fis_cte, alt])
    );

    const enrichedFullData = allData.map((item) => {
      let valorTotal: number | null = null;
      let vFrete: number | null = null;
      let vCarga: number | null = null;
      let nomeEmitente = null;
      let nomeDestinatario = null;
      let xMunIni = null;
      let UFIni = null;
      let xMunFim = null;
      let UFFim = null;
      let obs = null;

      try {
        const parsedData = JSON.parse(item.ds_raw as string);

        // NFe processing
        if (parsedData.nfeProc?.NFe?.[0]?.infNFe?.[0]) {
          const infNFe = parsedData.nfeProc.NFe[0].infNFe[0];

          valorTotal = infNFe.total?.[0]?.ICMSTot?.[0]?.vNF?.[0]
            ? parseFloat(infNFe.total[0].ICMSTot[0].vNF[0])
            : null;

          // Extract vFrete for NFe
          vFrete = infNFe.total?.[0]?.ICMSTot?.[0]?.vFrete?.[0]
            ? parseFloat(infNFe.total[0].ICMSTot[0].vFrete[0])
            : null;

          // Extract vCarga (vNF) for NFe
          vCarga = valorTotal;

          nomeEmitente = infNFe.emit?.[0]?.xNome?.[0] ?? null;
          nomeDestinatario = infNFe.dest?.[0]?.xNome?.[0] ?? null;
          obs = infNFe.infAdic?.[0]?.infCpl?.[0] ?? null;
        }

        // CTe processing
        if (parsedData.cteProc?.CTe?.[0]?.infCte?.[0]) {
          const infCte = parsedData.cteProc.CTe[0].infCte[0];

          valorTotal = infCte.vPrest?.[0]?.vTPrest?.[0]
            ? parseFloat(infCte.vPrest[0].vTPrest[0])
            : valorTotal;

          // Extract vFrete (vTPrest) for CTe
          vFrete = valorTotal;

          // Extract vCarga for CTe
          vCarga = infCte.infCTeNorm?.[0]?.infCarga?.[0]?.vCarga?.[0]
            ? parseFloat(infCte.infCTeNorm[0].infCarga[0].vCarga[0])
            : null;

          nomeEmitente = infCte.emit?.[0]?.xNome?.[0] ?? nomeEmitente;
          nomeDestinatario = infCte.dest?.[0]?.xNome?.[0] ?? nomeDestinatario;

          const ide = infCte.ide?.[0];
          xMunIni = ide?.xMunIni?.[0] ?? null;
          UFIni = ide?.UFIni?.[0] ?? null;
          xMunFim = ide?.xMunFim?.[0] ?? null;
          UFFim = ide?.UFFim?.[0] ?? null;

          obs =
            infCte.compl?.[0]?.xObs?.[0] ??
            infCte.infAdic?.[0]?.infCpl?.[0] ??
            obs;
        }
      } catch (error) {
        console.error(`Error parsing ds_raw for document ${item.id}:`, error);
      }

      const cteInfo = item.id_cte ? cteMap.get(item.id_cte) : null;
      const nfeInfo = item.id_nfe ? nfeMap.get(item.id_nfe) : null;

      const dsNumero = cteInfo?.ds_numero ?? nfeInfo?.ds_numero ?? null;
      const dsSerie = cteInfo?.ds_serie ?? nfeInfo?.ds_serie ?? null;
      const dsChave = cteInfo?.ds_chave ?? nfeInfo?.ds_chave ?? null;

      return {
        ...item,
        valorTotal,
        vFrete,
        vCarga,
        nomeEmitente,
        nomeDestinatario,
        xMunIni: cteInfo?.ds_nome_mun_ini ?? xMunIni,
        UFIni: cteInfo?.ds_uf_ini ?? UFIni,
        xMunFim: cteInfo?.ds_nome_mun_fim ?? xMunFim,
        UFFim: cteInfo?.ds_uf_fim ?? UFFim,
        obs,
        ds_numero:
          dsNumero !== null && dsNumero !== '' ? String(dsNumero) : null,
        ds_serie: dsSerie !== null && dsSerie !== '' ? String(dsSerie) : null,
        ds_chave: dsChave,
      };
    });

    // Helper function for comprehensive search
    const matchesSearch = (item: any, searchTerm: string): boolean => {
      const searchUpper = searchTerm.trim().toUpperCase();
      if (!searchUpper) return true;

      // Document fields search
      const documentFields = [
        item.ds_documento_destinatario,
        item.ds_documento_emitente,
        item.ds_documento_tomador,
        item.ds_documento_remetente,
        item.ds_documento_transportador,
        item.ds_documento_subcontratada,
      ];

      // Name/Social reason fields search
      const nameFields = [
        item.nomeEmitente,
        item.nomeDestinatario,
        item.ds_razao_social_emitente,
        item.ds_razao_social_destinatario,
        item.ds_razao_social_tomador,
        item.ds_razao_social_remetente,
        item.ds_razao_social_subcontratada,
      ];

      // Location fields search
      const locationFields = [
        item.xMunIni,
        item.xMunFim,
        item.UFIni,
        item.UFFim,
      ];

      // Document identifiers search
      const identifierFields = [
        item.ds_numero,
        item.ds_serie,
        item.ds_chave,
        item.ds_tipo,
      ];

      // Check if search matches any of the fields
      const allFields = [
        ...documentFields,
        ...nameFields,
        ...locationFields,
        ...identifierFields,
        item.obs,
      ];

      return allFields.some((field) =>
        field?.toString().toUpperCase().includes(searchUpper)
      );
    };

    const filteredData = needsSearch
      ? enrichedFullData.filter((item) => matchesSearch(item, search))
      : enrichedFullData;

    let sortedData = filteredData;
    if (needsInMemorySort) {
      sortedData = [...filteredData].sort((a, b) => {
        const aValue = a[sortBy] ?? '';
        const bValue = b[sortBy] ?? '';

        const aStr = String(aValue);
        const bStr = String(bValue);

        const aNum = parseFloat(aStr);
        const bNum = parseFloat(bStr);

        let comparison = 0;
        if (!isNaN(aNum) && !isNaN(bNum)) {
          comparison = aNum - bNum;
        } else {
          comparison = aStr.localeCompare(bStr, undefined, { numeric: true });
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    const paginatedData =
      needsInMemorySort || needsSearch
        ? sortedData.slice(
            (validPage - 1) * validPageSize,
            validPage * validPageSize
          )
        : sortedData;

    const finalData = paginatedData.map((item) => {
      const { ds_raw, js_cte, js_nfe, js_nfse, ...itemWithoutRaw } = item;
      const is_subcontratada =
        item.ds_documento_subcontratada === sis_empresa.ds_documento;

      // Buscar alteração pendente para este CTe
      const alteracaoPendente = item.id_cte
        ? alteracoesMap.get(item.id_cte)
        : null;

      const alteracao_subcontratacao_pendente = alteracaoPendente
        ? {
            id_alteracao: alteracaoPendente.id,
            ds_motivo: alteracaoPendente.ds_motivo,
            ds_razao_social_subcontratada_original:
              alteracaoPendente.ds_razao_social_subcontratada_original,
            usuario_solicitante:
              alteracaoPendente.sis_profiles_usuario_solicitante
                ? {
                    id: alteracaoPendente.sis_profiles_usuario_solicitante.id,
                    ds_nome:
                      alteracaoPendente.sis_profiles_usuario_solicitante
                        .ds_nome,
                    ds_email:
                      alteracaoPendente.sis_profiles_usuario_solicitante
                        .ds_email,
                  }
                : null,
          }
        : null;

      return {
        ...itemWithoutRaw,
        is_subcontratada,
        alteracao_subcontratacao_pendente,
      };
    });

    const totalItems =
      needsInMemorySort || needsSearch
        ? sortedData.length
        : await prisma.fis_documento_dfe.count({ where: whereFilter });

    const totalPages = Math.ceil(totalItems / validPageSize);

    return {
      data: finalData,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        totalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    };
  }

  async grantEnterpriseAccess(id: string, dt_faturamento?: string) {
    if (!id) throw new Error('Um ID precisa ser especificado!');

    const enterprise = await prisma.sis_empresas.findUnique({
      where: { id },
      include: { js_access: true },
    });

    if (!enterprise) {
      throw new Error(`Empresa com o ID: ${id}, não encontrada!`);
    }

    if (!enterprise.js_access || enterprise.js_access.length === 0) {
      throw new Error('Empresa não possui registro de acesso!');
    }

    try {
      const currentModules = enterprise.js_access[0].js_modules || [];
      const hasFaturamento = currentModules.includes('FATURAMENTO');

      let updatedModules: string[];
      let action: string;

      if (dt_faturamento && hasFaturamento) {
        const faturamentoDate = new Date(dt_faturamento);

        if (isNaN(faturamentoDate.getTime())) {
          throw new Error(
            'Data de faturamento inválida. Use formato ISO (YYYY-MM-DD)'
          );
        }

        const result = await prisma.sis_access.update({
          where: { id: enterprise.js_access[0].id },
          data: {
            dt_faturamento: faturamentoDate,
          },
        });

        return {
          ...result,
          action: 'date_updated',
        };
      }

      if (hasFaturamento) {
        updatedModules = currentModules.filter(
          (module) => module !== 'FATURAMENTO'
        );
        action = 'revoked';
      } else {
        updatedModules = [...currentModules, 'FATURAMENTO'];
        action = 'granted';
      }

      const updateData: any = {
        js_modules: updatedModules,
      };

      if (dt_faturamento && action === 'granted') {
        const faturamentoDate = new Date(dt_faturamento);

        if (isNaN(faturamentoDate.getTime())) {
          throw new Error(
            'Data de faturamento inválida. Use formato ISO (YYYY-MM-DD)'
          );
        }

        updateData.dt_faturamento = faturamentoDate;
      }

      const result = await prisma.sis_access.update({
        where: { id: enterprise.js_access[0].id },
        data: updateData,
      });

      return {
        ...result,
        action,
      };
    } catch (error: any) {
      console.log(error.message);
      throw error;
    }
  }

  async setControlNumber(controlNumber: number, id: string) {
    const doc = await prisma.fis_documento_dfe.findUnique({
      where: { id },
    });

    if (!doc) {
      return null;
    } else if (doc.ds_status === StatusFaturamento.PROCESSADO) {
      const result = await prisma.fis_documento_dfe.update({
        where: { id },
        data: {
          ds_controle: controlNumber,
          ds_status: StatusFaturamento.VINCULADO,
        },
      });

      return result;
    }
  }

  async getAllCteForEnterprise(params: {
    id: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<PaginatedResponse<any>> {
    const {
      id,
      page = 1,
      pageSize = 10,
      sortBy = 'dt_created',
      sortOrder = 'desc',
      startDate,
      endDate,
      search,
    } = params;

    // Validate empresa exists
    const fisEmpresa = await prisma.fis_empresas.findFirst({
      where: {
        id_sis_empresas: id,
      },
    });

    if (!fisEmpresa) {
      throw new Error('Empresa não encontrada');
    }

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (validPage - 1) * validPageSize;

    // Process date filters
    let actualStartDate = startDate ? new Date(startDate) : undefined;
    let actualEndDate = endDate ? new Date(endDate) : undefined;

    if (actualStartDate) {
      actualStartDate.setUTCHours(0, 0, 0, 0);
    }

    if (actualEndDate) {
      actualEndDate.setUTCHours(23, 59, 59, 999);
    }

    if (actualStartDate && actualEndDate && actualEndDate < actualStartDate) {
      actualEndDate = actualStartDate;
    }

    // Define valid sortable fields from fis_cte table
    const validSortFields = [
      'id',
      'dt_created',
      'dt_updated',
      'ds_id_cte',
      'ds_chave',
      'ds_chave_nfe',
      'ds_uf',
      'cd_ibge',
      'cd_cte',
      'ds_cfop',
      'ds_icms_tag',
      'ds_natureza_operacao',
      'ds_modelo',
      'ds_serie',
      'ds_numero',
      'dt_emissao',
      'ds_tp_cte',
      'ds_modal',
      'ds_tp_serv',
      'cd_mun_env',
      'ds_nome_mun_env',
      'ds_uf_env',
      'cd_mun_ini',
      'ds_nome_mun_ini',
      'ds_uf_ini',
      'cd_mun_fim',
      'ds_nome_mun_fim',
      'ds_uf_fim',
      'ds_retira',
      'ds_ind_ie_toma',
      'ds_documento_emitente',
      'ds_razao_social_emitente',
      'ds_documento_remetente',
      'ds_razao_social_remetente',
      'ds_documento_destinatario',
      'ds_razao_social_destinatario',
      'ds_documento_tomador',
      'ds_razao_social_tomador',
      'ds_razao_social_subcontratada',
      'ds_documento_subcontratada',
      'vl_total',
      'vl_rec',
      'vl_total_trib',
      'ds_cst_tributacao',
      'vl_base_calculo_icms',
      'vl_icms',
      'cd_icms',
      'vl_porcentagem_icms',
    ];

    // Use default sortBy if provided field is invalid
    const actualSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'dt_created';

    // Build where clause with date filter
    const andConditions: any[] = [
      {
        id_fis_empresa_emitente: fisEmpresa.id,
      },
    ];

    if (actualStartDate || actualEndDate) {
      const dateFilter: any = {};

      if (actualStartDate) {
        dateFilter.gte = actualStartDate;
      }

      if (actualEndDate) {
        dateFilter.lte = actualEndDate;
      }

      andConditions.push({
        dt_emissao: dateFilter,
      });
    }

    const whereClause = {
      AND: andConditions,
    };

    // Helper function for comprehensive search
    const matchesSearch = (item: any, searchTerm: string): boolean => {
      const searchUpper = searchTerm.trim().toUpperCase();
      if (!searchUpper) return true;

      // Document fields search
      const documentFields = [
        item.ds_documento_emitente,
        item.ds_documento_remetente,
        item.ds_documento_destinatario,
        item.ds_documento_tomador,
        item.ds_documento_subcontratada,
      ];

      // Name/Social reason fields search
      const nameFields = [
        item.ds_razao_social_emitente,
        item.ds_razao_social_remetente,
        item.ds_razao_social_destinatario,
        item.ds_razao_social_tomador,
        item.ds_razao_social_subcontratada,
      ];

      // Location fields search
      const locationFields = [
        item.ds_nome_mun_ini,
        item.ds_nome_mun_fim,
        item.ds_nome_mun_env,
        item.ds_uf_ini,
        item.ds_uf_fim,
        item.ds_uf_env,
        item.ds_uf,
      ];

      // Document identifiers search
      const identifierFields = [
        item.ds_numero,
        item.ds_serie,
        item.ds_chave,
        item.ds_chave_nfe,
        item.ds_modelo,
      ];

      // JSON fields (array or stringified JSON) search
      const extractJsonValues = (value: any): string[] => {
        if (!value) return [];

        if (Array.isArray(value)) {
          return value.map((v) => v?.toString?.() ?? '');
        }

        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              return parsed.map((v) => v?.toString?.() ?? '');
            }
          } catch (err) {
            // Not a JSON string; fall through to default handling
          }

          return [value];
        }

        return [value.toString()];
      };

      const chavesNfeValues = extractJsonValues(item.js_chaves_nfe);
      const documentosAnterioresValues = extractJsonValues(
        item.js_documentos_anteriores
      );

      const jsonFields = [...chavesNfeValues, ...documentosAnterioresValues];

      // Check if search matches any of the fields
      const allFields = [
        ...documentFields,
        ...nameFields,
        ...locationFields,
        ...identifierFields,
        ...jsonFields,
      ];

      const matched = allFields.some((field) =>
        field?.toString().toUpperCase().includes(searchUpper)
      );
      return matched;
    };

    const needsSearch = search && search.trim() !== '';

    // If search is needed, fetch all data and filter in memory
    const [totalItems, rawResults] = await Promise.all([
      prisma.fis_cte.count({
        where: whereClause,
      }),
      prisma.fis_cte.findMany({
        where: whereClause,
        ...(needsSearch ? {} : { skip, take: validPageSize }),
        orderBy: needsSearch
          ? [{ dt_emissao: sortOrder }, { dt_created: sortOrder }]
          : { [actualSortBy]: sortOrder },
      }),
    ]);

    // Apply search filter if needed
    let filteredResults = rawResults;
    if (needsSearch) {
      filteredResults = rawResults.filter((item) =>
        matchesSearch(item, search)
      );
    }

    // Apply pagination for search results
    const finalResults = needsSearch
      ? filteredResults.slice(skip, skip + validPageSize)
      : filteredResults;

    const displayTotalItems = needsSearch ? filteredResults.length : totalItems;
    const totalPages = Math.ceil(displayTotalItems / validPageSize);

    return {
      data: finalResults.map(({ ds_raw, ...cte }: any) => cte),
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        totalItems: displayTotalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
    };
  }
}

export default new transporteService();
