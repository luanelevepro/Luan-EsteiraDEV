import { Response } from 'express';
import MotoristaService from '@/services/tms/motorista.service';

export default class MotoristaController {
  static async create(req: any, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const motoristaService = new MotoristaService();

      const payload = req.body || {};

      // Expected shape: { funcionario: { ds_nome, ds_documento, ds_salario, ds_tipo_vinculo? }, veiculoId?, ...tmsFields }
      const funcionario = payload.funcionario;

      if (!funcionario || typeof funcionario !== 'object') {
        return res
          .status(400)
          .json({ message: 'Campo "funcionario" é obrigatório.' });
      }

      const nome = String(funcionario.ds_nome || '').trim();
      const documentoRaw = String(funcionario.ds_documento || '').trim();
      const salarioRaw = funcionario.ds_salario;

      if (!nome) {
        return res
          .status(400)
          .json({ message: 'Nome do funcionário é obrigatório.' });
      }

      if (!documentoRaw) {
        return res
          .status(400)
          .json({ message: 'Documento (CPF ou CNPJ) é obrigatório.' });
      }

      if (
        salarioRaw === undefined ||
        salarioRaw === null ||
        salarioRaw === ''
      ) {
        return res.status(400).json({ message: 'Salário é obrigatório.' });
      }

      // Normalizar documento (apenas dígitos)
      const ds_documento = String(documentoRaw).replace(/\D/g, '');

      // Normalizar salário (string com duas casas decimais)
      let ds_salario: string | undefined;
      if (typeof salarioRaw === 'number') {
        ds_salario = salarioRaw.toFixed(2);
      } else {
        // remove caracteres não numéricos, substituir , por . if necessary
        const cleaned = String(salarioRaw)
          .replace(/[^0-9,\.]/g, '')
          .replace(',', '.');
        if (cleaned === '') {
          return res.status(400).json({ message: 'Salário inválido.' });
        }
        // ensure valid number
        const num = Number(cleaned);
        if (Number.isNaN(num)) {
          return res.status(400).json({ message: 'Salário inválido.' });
        }
        ds_salario = num.toFixed(2);
      }

      // Forçar tipo de vínculo para TERCEIRIZADO
      const ds_tipo_vinculo = 'TERCEIRIZADO';

      const createPayload = {
        // include any tms fields sent (e.g., ds_cnh_*)
        ...(payload || {}),
        funcionario: {
          ds_nome: nome,
          ds_documento,
          ds_salario,
          ds_tipo_vinculo,
        },
      };

      const motorista = await motoristaService.create(createPayload, empresaId);
      return res.status(201).json(motorista);
    } catch (error: any) {
      console.error('Erro ao criar motorista:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao criar motorista',
        error: error,
      });
    }
  }

  static async findOne(req: any, res: Response) {
    console.log('Buscando motorista com ID:', req.params.id);
    try {
      const motoristaService = new MotoristaService();
      const motorista = await motoristaService.findOne(req.params.id);

      if (!motorista) {
        return res.status(404).json({ message: 'Motorista não encontrado' });
      }

      return res.json(motorista);
    } catch (error: any) {
      console.error('Erro ao buscar motorista:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao buscar motorista',
        error: error,
      });
    }
  }

  static async findAll(req: any, res: Response) {
    try {
      const motoristaService = new MotoristaService();

      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 10;

      const result = await motoristaService.findAll({
        page,
        pageSize,
      });

      return res.json(result);
    } catch (error: any) {
      console.error('Erro ao listar motoristas:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao listar motoristas',
        error: error,
      });
    }
  }

  static async getPaginacao(req: any, res: Response) {
    try {
      const motoristaService = new MotoristaService();

      const {
        page = '1',
        pageSize = '10',
        orderBy = 'asc',
        orderColumn = 'dt_created',
        search = '',
        status = '',
      } = req.query;

      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];

      const resultado = await motoristaService.getMotoristasPaginacao(
        req['empresaId'],
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        statusArray
      );

      return res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Erro ao buscar motoristas paginados:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao buscar motoristas paginados',
        error,
      });
    }
  }

  static async update(req: any, res: Response) {
    try {
      const motoristaService = new MotoristaService();
      const motorista = await motoristaService.update(req.params.id, req.body);
      return res.json(motorista);
    } catch (error: any) {
      console.error('Erro ao atualizar motorista:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao atualizar motorista',
        error: error,
      });
    }
  }

  static async sincronizar(req: any, res: Response) {
    console.log('Iniciando sincronização de motoristas...');
    try {
      const empresaId = req['empresaId'];
      const motoristaService = new MotoristaService();

      await motoristaService.sincronizarMotoristas({ empresaId });

      return res.status(200).json({
        message: 'Motoristas sincronizados com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao sincronizar motoristas:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao sincronizar motoristas',
        error: error,
      });
    }
  }

  static async vincularVeiculo(req: any, res: Response) {
    try {
      const motoristaService = new MotoristaService();
      const vinculo = await motoristaService.vincularVeiculo(req.body);
      return res.status(201).json(vinculo);
    } catch (error: any) {
      console.error('Erro ao vincular motorista ao veículo:', error);
      return res.status(500).json({
        message: error.message || 'Erro ao vincular motorista ao veículo',
        error: error,
      });
    }
  }
}
