import { Request, Response } from 'express';
import * as EmpresaService from '../../../services/sistema/empresa/empresa.service';

export class EmpresaController {
  static async getUfEmpresa(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const uf = await EmpresaService.getUfEmpresa(id);
      if (uf === null) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json({ uf });
    } catch (error) {
      console.error('Erro ao buscar UF da empresa:', error);
      return res.status(500).json({ error: 'Erro ao buscar UF da empresa.' });
    }
  }
  static async createOrUpdateEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresa = await EmpresaService.createOrUpdateEmpresa(req.body);
      return res.status(201).json(empresa);
    } catch (error) {
      console.error('Erro ao criar/atualizar empresa:', error.message);
      return res.status(500).json({ error: 'Erro ao criar empresa.' });
    }
  }

  static async createOrUpdateEmpresas(
    req: Request,
    res: Response
  ): Promise<Response> {
    const empresas = req.body;

    if (!Array.isArray(empresas)) {
      return res.status(400).json({
        error: 'O corpo da requisição deve ser um array de empresas.',
      });
    }

    const empresasUnicas = Array.from(
      new Map(
        empresas.map((empresa) => [empresa.ds_documento, empresa])
      ).values()
    );

    try {
      const successes: any[] = [];
      const errors: any[] = [];

      for (const empresa of empresasUnicas) {
        try {
          const result = await EmpresaService.createOrUpdateEmpresa(empresa);
          successes.push(result);
        } catch (error) {
          errors.push({ message: error.message });
        }
      }

      return res.status(207).json({
        successes,
        errors,
      });
    } catch (error) {
      console.error('Erro inesperado ao processar as empresas:', error);
      return res
        .status(500)
        .json({ error: 'Erro inesperado ao processar as empresas.' });
    }
  }

  static async getEmpresas(req: Request, res: Response): Promise<Response> {
    try {
      const isEscritorio =
        req.query.is_escritorio !== undefined
          ? req.query.is_escritorio === 'true'
          : undefined;

      const empresas = await EmpresaService.getEmpresas(isEscritorio);
      return res.status(200).json(empresas);
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      return res.status(500).json({ error: 'Erro ao listar empresas.' });
    }
  }

  static async getAcessosEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const acessos = await EmpresaService.getAcessosEmpresa(id);
      return res.status(200).json(acessos);
    } catch (error) {
      console.error('Erro ao listar acessos:', error);
      return res.status(500).json({ error: 'Erro ao listar acessos.' });
    }
  }

  static async getAcessosBloqueadosEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const acessos = await EmpresaService.getAcessosBloqueados(id);
      return res.status(200).json(acessos);
    } catch (error) {
      console.error('Erro ao listar acessos:', error);
      return res.status(500).json({ error: 'Erro ao listar acessos.' });
    }
  }

  static async getEmpresa(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const empresa = await EmpresaService.getEmpresa(id);
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json(empresa);
    } catch (error) {
      console.error('Erro ao buscar empresa:', error);
      return res.status(500).json({ error: 'Erro ao buscar empresa.' });
    }
  }

  static async updateEmpresa(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const { nome, cnpj } = req.body;

    try {
      const empresa = await EmpresaService.updateEmpresa(id, nome, cnpj);
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json(empresa);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar empresa.' });
    }
  }

  static async deleteEmpresa(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
      const empresa = await EmpresaService.deleteEmpresa(id);
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }
      return res.status(200).json({ message: 'Empresa deletada com sucesso.' });
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      return res.status(500).json({ error: 'Erro ao deletar empresa.' });
    }
  }

  static async addUsuarioByEmailEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, email } = req.params;

    try {
      const result = await EmpresaService.addUsuarioByEmailEmpresa(id, email);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao adicionar usuário à empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar usuário à empresa.' });
    }
  }

  static async addUsuarioEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, usuarioId } = req.params;

    try {
      const result = await EmpresaService.addUsuarioEmpresa(id, usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao adicionar usuário à empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar usuário à empresa.' });
    }
  }

  static async toggleBlockUsuarioEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, usuarioId } = req.params;

    try {
      const result = await EmpresaService.toggleBlockUsuarioEmpresa(
        id,
        usuarioId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao bloquear usuário de empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao bloquear usuário de empresa.' });
    }
  }

  static async deleteUsuarioEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id, usuarioId } = req.params;

    try {
      const result = await EmpresaService.deleteUsuarioEmpresa(id, usuarioId);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao adicionar usuário à empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar usuário à empresa.' });
    }
  }

  static async getUsuariosEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const users = await EmpresaService.getUsuariosEmpresa(id);
      return res.status(200).json(users);
    } catch (error) {
      console.error('Erro ao listar usuários da empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao listar usuários da empresa.' });
    }
  }

  static async addSegmentoToEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { segmentoId } = req.params;
    const { id_empresa } = req.body;

    try {
      const result = await EmpresaService.addSegmentoToEmpresa(
        id_empresa,
        segmentoId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao adicionar segmento à empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar segmento à empresa.' });
    }
  }

  static async addRegimeTributarioToEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { regimeId } = req.params;
    const { id_empresa } = req.body;

    try {
      const result = await EmpresaService.addRegimeTributarioToEmpresa(
        id_empresa,
        regimeId
      );
      return res.status(200).json(result);
    } catch (error) {
      console.error('Erro ao adicionar regime tributário à empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao adicionar regime tributário à empresa.' });
    }
  }

  static async getSegmentosEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    const { id } = req.params;

    try {
      const segmentos = await EmpresaService.getSegmentosEmpresa(id);
      return res.status(200).json(segmentos);
    } catch (error) {
      console.error('Erro ao listar segmentos da empresa:', error);
      return res
        .status(500)
        .json({ error: 'Erro ao listar segmentos da empresa.' });
    }
  }

  // static async getRegimesTributariosEmpresa(
  //   req: Request,
  //   res: Response
  // ): Promise<Response> {
  //   const { id } = req.params;

  //   try {
  //     const regimes = await EmpresaService.getRegimesTributariosEmpresa(id);
  //     return res.status(200).json(regimes);
  //   } catch (error) {
  //     console.error('Erro ao listar regimes tributários da empresa:', error);
  //     return res
  //       .status(500)
  //       .json({ error: 'Erro ao listar regimes tributários da empresa.' });
  //   }
  // }
}
