import type { Request, Response, RequestHandler } from 'express';
import * as UFService from '@/services/sistema/uf.service';
import { validatePagination } from '@/core/utils';

export class UFController {
  static getUFs: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { vigencia } = req.query;
      const ufs = await UFService.getUFs(
        validatePagination(req),
        vigencia === 'true'
      );
      res.status(200).json(ufs);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter UFs.' });
      return;
    }
  };
  static getUFsGeral: RequestHandler = async (req: Request, res: Response) => {
    try {
      const ufs = await UFService.getUFsGeral();
      res.status(200).json(ufs);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter UFs.' });
      return;
    }
  };
  static getUF: RequestHandler = async (req: Request, res: Response) => {
    const { id_uf } = req.params;
    if (!id_uf || isNaN(Number(id_uf))) {
      res.status(400).json({ error: 'UF não encontrada.' });
      return;
    }

    try {
      const ufs = await UFService.getUF(Number(id_uf));
      res.status(200).json(ufs);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter UFs.' });
      return;
    }
  };

  static getUFCidades: RequestHandler = async (
    req: Request & { id_uf?: number },
    res: Response
  ) => {
    const { id_uf } = req;
    if (!id_uf) {
      res.status(400).json({ error: 'UF não encontrada.' });
      return;
    }

    try {
      const cidades = await UFService.getUFCidades(id_uf);
      res.status(200).json(cidades);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter cidades da UF.' });
      return;
    }
  };
}
