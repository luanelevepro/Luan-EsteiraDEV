import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { RequestWithFile } from '@/controllers/fiscal/onvio/importar-xml.controller';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const fileFilter = (
  req: Request,
  // @ts-expect-error | Multer doesn't have a type definition for fileFilter
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.xlsx' && ext !== '.xls') {
    return cb(new Error('Apenas arquivos do Excel são permitidos'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
});

export const handleXLSXUpload = (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erro no envio: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    next();
  });
};

export interface CsvData {
  headers: string[];
  rows: Record<string, any>[];
  rawCsv: string;
}

export const parseXlsxToCsv = async (
  filePath: string,
  sheetName?: string
): Promise<CsvData> => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = sheetName || workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheet];

    if (!worksheet) {
      throw new Error(`Planilha "${sheet}" não encontrada no arquivo.`);
    }

    const csvString = XLSX.utils.sheet_to_csv(worksheet);

    const rows = csvString.split('\n');
    const headers = rows[0].split(',').map((h) => h.trim());

    const dataRows = rows
      .slice(1)
      .filter((row) => row.trim() !== '')
      .map((row) => {
        const values = row.split(',').map((val) => val.trim());
        const rowObj: Record<string, any> = {};

        headers.forEach((header, index) => {
          rowObj[header] = values[index] || '';
        });

        return rowObj;
      });

    fs.unlinkSync(filePath);

    return {
      headers,
      rows: dataRows,
      rawCsv: csvString,
    };
  } catch (error) {
    console.error('Error XLSX -> CSV:', error);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

export interface ValidationResult {
  valid: Record<string, any>[];
  invalid: Record<string, any>[];
  headers: string[];
}

export const validateCsvData = async (
  csvData: CsvData,
  validationFn: (row: Record<string, any>) => Promise<boolean> | boolean
): Promise<ValidationResult> => {
  const valid: Record<string, any>[] = [];
  const invalid: Record<string, any>[] = [];

  for (const row of csvData.rows) {
    try {
      const isValid = await Promise.resolve(validationFn(row));

      if (isValid) {
        valid.push(row);
      } else {
        invalid.push(row);
      }
    } catch (error) {
      invalid.push(row);
    }
  }

  return {
    valid,
    invalid,
    headers: csvData.headers,
  };
};
