import { Request, Response } from 'express';
import multer, { File } from 'multer';
import fs from 'fs';
import path from 'path';
import { ImportarXmlNfseService } from '@/services/fiscal/onvio/nfse-parser.service';
import {
  importarNfeXml,
  importarCteXml,
  importarNfceXml,
  importarXmls,
} from '@/services/fiscal/importar-xml.service';

// Cria o diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do multer para armazenar arquivos XML
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Filtro para aceitar apenas arquivos XML
const fileFilter = (
  req: Request,
  file: File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml') {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos XML são permitidos'));
  }
};

// Configuração do multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Middleware para processar o upload do arquivo XML
export const handleXmlUpload = upload.single('file');
// Middleware para aceitar múltiplos arquivos XML no campo `files`
export const handleXmlUploads = upload.array('files');

// Interface para estender o tipo Request do Express
export interface RequestWithFile extends Request {
  file?: File;
  files?: { [fieldname: string]: File[] } | File[];
}

export class ImportarXmlController {
  private importarXmlService: ImportarXmlNfseService;

  constructor() {
    this.importarXmlService = new ImportarXmlNfseService();
  }

  async importarXml(req: RequestWithFile, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'Nenhum arquivo XML foi enviado',
          message: 'Por favor, envie um arquivo XML válido',
        });
      }

      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      if (!empresaId) {
        return res.status(400).json({
          error: 'ID da empresa não fornecido',
          message: 'O ID da empresa é obrigatório para importar o XML',
        });
      }

      try {
        const savedNfse = await this.importarXmlService.importarXml(
          req.file.path,
          empresaId,
          false,
          usuarioId
        );

        // Remove o arquivo após o processamento
        fs.unlinkSync(req.file.path);

        return res.status(200).json({
          message: 'XML importado com sucesso',
          data: savedNfse,
        });
      } catch (error) {
        // Remove o arquivo em caso de erro
        if (req.file?.path) {
          fs.unlinkSync(req.file.path);
        }

        // Verificar se é um erro de nota fiscal duplicada
        if (
          error.message &&
          error.message.includes('Já existe uma nota fiscal com número')
        ) {
          return res.status(400).json({
            error: 'Nota fiscal duplicada',
            message: error.message,
            code: 'DUPLICATE_ENTRY',
          });
        }

        return res.status(500).json({
          error: error.message || 'Ocorreu um erro ao processar o arquivo XML',
        });
      }
    } catch (error) {
      // Remove o arquivo em caso de erro
      if (req.file?.path) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        error: 'Erro ao processar o arquivo XML',
        message:
          error.message ||
          'Ocorreu um erro inesperado ao processar o arquivo XML',
      });
    }
  }
  async importarNfeXml(req: RequestWithFile, res: Response) {
    try {
      let filesArray: File[] = [];
      if (Array.isArray(req.files)) {
        filesArray = req.files as File[];
      } else if (req.file) {
        filesArray = [req.file];
      } else if (req.files && typeof req.files === 'object') {
        const keys = Object.keys(req.files as any);
        if (keys.length > 0) {
          filesArray = (req.files as any)[keys[0]] as File[];
        }
      }

      // NOVO: campo opcional competencia
      const competencia = req.body?.competencia || undefined;

      if (!filesArray || filesArray.length === 0) {
        return res.status(400).json({
          error: 'Nenhum arquivo XML foi enviado',
          message: 'Por favor, envie ao menos um arquivo XML válido',
        });
      }

      // Passe a competencia para o serviço se desejar
      const results = await importarNfeXml(filesArray /*, competencia */);

      return res.status(200).json({
        message: 'Processamento de arquivos finalizado',
        competencia,
        results,
      });
    } catch (error: any) {
      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (Array.isArray(req.files)) {
          for (const f of req.files as File[]) {
            if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
        }
      } catch (e) {}

      return res.status(500).json({
        error: 'Erro ao processar os arquivos XML',
        message:
          error?.message ||
          'Ocorreu um erro inesperado ao processar os arquivos XML',
      });
    }
  }

  async importarCteXml(req: RequestWithFile, res: Response) {
    try {
      let filesArray: File[] = [];
      if (Array.isArray(req.files)) {
        filesArray = req.files as File[];
      } else if (req.file) {
        filesArray = [req.file];
      } else if (req.files && typeof req.files === 'object') {
        const keys = Object.keys(req.files as any);
        if (keys.length > 0) {
          filesArray = (req.files as any)[keys[0]] as File[];
        }
      }

      const competencia = req.body?.competencia || undefined;

      if (!filesArray || filesArray.length === 0) {
        return res.status(400).json({
          error: 'Nenhum arquivo XML foi enviado',
          message: 'Por favor, envie ao menos um arquivo XML válido',
        });
      }

      const results = await importarCteXml(filesArray /*, competencia */);

      return res.status(200).json({
        message: 'Processamento de arquivos finalizado',
        competencia,
        results,
      });
    } catch (error: any) {
      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (Array.isArray(req.files)) {
          for (const f of req.files as File[]) {
            if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
        }
      } catch (e) {}

      return res.status(500).json({
        error: 'Erro ao processar os arquivos XML',
        message:
          error?.message ||
          'Ocorreu um erro inesperado ao processar os arquivos XML',
      });
    }
  }
  async importarNfceXml(req: RequestWithFile, res: Response) {
    try {
      let filesArray: File[] = [];
      if (Array.isArray(req.files)) {
        filesArray = req.files as File[];
      } else if (req.file) {
        filesArray = [req.file];
      } else if (req.files && typeof req.files === 'object') {
        const keys = Object.keys(req.files as any);
        if (keys.length > 0) {
          filesArray = (req.files as any)[keys[0]] as File[];
        }
      }

      if (!filesArray || filesArray.length === 0) {
        return res.status(400).json({
          error: 'Nenhum arquivo XML foi enviado',
          message: 'Por favor, envie ao menos um arquivo XML válido',
        });
      }

      const results = await importarNfceXml(filesArray);

      return res.status(200).json({
        message: 'Processamento de arquivos finalizado',
        results,
      });
    } catch (error: any) {
      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (Array.isArray(req.files)) {
          for (const f of req.files as File[]) {
            if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
        }
      } catch (e) {}

      return res.status(500).json({
        error: 'Erro ao processar os arquivos XML',
        message:
          error?.message ||
          'Ocorreu um erro inesperado ao processar os arquivos XML',
      });
    }
  }

  async importarXmls(req: RequestWithFile, res: Response) {
    try {
      const competencia = req.body?.competencia || undefined;
      const empresaId = req['empresaId'];
      let filesArray: File[] = [];
      if (Array.isArray(req.files)) {
        filesArray = req.files as File[];
      } else if (req.file) {
        filesArray = [req.file];
      } else if (req.files && typeof req.files === 'object') {
        const keys = Object.keys(req.files as any);
        if (keys.length > 0) {
          filesArray = (req.files as any)[keys[0]] as File[];
        }
      }
      if (!filesArray || filesArray.length === 0) {
        return res.status(400).json({
          error: 'Nenhum arquivo XML foi enviado',
          message: 'Por favor, envie ao menos um arquivo XML válido',
        });
      }

      const results = await importarXmls(
        filesArray as any,
        competencia,
        empresaId
      );

      return res.status(200).json({
        message: 'Processamento de arquivos finalizado',
        results,
      });
    } catch (error: any) {
      try {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        if (Array.isArray(req.files)) {
          for (const f of req.files as File[]) {
            if (f?.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          }
        }
      } catch (e) {}

      return res.status(500).json({
        error: 'Erro ao processar os arquivos XML',
        message:
          error?.message ||
          'Ocorreu um erro inesperado ao processar os arquivos XML',
      });
    }
  }
}
