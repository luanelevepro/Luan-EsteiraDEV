import { Request, Response } from 'express';
import * as classificacaoService from '../../services/reforma-tributaria/classificacaoProdutos.service';

/**
 * POST /api/reforma-tributaria/classificacao-produtos/sincronizar
 * Sincroniza classificação tributária dos produtos da empresa
 */
export const sincronizarClassificacao = async (req: Request, res: Response) => {
  try {
    const empresaId = req['empresaId'] as string | undefined;

    if (!empresaId) {
      return res.status(401).json({
        mensagem: 'Empresa não selecionada. Selecione uma empresa para sincronizar.',
      });
    }

    const resultado = await classificacaoService.sincronizarClassificacaoProdutos(empresaId);
    
    return res.status(200).json({
      success: true,
      mensagem: `Sincronização concluída. ${resultado.sincronizados} produtos processados.`,
      ...resultado,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar classificação de produtos:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Erro interno ao sincronizar classificação de produtos',
    });
  }
};

/**
 * GET /api/reforma-tributaria/classificacao-produtos
 * Lista produtos com classificação tributária (paginado)
 */
export const listarProdutosClassificados = async (req: Request, res: Response) => {
  try {
    const empresaId = req['empresaId'] as string | undefined;

    if (!empresaId) {
      return res.status(401).json({
        mensagem: 'Empresa não selecionada. Selecione uma empresa para listar os produtos.',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string | undefined;
    const statusParam = req.query.status as string | undefined;
    const tipoItemParam = req.query.tipo_item as string | undefined;
    const cdCstParam = req.query.cd_cst as string | undefined;
    const cdClassTribParam = req.query.cd_class_trib as string | undefined;
    const flNcmEncontradoParam = req.query.fl_ncm_encontrado as string | undefined;
    const flConfirmadoParam = req.query.fl_confirmado_usuario as string | undefined;
    const orderColumn = req.query.orderColumn as string | undefined;
    const orderBy = req.query.orderBy as 'asc' | 'desc' | undefined;

    const status = statusParam ? statusParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const ds_tipo_item = tipoItemParam
      ? tipoItemParam
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n))
      : undefined;
    const cd_cst = cdCstParam ? cdCstParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const cd_class_trib = cdClassTribParam ? cdClassTribParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
    const fl_ncm_encontrado = flNcmEncontradoParam
      ? flNcmEncontradoParam.split(',').map((s) => {
          const trimmed = s.trim();
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          return null;
        }).filter((b): b is boolean => b !== null)
      : undefined;
    const fl_confirmado_usuario = flConfirmadoParam
      ? flConfirmadoParam.split(',').map((s) => {
          const trimmed = s.trim();
          if (trimmed === 'true') return true;
          if (trimmed === 'false') return false;
          return null;
        }).filter((b): b is boolean => b !== null)
      : undefined;

    const resultado = await classificacaoService.listarProdutosClassificados(
      empresaId,
      page,
      limit,
      search,
      status,
      ds_tipo_item,
      cd_cst,
      cd_class_trib,
      fl_ncm_encontrado,
      fl_confirmado_usuario,
      orderColumn,
      orderBy
    );

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro ao listar produtos classificados:', error);
    return res.status(500).json({ 
      error: error.message || 'Erro interno ao listar produtos classificados',
    });
  }
};

/**
 * GET /api/reforma-tributaria/classificacao-produtos/classificacoes-por-ncm
 * Lista todas as classificações tributárias disponíveis para um NCM específico
 */
export const listarClassificacoesPorNcm = async (req: Request, res: Response) => {
  try {
    const ncm = req.query.ncm as string | undefined;
    
    if (!ncm) {
      return res.status(400).json({ error: 'Parâmetro NCM é obrigatório' });
    }

    const classificacoes = await classificacaoService.listarClassificacoesPorNcm(ncm);
    return res.status(200).json(classificacoes);
  } catch (error: any) {
    console.error('Erro ao listar classificações por NCM:', error);
    return res.status(500).json({ error: error.message || 'Erro ao buscar classificações' });
  }
};

/**
 * PUT /api/reforma-tributaria/classificacao-produtos/:produtoId
 * Atualiza classificação tributária manualmente
 */
export const atualizarClassificacaoManual = async (req: Request, res: Response) => {
  try {
    const { produtoId } = req.params;
    const empresaId = req['empresaId'] as string | undefined;

    if (!empresaId) {
      return res.status(401).json({ error: 'Empresa não identificada' });
    }

    const {
      cd_class_trib,
      cd_cst,
      ds_class_trib_descr,
      ds_tipo_aliquota,
      ds_anexo_numero,
      ds_anexo_descricao,
      ds_anexo_numero_item,
      ds_anexo_texto_item,
    } = req.body;

    if (!cd_class_trib) {
      return res.status(400).json({ error: 'cd_class_trib é obrigatório' });
    }

    const resultado = await classificacaoService.atualizarClassificacaoManual(
      produtoId,
      {
        cd_class_trib,
        cd_cst,
        ds_class_trib_descr,
        ds_tipo_aliquota,
        ds_anexo_numero,
        ds_anexo_descricao,
        ds_anexo_numero_item,
        ds_anexo_texto_item,
      },
      empresaId
    );

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro ao atualizar classificação:', error);
    return res.status(500).json({ error: error.message || 'Erro ao atualizar classificação' });
  }
};
