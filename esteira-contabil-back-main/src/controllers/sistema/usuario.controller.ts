import { Request, Response } from 'express';
import * as profileService from '../../services/sistema/usuario/usuario.service';

export class UsuarioController {
  static async getUsuarios(req: Request, res: Response): Promise<Response> {
    try {
      const usuarios = await profileService.getUsuarios();
      return res.status(200).json(usuarios);
    } catch (error) {
      console.error('Erro ao obter perfis:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter informações dos perfis.' });
    }
  }

  static async getUsuario(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const usuario = await profileService.getUsuario(id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      return res.status(200).json(usuario);
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter informações do perfil.' });
    }
  }

  static async updateUsuario(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const data = req.body;

    try {
      const updatedUsuario = await profileService.updateUsuario(id, data);
      return res.status(200).json(updatedUsuario);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return res.status(500).json({ error: 'Erro ao atualizar o perfil.' });
    }
  }

  static async confirmUsuario(req: Request, res: Response): Promise<Response> {
    const usuarioId = req['usuarioId'];

    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autorizado.' });
    }

    try {
      const confirmedUsuario = await profileService.confirmUsuario(usuarioId);
      return res.status(200).json(confirmedUsuario);
    } catch (error) {
      console.error('Erro ao confirmar o usuário:', error);
      return res.status(500).json({ error: 'Erro ao confirmar o usuário.' });
    }
  }

  static async getEmpresasUsuario(
    req: Request,
    res: Response
  ): Promise<Response> {
    const usuarioId = req['usuarioId'];
    if (!usuarioId) {
      return res.status(401).json({ error: 'Usuário não autorizado.' });
    }

    try {
      const empresas = await profileService.getEmpresasUsuarioById(usuarioId);
      return res.status(200).json(empresas);
    } catch (error) {
      console.error('Erro ao listar empresas associadas:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao listar empresas associadas ao perfil.' });
    }
  }

  static async getEmpresasUsuarioById(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const empresas = await profileService.getEmpresasUsuarioById(id);
      return res.status(200).json(empresas);
    } catch (error) {
      console.error('Erro ao listar empresas para o perfil:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao listar empresas associadas ao perfil.' });
    }
  }
}
