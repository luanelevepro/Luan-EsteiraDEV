import type { Request, Response, RequestHandler } from 'express';
import * as NotificacoesService from '@/services/sistema/notificacoes.service';

export class NotificacoesController {
  static getNotificacoes: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    try {
      const usuarioId = req['usuarioId'];
      if (!usuarioId) {
        res.status(400).json({ error: 'Usuário não encontrado.' });
        return;
      }

      const notificacoes = await NotificacoesService.getAllNotifications({
        profileId: usuarioId as string,
      });
      res.status(200).json(notificacoes || []);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter notificações.' });
      return;
    }
  };

  static getNotificacao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID da notificação é obrigatório.' });
      return;
    }

    try {
      const notificacao = await NotificacoesService.getNotificationById(id);
      if (!notificacao) {
        res.status(404).json({ error: 'Notificação não encontrada.' });
        return;
      }
      res.status(200).json(notificacao);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter notificação.' });
      return;
    }
  };

  static createNotificacao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    const { usuarioId } = req['usuarioId'];

    if (!usuarioId) {
      res.status(400).json({ error: 'Usuário não encontrado.' });
      return;
    }

    try {
      const { id_profile, ds_titulo, ds_descricao, cd_tipo } = req.body;

      if (!id_profile || !ds_titulo || !cd_tipo) {
        res.status(400).json({ error: 'Campos obrigatórios não preenchidos.' });
        return;
      }

      await NotificacoesService.createNotification({
        id_profile: usuarioId as string,
        ds_titulo,
        ds_descricao,
        cd_tipo,
      });

      res.status(201).json({ message: 'Sucesso' });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar notificação.' });
      return;
    }
  };

  static deleteNotificacao: RequestHandler = async (
    req: Request,
    res: Response
  ) => {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID da notificação é obrigatório.' });
      return;
    }

    try {
      await NotificacoesService.deleteNotification(id);
      res.status(204).send({ message: 'Sucesso' });
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao remover notificação.' });
      return;
    }
  };
}
