import { Request, Response } from 'express';
import * as cronogramaService from '../../services/tms/cronograma.service';

/**
 * GET /cronograma?dataInicio=ISO&dataFim=ISO&placa=
 * Retorna linhas (veículos) com eventos no período para o Gantt do Cronograma.
 */
export async function getCronograma(req: Request, res: Response): Promise<Response> {
  try {
    const empresaId = req['empresaId'];
    if (!empresaId) {
      return res.status(400).json({ error: 'Empresa não identificada' });
    }

    const dataInicio = req.query.dataInicio as string;
    const dataFim = req.query.dataFim as string;
    const placa = req.query.placa as string | undefined;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({
        error: 'dataInicio e dataFim são obrigatórios (ISO)',
      });
    }

    const result = await cronogramaService.getCronograma(
      empresaId,
      dataInicio,
      dataFim,
      placa
    );

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Erro ao buscar cronograma:', error);
    return res.status(500).json({
      error: error.message || 'Erro ao buscar cronograma',
    });
  }
}
