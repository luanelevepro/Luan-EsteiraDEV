import * as ibgeService from '@/services/sistema/sincronizar/ibge.service';
import * as cidadeService from '@/services/sistema/cidade.service';
import { validatePagination } from '@/core/utils';
import { RequestHandler, Request, Response } from 'express';

export class CidadesController {
  static updateCities: RequestHandler = async (req: Request, res: Response) => {
    try {
      console.log('Atualizando cidades. Iniciando...');
      const cidades = await ibgeService.updateCitiesRepository();
      res.status(200).json(cidades);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter cidades.' });
    }
  };

  static getCities: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { pageSize, page, orderBy, orderColumn, search } =
        validatePagination(req);

      const cidades = await cidadeService.getCities({
        pageSize,
        page,
        orderBy,
        orderColumn,
        search,
      });

      res.status(200).json(cidades);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter cidades.' });
    }
  };

  static getCityById: RequestHandler = async (req: Request, res: Response) => {
    try {
      const { id_cidade } = req.params;
      const cidade = await cidadeService.getCityById(id_cidade);
      res.status(200).json(cidade);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter cidade.' });
    }
  };
}
