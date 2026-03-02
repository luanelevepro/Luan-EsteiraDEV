import { Request, RequestHandler, Response } from 'express';
import * as XmlService from '../../../services/fiscal/sieg/sieg.service';
import * as Scheduler from '../../../services/fiscal/sieg/scheduler';

export class SiegController {
  // ----------- Sinc ----------- //
  static sincSiegEntradasDocs = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.sincSiegEntradasDocs(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao sincronizar SIEG entradas:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar SIEG entradas',
      });
    }
  };
  static sincSiegSaidasDocs = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.sincSiegSaidasDocs(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao sincronizar SIEG saídas:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar SIEG saídas',
      });
    }
  };

  // ----------- Coleta NFSE ----------- //
  // ----------- Entradas ----------- //
  static coletarNfseSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfseSieg(empresaId, competencia);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NFS-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NFS-e SIEG',
      });
    }
  };
  static coletarNfseSaidaSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfseSaidaSieg(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NFS-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NFS-e SIEG',
      });
    }
  };
  // ----------- Coleta NFE ----------- //
  // ----------- Entradas ----------- //
  static coletarNfeSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfeSieg(empresaId, competencia);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NF-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NF-e SIEG',
      });
    }
  };
  static coletarNfeSaidaSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfeSaidaSieg(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NF-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NF-e SIEG',
      });
    }
  };

  // ----------- Coleta CTE ----------- //
  // ----------- Entradas ----------- //
  static coletarCteSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarCteSieg(empresaId, competencia);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar CT-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar CT-e SIEG',
      });
    }
  };
  // ----------- Saídas ----------- //
  static coletarCteSaidaSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarCteSaidaSieg(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar CT-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar CT-e SIEG',
      });
    }
  };

  // ----------- Coleta NFCE ----------- //
  // ----------- Entradas ----------- //
  static coletarNfceSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfceSieg(empresaId, competencia);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NF-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NF-e SIEG',
      });
    }
  };
  static coletarNfceSaidaSieg = async (req: Request, res: Response) => {
    try {
      const { empresaId, competencia } = req.body as {
        empresaId: string;
        competencia: string;
      };

      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }

      const result = await XmlService.coletarNfceSaidaSieg(
        empresaId,
        competencia
      );
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar NF-e SIEG:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar NF-e SIEG',
      });
    }
  };

  static createConsultaAno = async (req: Request, res: Response) => {
    try {
      const { ano, escritorioId } = req.body as {
        ano: number;
        escritorioId: string;
      };

      if (!ano || !escritorioId) {
        return res
          .status(400)
          .json({ error: 'ano e escritorioId são obrigatórios' });
      }

      const result = await XmlService.createConsultaAno(ano, escritorioId);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('Erro ao coletar:', err);
      return res.status(500).json({
        error: err.message || 'Erro interno ao sincronizar com SIEG',
      });
    }
  };
  static syncAll = async (req: Request, res: Response): Promise<void> => {
    const { competencia } = req.body as {
      competencia: string;
    };
    try {
      await Scheduler.scheduleRun(competencia);
      res
        .status(200)
        .json({ message: 'Sincronização geral disparada com sucesso.' });
    } catch (err: any) {
      console.error('Erro ao disparar syncAll TecnoSpeed:', err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao sincronizar.' });
    }
  };
}
