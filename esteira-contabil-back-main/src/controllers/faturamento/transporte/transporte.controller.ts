import { Request, Response } from 'express';
import multer, { File } from 'multer';
import email_processorService from '@/services/faturamento/transporte/email_processor.service';
import transporteService from '@/services/faturamento/transporte/transporte.service';
import xmlUploadService from '@/services/faturamento/transporte/xmlUpload.service';
import tecnospeedService from '@/services/faturamento/transporte/tecnospeed.service';

interface MulterRequest extends Request {
  files?: File[];
}

export const enviarCTe = async (req: Request, res: Response | any) => {
  try {
    const { id_empresa, nfe_ids, dados_emitente, dados_adicionais } = req.body;

    if (
      !id_empresa ||
      typeof id_empresa !== 'string' ||
      id_empresa.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        error: 'id_empresa is required and must be a non-empty string',
      });
    }

    if (!nfe_ids || !Array.isArray(nfe_ids) || nfe_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'nfe_ids must be a non-empty array of NF-e IDs',
      });
    }

    const invalidIds = nfe_ids.filter(
      (id) => typeof id !== 'string' || id.trim() === ''
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All NF-e IDs must be non-empty strings',
        invalidIds,
      });
    }

    if (nfe_ids.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Cannot process more than 50 NF-es in a single CT-e',
      });
    }

    if (dados_emitente) {
      if (dados_emitente.CNPJ && !/^\d{14}$/.test(dados_emitente.CNPJ)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CNPJ format. Must be 14 digits without formatting',
        });
      }
    }

    if (dados_adicionais) {
      if (dados_adicionais.cfop) {
        dados_adicionais.cfop = dados_adicionais.cfop.replace(/\D/g, '');

        if (!/^\d{4}$/.test(dados_adicionais.cfop)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid CFOP format. Must be 4 digits (e.g., 5351)',
          });
        }
      }

      if (dados_adicionais.valorFrete) {
        dados_adicionais.valorFrete = dados_adicionais.valorFrete
          .replace(/[R$\s]/g, '')
          .replace(',', '.');

        if (isNaN(parseFloat(dados_adicionais.valorFrete))) {
          return res.status(400).json({
            success: false,
            error: 'Invalid valorFrete format',
          });
        }
      }

      if (dados_adicionais.serie && isNaN(parseInt(dados_adicionais.serie))) {
        return res.status(400).json({
          success: false,
          error: 'Serie must be a valid number',
        });
      }

      if (dados_adicionais.dPrev) {
        const previsaoDate = new Date(dados_adicionais.dPrev);
        if (isNaN(previsaoDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid dPrev format. Use ISO date format (YYYY-MM-DD)',
          });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (previsaoDate < today) {
          return res.status(400).json({
            success: false,
            error: 'dPrev cannot be in the past',
          });
        }
      }

      if (dados_adicionais.RNTRC && !/^\d{8}$/.test(dados_adicionais.RNTRC)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid RNTRC format. Must be 8 digits',
        });
      }
    }

    console.log(`📦 Request to generate CT-e for ${nfe_ids.length} NF-e(s)`);
    console.log(`🏢 Enterprise ID: ${id_empresa}`);

    const result = await tecnospeedService.generateAndSendCTe({
      id_empresa,
      nfe_ids,
      dados_adicionais,
    });

    console.log(result);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          cte_numero: result.cte_numero,
          protocolo: result.protocolo,
          xml_retorno: result.xml_retorno,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Controller error - enviarCTe:', error.message);

    let statusCode = 500;

    if (
      error.message.includes('not found') ||
      error.message.includes('não encontrada')
    ) {
      statusCode = 404;
    } else if (
      error.message.includes('inválid') ||
      error.message.includes('required') ||
      error.message.includes('Pelo menos uma NF-e')
    ) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export const consultarCTe = async (req: Request, res: Response | any) => {
  try {
    const { cnpj, numero } = req.query;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CNPJ is required',
      });
    }

    if (!numero || typeof numero !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Numero is required',
      });
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ format. Must be 14 digits without formatting',
      });
    }

    console.log(`🔍 Consulting CT-e: CNPJ ${cnpj}, Number ${numero}`);

    const result = await tecnospeedService.consultarCTe(cnpj, numero);

    return res.status(200).json({
      success: true,
      message: 'CT-e consulted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - consultarCTe:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const cancelarCTe = async (req: Request, res: Response | any) => {
  try {
    const { cnpj, chave, protocolo, justificativa } = req.body;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CNPJ is required',
      });
    }

    if (!chave || typeof chave !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Chave is required',
      });
    }

    if (!protocolo || typeof protocolo !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Protocolo is required',
      });
    }

    if (!justificativa || typeof justificativa !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Justificativa is required',
      });
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ format. Must be 14 digits without formatting',
      });
    }

    if (!/^\d{44}$/.test(chave)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chave format. Must be 44 digits',
      });
    }

    if (justificativa.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Justificativa must have at least 15 characters',
      });
    }

    console.log(`❌ Canceling CT-e: Chave ${chave}`);

    const result = await tecnospeedService.cancelarCTe(
      cnpj,
      chave,
      protocolo,
      justificativa
    );

    return res.status(200).json({
      success: true,
      message: 'CT-e canceled successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - cancelarCTe:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getEmailStatistics = async (req: Request, res: Response | any) => {
  try {
    const stats = await transporteService.getEmailStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Controller error - getEmailStatistics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getEmailStatisticsByEmail = async (
  req: Request,
  res: Response | any
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token is required',
      });
    }

    const token = authHeader.substring(7);

    const [userId, sessionId] = token.split(' ');

    console.log(userId, 'USER ID');

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization token',
      });
    }

    const stats = await transporteService.getEmailStatisticsByEmail(userId);

    res.json({
      success: true,
      data: {
        statistics: stats,
      },
    });
  } catch (error: any) {
    console.error('Controller error - getEmailStatistics:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getEmailsByUser = async (req: Request, res: Response | any) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token is required',
      });
    }

    const token = authHeader.substring(7);
    const [userId, sessionId] = token.split(' ');

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authorization token',
      });
    }

    const { page, take, folderName } = req.query;

    const params = {
      id: userId,
      page: page ? parseInt(page as string) : 1,
      take: take ? parseInt(take as string) : 10,
      folderName: folderName ? (folderName as string) : undefined,
    };

    if (params.page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be greater than or equal to 1',
      });
    }

    if (params.take < 1 || params.take > 100) {
      return res.status(400).json({
        success: false,
        error: 'Take must be between 1 and 100',
      });
    }

    const result = await transporteService.getEmailsByUser(params);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Controller error - getEmailsByUser:', error.message);

    const statusCode = error.message.includes('not found')
      ? 404
      : error.message.includes('Folder')
        ? 400
        : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

export const moveEmailsBetweenFolders = async (
  req: Request,
  res: Response | any
) => {
  try {
    const { messageIds, targetFolderName } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messageIds must be a non-empty array of message IDs',
      });
    }

    const invalidIds = messageIds.filter(
      (id) => typeof id !== 'string' || id.trim() === ''
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All message IDs must be non-empty strings',
      });
    }

    if (
      !targetFolderName ||
      typeof targetFolderName !== 'string' ||
      targetFolderName.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        error: 'targetFolderName must be a non-empty string',
      });
    }

    if (messageIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Cannot move more than 100 emails at once',
      });
    }

    console.log(
      `🔄 Request to move ${messageIds.length} email(s) to folder: ${targetFolderName}`
    );

    const result = await transporteService.moveEmailsBetweenFolders({
      messageIds,
      targetFolderName,
    });

    const statusCode =
      result.failed === 0 ? 200 : result.successful > 0 ? 207 : 500;

    res.status(statusCode).json({
      success: result.failed === 0,
      message:
        result.failed === 0
          ? `Successfully moved all ${result.successful} email(s)`
          : `Moved ${result.successful} email(s), ${result.failed} failed`,
      data: {
        totalProcessed: result.totalProcessed,
        successful: result.successful,
        failed: result.failed,
        results: result.results,
      },
    });
  } catch (error: any) {
    console.error(
      'Controller error - moveEmailsBetweenFolders:',
      error.message
    );

    const statusCode = error.message.includes('not found')
      ? 404
      : error.message.includes('required')
        ? 400
        : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

export const assignEmailToCompany = async (
  req: Request,
  res: Response | any
) => {
  try {
    const { id_enterprise, id_email } = req.body;

    if (
      !id_enterprise ||
      typeof id_enterprise !== 'string' ||
      id_enterprise.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        error: 'id_enterprise is required and must be a non-empty string',
      });
    }

    if (!id_email || typeof id_email !== 'string' || id_email.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'id_email is required and must be a non-empty string',
      });
    }

    console.log(
      `📧 Assigning email ${id_email} to enterprise ${id_enterprise}`
    );

    const result = await transporteService.assignEmailToCompany({
      id_enterprise,
      id_email,
    });

    res.status(201).json({
      success: true,
      message: 'Email successfully assigned to enterprise',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - assignEmailToCompany:', error.message);

    let statusCode = 500;

    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (
      error.message.includes('required') ||
      error.message.includes('already assigned')
    ) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMessages = async (req: any, res: any) => {
  try {
    const { limit, select, unread } = req.query;
    const options = {
      limit: limit ? parseInt(limit) : 25,
      select: select || 'subject,from,receivedDateTime,hasAttachments',
      filter: undefined as string | undefined,
    };

    if (unread === 'true') {
      options.filter = 'isRead eq false';
    }

    const data = await transporteService.getMessages(options);

    res.json({
      success: true,
      data: data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('Controller error - getMessages:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const triggerEmailProcessing = async (
  req: Request,
  res: Response | any
) => {
  try {
    console.log('🔄 Manual email processing triggered');

    const results = await email_processorService.processUnreadEmails();

    res.json({
      success: true,
      message: 'Email processing completed',
      data: {
        totalProcessed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        totalXmls: results.reduce((sum, r) => sum + r.xmlCount, 0),
        details: results,
      },
    });
  } catch (error: any) {
    console.error('Error in manual trigger:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMessageById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
      });
    }

    const message = await transporteService.getMessageById(id);

    res.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Controller error - getMessageById:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMailFolders = async (req: any, res: any) => {
  try {
    const folders = await transporteService.getMailFolders();

    res.json({
      success: true,
      data: folders,
      count: folders.length,
    });
  } catch (error: any) {
    console.error('Controller error - getMailFolders:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getMessageAttachments = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Message ID is required',
      });
    }

    const attachments = await transporteService.getMessageAttachments(id);

    if (attachments.length > 0) {
      const firstAttachment = attachments[0];
      const decoded = await transporteService.decodeAttachment(firstAttachment);

      const xmlContent =
        await transporteService.getAttachmentAsString(firstAttachment);

      console.log(
        'Decoded XML (first 500 chars):',
        xmlContent.substring(0, 500)
      );

      res.json({
        success: true,
        data: {
          attachments: attachments.map((att) => ({
            id: att.id,
            name: att.name,
            contentType: att.contentType,
            size: att.size,
          })),
          decodedExample: {
            name: decoded.name,
            contentType: decoded.contentType,
            size: decoded.content.length,
            previewXML: xmlContent,
          },
        },
        count: attachments.length,
      });
    } else {
      res.json({
        success: true,
        data: { attachments: [] },
        count: 0,
      });
    }
  } catch (error: any) {
    console.error('Controller error - getMessageAttachments:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const getDfe = async (req: Request, res: Response) => {
  try {
    const {
      page,
      pageSize,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      id,
      search,
      type,
      status,
      emit,
      situacao,
    } = req.query;

    const params = {
      id: id ? (id as string) : null,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10,
      startDate: startDate ? (startDate as string) : undefined,
      endDate: endDate ? (endDate as string) : undefined,
      sortBy:
        (sortBy as 'dt_created' | 'dt_updated' | 'dt_emissao') || 'dt_created',
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      search: search ? (search as string) : undefined,
      type: type ? (type as string) : undefined,
      status: status ? status : undefined,
      emit: emit ? emit : false,
      situacao: situacao ? situacao : undefined,
    };

    if (params.page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be greater than or equal to 1',
      });
    }

    if (params.pageSize < 1 || params.pageSize > 100) {
      return res.status(400).json({
        success: false,
        error: 'Page size must be between 1 and 100',
      });
    }

    if (params.startDate && isNaN(Date.parse(params.startDate))) {
      return res.status(400).json({
        success: false,
        error:
          'Invalid startDate format. Use ISO date format (e.g., 2024-01-01)',
      });
    }

    if (params.endDate && isNaN(Date.parse(params.endDate))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endDate format. Use ISO date format (e.g., 2024-12-31)',
      });
    }

    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      if (start > end) {
        return res.status(400).json({
          success: false,
          error: 'startDate must be before or equal to endDate',
        });
      }
    }

    const result = await transporteService.getAllDfe(params);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      error: result.error,
    });
  } catch (error: any) {
    console.error('Controller error - getDfe:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const grantEnterpriseAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dt_faturamento } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Enterprise ID is required',
      });
    }

    const result = await transporteService.grantEnterpriseAccess(
      id,
      dt_faturamento
    );

    let message: string;
    switch (result.action) {
      case 'granted':
        message = 'Acesso ao módulo de faturamento liberado com sucesso';
        break;
      case 'revoked':
        message = 'Acesso ao módulo de faturamento revogado com sucesso';
        break;
      case 'date_updated':
        message = 'Data de faturamento atualizada com sucesso';
        break;
      default:
        message = 'Operação realizada com sucesso';
    }

    res.json({
      success: true,
      message,
      data: {
        access: result,
        action: result.action,
      },
    });
  } catch (error: any) {
    console.error('Controller error - grantEnterpriseAccess:', error.message);

    const statusCode = error.message.includes('não encontrada')
      ? 404
      : error.message.includes('inválida')
        ? 400
        : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

export const uploadXmlFiles = async (req: MulterRequest, res: Response) => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'No XML files uploaded',
      });
    }

    const files = (req.files as File[]).map((file) => ({
      buffer: file.buffer,
      fileName: file.originalname,
    }));

    const invalidFiles = files.filter(
      (file) => !file.fileName.toLowerCase().endsWith('.xml')
    );

    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All files must be XML files',
        invalidFiles: invalidFiles.map((f) => f.fileName),
      });
    }

    console.log(`📤 Received ${files.length} XML file(s) for processing`);

    const results = await xmlUploadService.processXmlFiles(files);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;
    const nfeCount = results.filter(
      (r) => r.type === 'NFE' && r.success
    ).length;
    const cteCount = results.filter(
      (r) => r.type === 'CTE' && r.success
    ).length;

    return res.status(200).json({
      success: true,
      message: `Processed ${results.length} file(s): ${successCount} successful, ${failureCount} failed`,
      data: {
        totalFiles: results.length,
        successful: successCount,
        failed: failureCount,
        nfeSaved: nfeCount,
        cteSaved: cteCount,
        results: results,
      },
    });
  } catch (error: any) {
    console.error('Controller error - uploadXmlFiles:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const enviarMDFe = async (req: Request, res: Response | any) => {
  try {
    const { id_empresa, cte_ids, nfe_ids, dados_adicionais } = req.body;

    if (
      !id_empresa ||
      typeof id_empresa !== 'string' ||
      id_empresa.trim() === ''
    ) {
      return res.status(400).json({
        success: false,
        error: 'id_empresa is required and must be a non-empty string',
      });
    }

    const hasCtes = Array.isArray(cte_ids) && cte_ids.length > 0;
    const hasNfes = Array.isArray(nfe_ids) && nfe_ids.length > 0;

    if (!hasCtes && !hasNfes) {
      return res.status(400).json({
        success: false,
        error: 'At least one CT-e or NF-e must be provided',
      });
    }

    if (hasCtes) {
      const invalidCteIds = cte_ids.filter(
        (id) => typeof id !== 'string' || id.trim() === ''
      );

      if (invalidCteIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All CT-e IDs must be non-empty strings',
          invalidIds: invalidCteIds,
        });
      }

      if (cte_ids.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Cannot process more than 100 CT-es in a single MDF-e',
        });
      }
    }

    if (hasNfes) {
      const invalidNfeIds = nfe_ids.filter(
        (id) => typeof id !== 'string' || id.trim() === ''
      );

      if (invalidNfeIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All NF-e IDs must be non-empty strings',
          invalidIds: invalidNfeIds,
        });
      }

      if (nfe_ids.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Cannot process more than 100 NF-es in a single MDF-e',
        });
      }
    }

    if (!dados_adicionais || typeof dados_adicionais !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'dados_adicionais is required and must be an object',
      });
    }

    if (!hasCtes) {
      if (!dados_adicionais.ufIni || !dados_adicionais.ufFim) {
        return res.status(400).json({
          success: false,
          error: 'ufIni and ufFim are required when no CT-es are provided',
        });
      }

      if (
        !dados_adicionais.municipioCarrega ||
        !dados_adicionais.municipioDescarga
      ) {
        return res.status(400).json({
          success: false,
          error:
            'municipioCarrega and municipioDescarga are required when no CT-es are provided',
        });
      }
    }

    if (dados_adicionais.ufIni && !/^[A-Z]{2}$/.test(dados_adicionais.ufIni)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ufIni format. Must be a 2-letter state code (e.g., SP)',
      });
    }

    if (dados_adicionais.ufFim && !/^[A-Z]{2}$/.test(dados_adicionais.ufFim)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ufFim format. Must be a 2-letter state code (e.g., RJ)',
      });
    }

    if (
      dados_adicionais.municipioDescarga?.cMun &&
      !/^\d{7}$/.test(dados_adicionais.municipioDescarga.cMun)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid municipioDescarga.cMun format. Must be 7 digits',
      });
    }

    if (
      dados_adicionais.municipioCarrega?.cMun &&
      !/^\d{7}$/.test(dados_adicionais.municipioCarrega.cMun)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid municipioCarrega.cMun format. Must be 7 digits',
      });
    }

    if (
      !dados_adicionais.veiculo ||
      typeof dados_adicionais.veiculo !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        error: 'dados_adicionais.veiculo is required',
      });
    }

    const veiculoRequired = ['tara', 'capKG', 'tpRod', 'tpCar'];
    if (!hasNfes) {
      veiculoRequired.push('placa', 'uf');
    }

    const missingVeiculoFields = veiculoRequired.filter(
      (field) => !dados_adicionais.veiculo[field]
    );

    if (missingVeiculoFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required veiculo fields: ${missingVeiculoFields.join(', ')}`,
      });
    }

    if (
      dados_adicionais.veiculo.placa &&
      !/^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z]\d{2}$/.test(
        dados_adicionais.veiculo.placa.replace(/[^A-Z0-9]/g, '')
      )
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vehicle plate format (e.g., ABC1234 or ABC1D23)',
      });
    }

    if (
      dados_adicionais.veiculo.uf &&
      !/^[A-Z]{2}$/.test(dados_adicionais.veiculo.uf)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid veiculo.uf format. Must be a 2-letter state code',
      });
    }

    if (
      !dados_adicionais.condutor ||
      typeof dados_adicionais.condutor !== 'object'
    ) {
      return res.status(400).json({
        success: false,
        error: 'dados_adicionais.condutor is required',
      });
    }

    if (!dados_adicionais.condutor.nome || !dados_adicionais.condutor.cpf) {
      return res.status(400).json({
        success: false,
        error: 'condutor must contain nome and cpf',
      });
    }

    const cpfLimpo = dados_adicionais.condutor.cpf.replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpfLimpo)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid condutor.cpf format. Must be 11 digits',
      });
    }

    if (dados_adicionais.seguro) {
      if (!dados_adicionais.seguro.respSeg) {
        return res.status(400).json({
          success: false,
          error: 'seguro.respSeg is required when seguro is provided',
        });
      }

      if (!/^[0-9]$/.test(dados_adicionais.seguro.respSeg)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid seguro.respSeg format. Must be a single digit (0-9)',
        });
      }

      if (
        dados_adicionais.seguro.cnpjSeguradora &&
        !/^\d{14}$/.test(
          dados_adicionais.seguro.cnpjSeguradora.replace(/\D/g, '')
        )
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid seguro.cnpjSeguradora format. Must be 14 digits',
        });
      }

      if (
        dados_adicionais.seguro.nAver &&
        !Array.isArray(dados_adicionais.seguro.nAver)
      ) {
        return res.status(400).json({
          success: false,
          error: 'seguro.nAver must be an array when provided',
        });
      }
    }

    if (dados_adicionais.contratantes) {
      if (!Array.isArray(dados_adicionais.contratantes)) {
        return res.status(400).json({
          success: false,
          error: 'contratantes must be an array when provided',
        });
      }

      const invalidCnpjs = dados_adicionais.contratantes.filter(
        (cnpj: string) => !/^\d{14}$/.test(cnpj.replace(/\D/g, ''))
      );

      if (invalidCnpjs.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'All contratantes CNPJs must be 14 digits',
          invalidCnpjs,
        });
      }
    }

    if (dados_adicionais.serie && isNaN(parseInt(dados_adicionais.serie))) {
      return res.status(400).json({
        success: false,
        error: 'serie must be a valid number when provided',
      });
    }

    console.log(`📦 Request to generate MDF-e`);
    console.log(`🏢 Enterprise ID: ${id_empresa}`);
    console.log(
      `📄 CT-es: ${cte_ids?.length || 0}, NF-es: ${nfe_ids?.length || 0}`
    );
    console.log(
      `🚛 Route: ${dados_adicionais.ufIni} → ${dados_adicionais.ufFim}`
    );

    const result = await tecnospeedService.generateAndSendMDFe({
      id_empresa,
      cte_ids: cte_ids || [],
      nfe_ids: nfe_ids || [],
      dados_adicionais,
    });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          mdfe_numero: result.mdfe_numero,
          protocolo: result.protocolo,
          chave: result.chave,
          xml_retorno: result.xml_retorno,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Controller error - enviarMDFe:', error.message);

    let statusCode = 500;

    if (
      error.message.includes('not found') ||
      error.message.includes('não encontrada')
    ) {
      statusCode = 404;
    } else if (
      error.message.includes('invalid') ||
      error.message.includes('inválido') ||
      error.message.includes('required') ||
      error.message.includes('Pelo menos um')
    ) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

export const consultarMDFe = async (req: Request, res: Response | any) => {
  try {
    const { cnpj, numero } = req.query;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CNPJ is required',
      });
    }

    if (!numero || typeof numero !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Numero is required',
      });
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ format. Must be 14 digits without formatting',
      });
    }

    console.log(`🔍 Consulting MDF-e: CNPJ ${cnpj}, Number ${numero}`);

    const result = await tecnospeedService.consultarMDFe(cnpj, numero);

    return res.status(200).json({
      success: true,
      message: 'MDF-e consulted successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - consultarMDFe:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const encerrarMDFe = async (req: Request, res: Response | any) => {
  try {
    const { cnpj, chave, protocolo, cUF, cMun } = req.body;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CNPJ is required',
      });
    }

    if (!chave || typeof chave !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Chave is required',
      });
    }

    if (!protocolo || typeof protocolo !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Protocolo is required',
      });
    }

    if (!cUF || typeof cUF !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'cUF is required',
      });
    }

    if (!cMun || typeof cMun !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'cMun is required',
      });
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ format. Must be 14 digits without formatting',
      });
    }

    if (!/^\d{44}$/.test(chave)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chave format. Must be 44 digits',
      });
    }

    if (!/^\d{2}$/.test(cUF)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cUF format. Must be 2 digits',
      });
    }

    if (!/^\d{7}$/.test(cMun)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cMun format. Must be 7 digits',
      });
    }

    console.log(`🏁 Closing MDF-e: Chave ${chave}`);

    const result = await tecnospeedService.encerrarMDFe(
      cnpj,
      chave,
      protocolo,
      cUF,
      cMun
    );

    return res.status(200).json({
      success: true,
      message: 'MDF-e closed successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - encerrarMDFe:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const cancelarMDFe = async (req: Request, res: Response | any) => {
  try {
    const { cnpj, chave, protocolo, justificativa } = req.body;

    if (!cnpj || typeof cnpj !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CNPJ is required',
      });
    }

    if (!chave || typeof chave !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Chave is required',
      });
    }

    if (!protocolo || typeof protocolo !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Protocolo is required',
      });
    }

    if (!justificativa || typeof justificativa !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Justificativa is required',
      });
    }

    if (!/^\d{14}$/.test(cnpj)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CNPJ format. Must be 14 digits without formatting',
      });
    }

    if (!/^\d{44}$/.test(chave)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chave format. Must be 44 digits',
      });
    }

    if (justificativa.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: 'Justificativa must have at least 15 characters',
      });
    }

    console.log(`❌ Canceling MDF-e: Chave ${chave}`);

    const result = await tecnospeedService.cancelarMDFe(
      cnpj,
      chave,
      protocolo,
      justificativa
    );

    return res.status(200).json({
      success: true,
      message: 'MDF-e canceled successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - cancelarMDFe:', error.message);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const setControlNumber = async (req: Request, res: Response | any) => {
  try {
    const { id } = req.params;
    const { controlNumber } = req.body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'ID parameter is required',
      });
    }

    if (
      controlNumber === undefined ||
      controlNumber === null ||
      typeof controlNumber !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        error: 'controlNumber is required and must be a number',
      });
    }

    console.log(`🔢 Setting control number ${controlNumber} for DFe ${id}`);

    const result = await transporteService.setControlNumber(controlNumber, id);

    return res.status(200).json({
      success: true,
      message: 'Control number set successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Controller error - setControlNumber:', error.message);

    let statusCode = 500;

    if (
      error.message.includes('not found') ||
      error.message.includes('não encontrada')
    ) {
      statusCode = 404;
    } else if (
      error.message.includes('invalid') ||
      error.message.includes('required')
    ) {
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
    });
  }
};

export const getAllCteForEnterprise = async (
  req: Request,
  res: Response | any
) => {
  try {
    const { id } = req.params;
    const { page, pageSize, sortBy, sortOrder, startDate, endDate, search } =
      req.query;

    const normalizeQueryString = (value: unknown): string | undefined => {
      if (typeof value === 'string') return value;
      if (Array.isArray(value)) {
        const first = value[0];
        return typeof first === 'string' ? first : undefined;
      }
      return undefined;
    };

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Enterprise ID is required',
      });
    }

    console.log(`📦 Fetching all CTe for enterprise ${id} with pagination`);

    const result = await transporteService.getAllCteForEnterprise({
      id,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 10,
      sortBy: sortBy ? (sortBy as string) : 'id',
      sortOrder: sortOrder ? (sortOrder as 'asc' | 'desc') : 'desc',
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: normalizeQueryString(search),
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Controller error - getAllCteForEnterprise:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
