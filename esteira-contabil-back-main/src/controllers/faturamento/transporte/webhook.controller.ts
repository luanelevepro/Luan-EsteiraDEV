import { Request, Response } from 'express';
import transporteService from '@/services/faturamento/transporte/transporte.service';
import webhook_service from '@/services/faturamento/transporte/webhook.service';
import xmlUploadService from '@/services/faturamento/transporte/xmlUpload.service';

export const handleWebhookNotification = async (
  req: Request,
  res: Response
) => {
  try {
    if (req.query.validationToken) {
      return res
        .status(200)
        .type('text/plain')
        .send(req.query.validationToken as string);
    }

    const notifications = req.body.value;

    if (!notifications || notifications.length === 0) {
      return res.status(200).send('OK');
    }

    for (const notification of notifications) {
      try {
        if (!webhook_service.validateNotification(notification.clientState)) {
          console.warn('⚠️ INVALID CLIENT STATE - Ignoring notification');
          continue;
        }

        const resourceParts = notification.resource.split('/');
        const messageId = resourceParts[resourceParts.length - 1];

        const message = await transporteService.getMessageById(messageId);

        if (!message.hasAttachments) {
          await transporteService.markAsRead(messageId);
          await transporteService.moveToFolder(messageId, 'Arquivados');
          continue;
        }

        const attachments =
          await transporteService.getMessageAttachments(messageId);

        const xmlAttachments = attachments.filter(
          (att) => att.contentType === 'text/xml' || att.name.endsWith('.xml')
        );

        if (xmlAttachments.length === 0) {
          await transporteService.markAsRead(messageId);
          await transporteService.moveToFolder(messageId, 'Arquivados');
          continue;
        }

        let processedCount = 0;
        let hasErrors = false;
        const xmlFilesToProcess: Array<{ buffer: Buffer; fileName: string }> =
          [];

        for (const attachment of xmlAttachments) {
          try {
            const xmlContent =
              await transporteService.getAttachmentAsString(attachment);
            const buffer = Buffer.from(xmlContent, 'utf-8');

            xmlFilesToProcess.push({
              buffer,
              fileName: attachment.name,
            });
          } catch (error: any) {
            console.error('❌ Error collecting XML:', error.message);
            hasErrors = true;
          }
        }

        if (xmlFilesToProcess.length > 0) {
          try {
            const results =
              await xmlUploadService.processXmlFiles(xmlFilesToProcess);

            for (const result of results) {
              if (result.success) {
                processedCount++;
              } else {
                console.error(
                  `❌ Failed to process ${result.fileName}: ${result.error}`
                );
                hasErrors = true;
              }
            }
          } catch (error: any) {
            console.error('❌ Error in batch processing:', error.message);
            hasErrors = true;
          }
        }

        if (hasErrors || processedCount === 0) {
          await transporteService.markAsRead(messageId);
          await transporteService.moveToFolder(messageId, 'Não extraídos');
        } else {
          await transporteService.markAsRead(messageId);
          await transporteService.moveToFolder(messageId, 'Extraídos');
        }
      } catch (error: any) {
        console.error('❌ Error processing notification:', error.message);
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR:', error.message);
    res.status(200).send('OK');
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const notificationUrl = req.query.notificationUrl as string | undefined;

    const subscription =
      await webhook_service.createSubscription(notificationUrl);

    res.json({
      success: true,
      data: subscription,
      message: 'Webhook subscription created successfully',
    });
  } catch (error: any) {
    console.error('Controller error - createSubscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const listSubscriptions = async (req: Request, res: Response) => {
  try {
    const subscriptions = await webhook_service.listSubscriptions();

    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    });
  } catch (error: any) {
    console.error('Controller error - listSubscriptions:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const renewSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      });
    }

    const subscription =
      await webhook_service.renewSubscription(subscriptionId);

    res.json({
      success: true,
      data: subscription,
      message: 'Subscription renewed successfully',
    });
  } catch (error: any) {
    console.error('Controller error - renewSubscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const deleteSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      });
    }

    await webhook_service.deleteSubscription(subscriptionId);

    res.json({
      success: true,
      message: 'Subscription deleted successfully',
    });
  } catch (error: any) {
    console.error('Controller error - deleteSubscription:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
