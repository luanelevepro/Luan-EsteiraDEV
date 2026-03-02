import { Router } from 'express';
import {
  ImportarXmlController,
  handleXmlUpload,
  RequestWithFile,
} from '../../../controllers/fiscal/onvio/importar-xml.controller';

const router = Router();
const importarXmlController = new ImportarXmlController();

router.post(
  '/notas-fiscais/importar-xml',
  handleXmlUpload,
  (req: RequestWithFile, res) => {
    importarXmlController.importarXml(req, res);
  }
);

export default router;
