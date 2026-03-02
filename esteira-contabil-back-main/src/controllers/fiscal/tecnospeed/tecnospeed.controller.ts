import { Request, Response } from 'express';
import * as TecnoService from '../../../services/fiscal/tecnospeed/tecnospeed.service';
import * as Scheduler from '../../../services/fiscal/tecnospeed/scheduler';

export class TecnoSpeedController {
  static syncCertificado = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { empresaId } = req.body as { empresaId: string };
      if (!empresaId) {
        res.status(400).json({ error: 'empresaId é obrigatório' });
        return;
      }
      await TecnoService.enviarCertificadosTecnospeed(empresaId);
      res.status(200).json({ message: 'Certificado enviado com sucesso' });
    } catch (err: any) {
      console.error('Erro ao enviar certificado TecnoSpeed:', err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao enviar certificado' });
    }
  };
  /**
   * Sincroniza cidades homologadas.
   * Não precisa de empresaId, pois usa credenciais da SH (TOKEN_SH e CPF_CNPJ_SH) do .env.
   */
  static syncCities = async (req: Request, res: Response): Promise<void> => {
    try {
      await TecnoService.SincronizarCidadesHomologadas();
      res
        .status(200)
        .json({ message: 'Cidades homologadas sincronizadas com sucesso' });
    } catch (err: any) {
      console.error('Erro ao sincronizar cidades TecnoSpeed:', err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao sincronizar cidades' });
    }
  };

  /**
   * Envia protocolos para TecnoSpeed.
   * Agora exige { empresaId: string } no body.
   */
  static sendProtocols = async (req: Request, res: Response): Promise<void> => {
    try {
      const { empresaId } = req.body as { empresaId: string };
      const { competencia } = req.body as { competencia?: string };
      if (!competencia) {
        res.status(400).json({ error: 'competencia é obrigatório' });
      }
      if (!empresaId) {
        res.status(400).json({ error: 'empresaId é obrigatório' });
        return;
      }

      await TecnoService.SincronizarProtocolosTecnoSpeed(
        empresaId,
        competencia
      );
      res.status(200).json({ message: 'Protocolos enviados com sucesso' });
    } catch (err: any) {
      console.error('Erro ao enviar protocolos TecnoSpeed:', err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao enviar protocolos' });
    }
  };

  /**
   * Coleta notas já submetidas.
   * Agora exige { empresaId: string } no body.
   */
  static collectNotes = async (req: Request, res: Response): Promise<void> => {
    try {
      const { empresaId } = req.body as { empresaId: string };
      if (!empresaId) {
        res.status(400).json({ error: 'empresaId é obrigatório' });
        return;
      }

      await TecnoService.ColetarNotasTecnoSpeed(empresaId);
      res.status(200).json({ message: 'Notas coletadas com sucesso' });
    } catch (err: any) {
      console.error('Erro ao coletar notas TecnoSpeed:', err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao coletar notas' });
    }
  };

  static syncAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { competencia } = req.body as { competencia?: string };
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

  /** Dispara o fluxo só para uma empresa específica */
  static syncEmpresa = async (req: Request, res: Response): Promise<void> => {
    const { empresaId } = req.body as { empresaId?: string };
    if (!empresaId) {
      res.status(400).json({ error: 'Parâmetro empresaId é obrigatório.' });
    }
    try {
      await Scheduler.runTasksForEmpresa(empresaId);
      res
        .status(200)
        .json({ message: `Sincronização iniciada para ${empresaId}.` });
    } catch (err: any) {
      console.error(`Erro ao syncEmpresa ${empresaId}:`, err);
      res
        .status(500)
        .json({ error: err.message || 'Erro interno ao processar empresa.' });
    }
  };
}
