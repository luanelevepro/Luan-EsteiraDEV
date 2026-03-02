import { Request, Response } from 'express';
import * as VeiculosService from '../../services/tms/veiculos.service';

export class VeiculosController {
  /**
   * Busca todos os veículos
   */
  static async getAllByEmpresa(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'] || req.params.empresaId;
      const is_ativo = req.query.is_ativo as string | undefined;
      const veiculos = await VeiculosService.getVeiculos(
        empresaId,
        is_ativo !== undefined ? is_ativo === 'true' : undefined
      );
      return res.status(200).json(veiculos);
    } catch (error: any) {
      console.error('Erro ao buscar veículos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Busca veículos com paginação e filtros
   */
  static async getPaginacao(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const {
        page = '1',
        pageSize = '50',
        orderBy = 'asc',
        orderColumn = 'ds_placa',
        search = '',
        status = '',
        tipoCarroceria = '',
      } = req.query;

      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];

      const tipoCarroceriaArray = tipoCarroceria
        ? (tipoCarroceria as string).split(',').map((t) => t.trim())
        : [];

      const resultado = await VeiculosService.getVeiculosPaginacao(
        empresaId,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        statusArray,
        tipoCarroceriaArray
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao buscar veículos paginados:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Sincroniza veículos da API externa
   */
  static async sincronizar(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'] || req.params.empresaId;

      const resultado =
        await VeiculosService.sincronizarVeiculosByEmpresaId(empresaId);
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao sincronizar veículos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cria um novo veículo
   */
  static async createOne(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const body = req.body;

      const veiculo = await VeiculosService.createVeiculo(empresaId, body);
      return res.status(201).json(veiculo);
    } catch (error: any) {
      console.error('Erro ao criar veículo:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualiza um veículo específico
   */
  static async updateOne(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: 'ID do veículo não fornecido' });
      }

      const veiculo = await VeiculosService.updateVeiculo(
        empresaId,
        id,
        req.body
      );
      return res.status(200).json(veiculo);
    } catch (error: any) {
      console.error('Erro ao atualizar veículo:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Ativa veículos selecionados ou todos
   */
  static async ativarTodos(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const idsBody = req.body?.ids;

      let ids: string[] = [];

      if (Array.isArray(idsBody)) {
        ids = idsBody;
      } else if (typeof idsBody === 'string' && idsBody.trim()) {
        ids = idsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const resultado = await VeiculosService.ativarTodosVeiculos(
        empresaId,
        ids
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao ativar veículos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Inativa veículos selecionados ou todos
   */
  static async inativarTodos(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const idsBody = req.body?.ids;

      let ids: string[] = [];

      if (Array.isArray(idsBody)) {
        ids = idsBody;
      } else if (typeof idsBody === 'string' && idsBody.trim()) {
        ids = idsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      const resultado = await VeiculosService.inativarTodosVeiculos(
        empresaId,
        ids
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao inativar veículos:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Define o tipo de unidade dos veículos
   */
  static async setTipoUnidade(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { ids: idsBody, ds_tipo_unidade } = req.body;

      const validTypes = ['TRACIONADOR', 'CARROCERIA', 'RIGIDO'];
      if (
        !ds_tipo_unidade ||
        !validTypes.includes(String(ds_tipo_unidade).toUpperCase())
      ) {
        return res.status(400).json({
          error:
            'ds_tipo_carroceria deve ser um dos seguintes valores: GRANELEIRO, BAU, SIDER, FRIGORIFICO, TANQUE ou PORTA_CONTAINER',
        });
      }

      let ids: string[] = [];

      if (Array.isArray(idsBody)) {
        ids = idsBody;
      } else if (typeof idsBody === 'string' && idsBody.trim()) {
        ids = idsBody
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }

      if (!ids || ids.length === 0) {
        return res.status(400).json({
          error: 'Lista de IDs não fornecida ou vazia',
        });
      }

      const tipoUnidade = String(ds_tipo_unidade).toUpperCase() as
        | 'TRACIONADOR'
        | 'CARROCERIA'
        | 'RIGIDO';
      const resultado = await VeiculosService.setTipoUnidade(
        empresaId,
        ids,
        tipoUnidade
      );
      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao atualizar tipo de unidade:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
