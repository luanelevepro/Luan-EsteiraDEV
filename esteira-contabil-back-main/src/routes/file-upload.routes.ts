import { Router } from 'express';
import { handleXLSXUpload } from '../core/sheetImporter/xlsx-parser';
import {
  uploadXlsxFile,
  downloadXlsxModel,
} from '../controllers/file-import.controller';

const router = Router();

router.post('/xlsx', handleXLSXUpload, uploadXlsxFile);
router.get('/xlsx/:table', downloadXlsxModel);

export default router;
