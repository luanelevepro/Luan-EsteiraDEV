import { Request, Response } from 'express';
import multer, { File } from 'multer';
import fs from 'fs';
import path from 'path';
import { EnvioPlanilhaSat } from '@/services/fiscal/sat/envio-planilha.service';
import { RequestWithFile } from '../onvio/importar-xml.controller';

// Cria o diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do multer para armazenar arquivos (xlsx)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Filtro para aceitar apenas arquivos XLSX
const fileFilter = (
  req: Request,
  file: File,
  cb: multer.FileFilterCallback
) => {
  // aceitar XLSX e os tipos comuns de planilha
  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/octet-stream',
  ];

  if (
    allowed.includes(file.mimetype) ||
    file.originalname.match(/\.xlsx?$|\.xls$/i)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos XLSX/XLS são permitidos'));
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

// Middleware para processar o upload do arquivo (xlsx)
// permite múltiplos arquivos no campo 'files' (até 10 por requisição)
export const handleXlsxUpload = upload.array('files', 10);

// Interface para estender o tipo Request do Express
// export interface RequestWithFile extends Request {
//   file?: File;
//   files?: { [fieldname: string]: File[] } | File[];
// }

export class EnvioPlanilhaController {
  private envioPlanilhaService: EnvioPlanilhaSat;

  constructor() {
    this.envioPlanilhaService = new EnvioPlanilhaSat();
  }

  async importarXlsx(req: RequestWithFile, res: Response) {
    try {
      // agora esperamos múltiplos arquivos em req.files
      const files = req.files as File[] | undefined;
      const competencia = req.body.competencia;
      if (!files || files.length === 0) {
        return res.status(400).json({
          error: 'Nenhum arquivo XLSX foi enviado',
          message:
            'Por favor, envie ao menos um arquivo XLSX válido no campo "files"',
        });
      }

      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      if (!empresaId) {
        // remove arquivos temporários antes de responder
        files.forEach((f) => {
          if (f?.path) fs.unlink(f.path, () => {});
        });
        return res.status(400).json({
          error: 'ID da empresa não fornecido',
          message: 'O ID da empresa é obrigatório para importar o XLSX',
        });
      }
      console.log(usuarioId);
      try {
        // chama o service que lê cada xlsx e retorna um array de resultados
        const paths = (files || []).map((f) => (f as any).path as string);
        const results = await this.envioPlanilhaService.enviarPlanilhas(
          paths,
          empresaId,
          usuarioId,
          competencia
        );

        // Remove os arquivos após o processamento (assincrono, não bloqueante)
        files.forEach((f) => {
          if (f?.path) {
            fs.unlink(f.path, (err) => {
              if (err)
                console.warn(
                  'Erro ao remover arquivo temporário:',
                  err.message
                );
            });
          }
        });

        return res.status(200).json({
          message: 'Planilhas processadas com sucesso',
          data: results,
        });
      } catch (error) {
        // Remove os arquivos em caso de erro
        files.forEach((f) => {
          if (f?.path) fs.unlink(f.path, () => {});
        });

        return res.status(500).json({
          error: error.message || 'Ocorreu um erro ao processar os arquivos',
        });
      }
    } catch (error) {
      // Remove o arquivo em caso de erro
      const files = req.files as File[] | undefined;
      files?.forEach((f) => {
        if (f?.path) fs.unlink(f.path, () => {});
      });

      return res.status(500).json({
        error: 'Erro ao processar o arquivo XML',
        message:
          error.message || 'Ocorreu um erro inesperado ao processar o arquivo',
      });
    }
  }
}
