import { Router } from 'express';
import { PessoaController } from '@/controllers/geral/pessoa.controller';
const router = Router();

router.post('/pessoa', PessoaController.create);
router.get('/pessoa', PessoaController.findAll);
router.get('/pessoa/:id', PessoaController.findOne);
router.put('/pessoa/:id', PessoaController.update);

export default router;
