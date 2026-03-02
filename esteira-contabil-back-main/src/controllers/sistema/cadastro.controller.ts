import { Request, Response } from 'express';
import * as CadastrosSistemaService from '../../services/sistema/cadastro.service';
import { validatePagination } from '@/core/utils';

export class SistemaCadastroController {
  // Regimes Tributários
  static async getRegimesTributarios(req: Request, res: Response) {
    try {
      const regimes = await CadastrosSistemaService.getRegimesTributarios();
      res.status(200).json(regimes);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter regimes tributários.' });
      return;
    }
  }
  static async getRegimesTributariosById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const regime =
        await CadastrosSistemaService.getRegimesTributariosById(id);
      res.status(200).json(regime);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter regimes tributários.' });
      return;
    }
  }

  // Regimes Tributários @ Simples Nacional
  static async getSimplesNacional(req: Request, res: Response) {
    try {
      const regimes = await CadastrosSistemaService.getSimplesNacional();
      res.status(200).json(regimes);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter simples nacional.' });
      return;
    }
  }

  static async createSimplesNacional(req: Request, res: Response) {
    try {
      const regime = await CadastrosSistemaService.createSimplesNacional(
        req.body
      );
      res.status(201).json(regime);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar simples nacional.' });
      return;
    }
  }

  static async deleteSimplesNacional(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteSimplesNacional(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar simples nacional.' });
      return;
    }
  }

  static async updateSimplesNacional(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateSimplesNacional(
        id,
        req.body
      );
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar simples nacional.' });
      return;
    }
  }

  static async getCrts(req: Request, res: Response) {
    try {
      const regimes = await CadastrosSistemaService.getCrts();
      res.status(200).json(regimes);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter CRTs.' });
      return;
    }
  }

  static async createRegimeTributario(req: Request, res: Response) {
    try {
      const regime = await CadastrosSistemaService.createRegimeTributario(
        req.body
      );
      res.status(201).json(regime);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar regime tributário.' });
      return;
    }
  }

  static async updateRegimeTributario(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateRegimeTributario(
        id,
        req.body
      );
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar regime tributário.' });
      return;
    }
  }

  static async deleteRegimeTributario(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteRegimeTributario(
        id,
        validatePagination(req)
      );
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao deletar regime tributário.' });
      return;
    }
  }

  // Tipos Produto
  static async getTiposProduto(req: Request, res: Response) {
    try {
      const tiposProduto = await CadastrosSistemaService.getTiposProduto();
      res.status(200).json(tiposProduto);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter tipos de produto.' });
      return;
    }
  }

  static async createTipoProduto(req: Request, res: Response) {
    try {
      const tipoProduto = await CadastrosSistemaService.createTipoProduto(
        req.body
      );
      res.status(201).json(tipoProduto);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar tipo de produto.' });
      return;
    }
  }

  static async updateTipoProduto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateTipoProduto(
        id,
        req.body
      );
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar tipo de produto.' });
      return;
    }
  }

  static async deleteTipoProduto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteTipoProduto(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir tipo de produto.' });
      return;
    }
  }

  // Tipos Produto
  static async getTiposServico(req: Request, res: Response) {
    try {
      const tiposProduto = await CadastrosSistemaService.getTiposServico();
      res.status(200).json(tiposProduto);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter tipos de serviço.' });
      return;
    }
  }

  static async createTipoServico(req: Request, res: Response) {
    try {
      const tipoProduto = await CadastrosSistemaService.createTipoServico(
        req.body
      );
      res.status(201).json(tipoProduto);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar tipo de serviço.' });
      return;
    }
  }

  static async createTipoServicoMultiplo(req: Request, res: Response) {
    try {
      const tipoProduto = await CadastrosSistemaService.createTipoServico(
        req.body
      );
      res.status(201).json(tipoProduto);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar tipo de serviço.' });
      return;
    }
  }

  static async updateTipoServico(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateTipoServico(
        id,
        req.body
      );
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar tipo de serviço.' });

      return;
    }
  }

  static async deleteTipoServico(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteTipoServico(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir tipo de serviço.' });
      return;
    }
  }

  // Origem CST
  static async getOrigemCST(req: Request, res: Response) {
    try {
      const origemCST = await CadastrosSistemaService.getOrigemCST();
      res.status(200).json(origemCST);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter origem CST.' });
      return;
    }
  }

  static async createOrigemCST(req: Request, res: Response) {
    try {
      const origemCST = await CadastrosSistemaService.createOrigemCST(req.body);
      res.status(201).json(origemCST);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar origem CST.' });
      return;
    }
  }

  static async updateOrigemCST(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateOrigemCST(
        id,
        req.body
      );
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar origem CST.' });
      return;
    }
  }

  static async deleteOrigemCST(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteOrigemCST(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir origem CST.' });
      return;
    }
  }

  // CST
  static async getCST(req: Request, res: Response) {
    try {
      const cst = await CadastrosSistemaService.getCST();
      res.status(200).json(cst);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter CST.' });
      return;
    }
  }

  static async createCST(req: Request, res: Response) {
    try {
      const cst = await CadastrosSistemaService.createCST(req.body);
      res.status(201).json(cst);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar CST.' });
      return;
    }
  }

  static async updateCST(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateCST(id, req.body);
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar CST.' });
      return;
    }
  }

  static async deleteCST(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteCST(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir CST.' });
      return;
    }
  }

  // CFOP
  static async getCFOP(req: Request, res: Response) {
    try {
      const { fl_fit_entrada, fl_fit_saida, fl_fit_cte, fl_fit_nfe } =
        req.query;

      const filters: any = {};

      if (fl_fit_entrada !== undefined && fl_fit_entrada !== null) {
        filters.fl_fit_entrada = fl_fit_entrada === 'true';
      }
      if (fl_fit_saida !== undefined && fl_fit_saida !== null) {
        filters.fl_fit_saida = fl_fit_saida === 'true';
      }
      if (fl_fit_cte !== undefined && fl_fit_cte !== null) {
        filters.fl_fit_cte = fl_fit_cte === 'true';
      }
      if (fl_fit_nfe !== undefined && fl_fit_nfe !== null) {
        filters.fl_fit_nfe = fl_fit_nfe === 'true';
      }

      const cfop = await CadastrosSistemaService.getCFOP(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.status(200).json(cfop);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter CFOP.' });
      return;
    }
  }

  static async getCFOPPaginacao(req: Request, res: Response) {
    try {
      const {
        search,
        fl_fit_entrada,
        fl_fit_saida,
        fl_fit_cte,
        fl_fit_nfe,
      } = req.query;

      const pagination = validatePagination(req);

      const filters: any = {};

      if (fl_fit_entrada !== undefined && fl_fit_entrada !== null) {
        filters.fl_fit_entrada = fl_fit_entrada === 'true';
      }
      if (fl_fit_saida !== undefined && fl_fit_saida !== null) {
        filters.fl_fit_saida = fl_fit_saida === 'true';
      }
      if (fl_fit_cte !== undefined && fl_fit_cte !== null) {
        filters.fl_fit_cte = fl_fit_cte === 'true';
      }
      if (fl_fit_nfe !== undefined && fl_fit_nfe !== null) {
        filters.fl_fit_nfe = fl_fit_nfe === 'true';
      }

      const result = await CadastrosSistemaService.getCFOPPaginacao(
        pagination.page,
        pagination.pageSize,
        (search as string) || '',
        Object.keys(filters).length > 0 ? filters : undefined
      );

      res.status(200).json(result);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao obter CFOP paginado.' });
      return;
    }
  }

  static async createCFOP(req: Request, res: Response) {
    try {
      const cfop = await CadastrosSistemaService.createCFOP(req.body);
      res.status(201).json(cfop);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar CFOP.' });
      return;
    }
  }

  static async updateCFOP(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await CadastrosSistemaService.updateCFOP(id, req.body);
      res.status(200).json(updated);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar CFOP.' });
      return;
    }
  }

  static async deleteCFOP(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await CadastrosSistemaService.deleteCFOP(id);
      res.status(200).json(deleted);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir CFOP.' });
      return;
    }
  }
}
