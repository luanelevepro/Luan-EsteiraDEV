// import 'src/services/fiscal/tecnospeed/scheduler';
// import 'src/services/fiscal/sieg/scheduler';
import 'dotenv/config';
const express = require('express');
const http = require('http');
const cors = require('cors');
const port = process.env.PORT || 4000;
import router from './src/routes/index';
import { acessoToken } from './src/core/middleware';
import fs from 'fs';
import path from 'path';
import { startCronJobs } from './src/services/faturamento/transporte/cron_job';

// import { findDuplicateSuppliers } from '@/scripts/find-duplicate-suppliers';
// import { removeDuplicateSuppliers } from '@/scripts/remove-duplicate-suppliers';
// import { findDuplicateNfse } from '@/scripts/find-duplicate-nfse';
// import { removeDuplicateNfse } from '@/scripts/remove-duplicate-nfse';
// import { removeOldNfse } from '@/scripts/remove-old-nfse';
// import { updateNfseOrigin } from '@/scripts/update-nfse-origin';
const app = express();
const server = http.createServer(app);
app.use(cors());
// setCtesContra({
//   empresaId: '7b9a52e4-d0ef-4460-bbf1-63b1a34cec83',
//   competencia: '2026-01',
// });
// getRelacionadosDocumento({
//   empresaId: '7b9a52e4-d0ef-4460-bbf1-63b1a34cec83',
//   documentoId: '94575206-dfae-40e9-bbdf-f1b8e7411fd7',
// });
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
//app.use(cors({
//  origin: ['http://localhost:3000', 'https://gerenciador-web.vercel.app', 'https://authjs.esteira-contabil-front.pages.dev'],
//  methods: ['GET', 'POST', 'DELETE', 'PUT']
//}));

app.use(express.json({ limit: '10mb' }));
startCronJobs();
app.use('/api', acessoToken, router);
//app.use('/user', verifyAccessToken, userRoutes);

//findDuplicateNfse();
//removeDuplicateNfse();
//removeOldNfse();
//updateNfseOrigin();

server.listen(port, function () {
  console.log(`Listening to port ${port}`);
});
function extractMotoristaFromObs(ds_observacao: any) {
  throw new Error('Function not implemented.');
}
