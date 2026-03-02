import { Request, Response } from 'express';
import * as DocumentoService from '../../services/fiscal/documento.service';

export class DocumentoController {
  static async getNfeDocumento(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const documento = await DocumentoService.getNfeDocumento(id);
      return res.status(200).json(documento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter documento. ' + error.message });
    }
  }
  static async getCteDocumento(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const documento = await DocumentoService.getCteDocumento(id);
      return res.status(200).json(documento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter documento. ' + error.message });
    }
  }
  static async getNfseDocumento(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const documento = await DocumentoService.getNfseDocumento(id);
      return res.status(200).json(documento);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter documento. ' + error.message });
    }
  }
  static async getDocumentosPaginacao(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const {
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'dt_emissao',
        search = '',
        date = '',
        status = '',
        tipos = '',
      } = req.query;
      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];
      const tiposArray = tipos
        ? (tipos as string).split(',').map((s) => s.trim())
        : [];
      const paginacao = await DocumentoService.getDocumentosPaginacao(
        empresaId as string,
        Number(page),
        Number(pageSize),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        date as string,
        statusArray,
        tiposArray
      );

      return res.status(200).json(paginacao);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter produtos. ' + error.message });
    }
  }
  static async getDocumentosSaidaPaginacao(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const {
        page = 1,
        pageSize = 10,
        orderBy = 'asc',
        orderColumn = 'dt_emissao',
        search = '',
        date = '',
        status = '',
        tipos = '',
      } = req.query;
      const statusArray = status
        ? (status as string).split(',').map((s) => s.trim())
        : [];
      const tiposArray = tipos
        ? (tipos as string).split(',').map((s) => s.trim())
        : [];
      const paginacao = await DocumentoService.getDocumentosSaidaPaginacao(
        empresaId as string,
        Number(page),
        Number(pageSize),
        orderBy as 'asc' | 'desc',
        orderColumn as string,
        search as string,
        date as string,
        statusArray,
        tiposArray
      );

      return res.status(200).json(paginacao);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter produtos. ' + error.message });
    }
  }
  static async getItensNfe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const itens = await DocumentoService.getItensNfe(id);
      return res.status(200).json(itens);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter itens da NFE. ' + error.message });
    }
  }
  static async getAlteracoesNfe(req: Request, res: Response) {
    try {
      const { id } = req.params; // id da NFe
      const alteracoes = await DocumentoService.getAlteracoesNfe(id);
      return res.status(200).json(alteracoes);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter alterações da NFE. ' + error.message });
    }
  }

  static async getAlteracoesPorItem(req: Request, res: Response) {
    try {
      const { id } = req.params; // id do item
      const alteracoes = await DocumentoService.getAlteracoesPorItem(id);
      return res.status(200).json(alteracoes);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter alterações do item. ' + error.message });
    }
  }
  static async insertItensAlterNfe(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const body = req.body || {};

      if (Array.isArray(body.itens)) {
        const results = [] as any[];
        for (const it of body.itens) {
          const payload = { ...it, id_nfe: body.id_nfe, id_empresa: empresaId };
          const r = await DocumentoService.insertItensAlterNfe(payload);
          results.push(r);
        }
        return res.status(200).json({ message: 'OK', data: results });
      }

      const payload = { ...body, id_empresa: empresaId };
      const result = await DocumentoService.insertItensAlterNfe(payload);
      return res.status(200).json({ message: 'OK', data: result });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao alterar item da NFE. ' + error.message });
    }
  }

  static async testarXmlNfe(req: Request, res: Response): Promise<Response> {
    try {
      const { id_nfe } = req.params;
      const teste = await DocumentoService.testarXmlNfe(id_nfe);
      return res.status(200).json({ data: teste });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao testar XML da NFE. ' + error.message });
    }
  }

  static async integrarNfeEntradaDominio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const { id_nfe, dt_competencia } = req.body;
      if (!Array.isArray(id_nfe) || id_nfe.length === 0) {
        return res
          .status(400)
          .json({ error: 'O campo id_nfe deve ser um array não vazio.' });
      }

      const resultados = [];
      const resultado = await DocumentoService.integrarNfeEntrada(
        empresaId,
        id_nfe,
        dt_competencia,
        usuarioId
      );
      if (resultado === 400) {
        return res.status(400).json({
          error:
            'Nenhuma NFe apta para integração. Verifique os status das NFe selecionadas.',
        });
      }
      resultados.push({ id_nfe: id_nfe[0], resultado });

      return res
        .status(200)
        .json({ message: 'Integração concluída', resultados });
    } catch (error) {
      console.error(error);
      const errorMessage = error?.message || '';
      const errorType = (error as any)?.type;
      const statusCode = (error as any)?.statusCode;

      // Erro específico de código de produto
      if (errorType === 'PRODUCT_CODE_ERROR' || statusCode === 422) {
        return res.status(422).json({
          error: 'Problema ao gerar código para produto',
          details: errorMessage.replace(/\[.*?\]\s*/, ''),
          type: 'PRODUCT_CODE_ERROR',
        });
      }

      // Erro 502 Bad Gateway
      if (
        errorMessage.includes('502 Bad Gateway') ||
        errorMessage.includes('Erro 502')
      ) {
        return res.status(502).json({
          error:
            'Erro ao integrar NFe de entrada na Domínio. ' +
            errorMessage.replace('Erro 502', ''),
        });
      }

      return res.status(500).json({
        error: 'Erro ao integrar NFe de entrada na Domínio. ' + errorMessage,
      });
    }
  }

  static async reverterNfeEntradaDominio(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const { ids, dt_competencia } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res
          .status(400)
          .json({ error: "O campo 'ids' deve ser um array não vazio." });
      }

      const resultado = await DocumentoService.reverterNfeEntrada(
        empresaId,
        ids,
        dt_competencia,
        usuarioId
      );

      return res.status(200).json({ message: 'Reversão concluída', resultado });
    } catch (error) {
      console.error(error);
      // Verifica se é erro 502 Bad Gateway
      const errorMessage = error?.message || '';
      if (
        errorMessage.includes('502 Bad Gateway') ||
        errorMessage.includes('Erro 502')
      ) {
        return res.status(502).json({
          error: 'Erro ao reverter NFe de entrada no domínio. ' + errorMessage,
        });
      }
      return res.status(500).json({
        error: 'Erro ao reverter NFe de entrada no domínio. ' + errorMessage,
      });
    }
  }

  static async updateDtSaidaEntrega(req: Request, res: Response) {
    try {
      const { id_nfe } = req.params;
      const { dtSaida } = req.body || {};

      if (!dtSaida) {
        return res.status(400).json({
          error: "O campo 'dtSaida' é obrigatório no corpo da requisição",
        });
      }

      const atualizado = await DocumentoService.updateDtSaidaEntrega(
        id_nfe,
        dtSaida
      );

      return res.status(200).json({ message: 'OK', data: atualizado });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          'Erro ao atualizar dt_saida_entrega da NFe. ' +
          (error as any).message,
      });
    }
  }

  static async setDocumentoOperacaoNaoRealizada(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req['usuarioId'];
      const body = req.body || {};

      const items = Array.isArray(body.items) ? body.items : body;

      if (!Array.isArray(items) || items.length === 0) {
        return res
          .status(400)
          .json({ error: "O campo 'items' deve ser um array não vazio." });
      }

      const resultado = await DocumentoService.setDocumentoOperacaoNaoRealizada(
        items,
        usuarioId
      );

      return res.status(200).json({ message: 'OK', resultado });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          'Erro ao marcar documentos como operação não realizada. ' +
          (error as any).message,
      });
    }
  }

  // ======================== SUBCONTRATAÇÃO CTe ========================

  static async updateDocumentoSubContratadoOwner(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const usuarioId = req['usuarioId'];
      const { documentoId, ds_motivo, empresaId } = req.body;

      if (!documentoId) {
        return res.status(400).json({ error: 'documentoId é obrigatório' });
      }
      if (!ds_motivo) {
        return res.status(400).json({ error: 'ds_motivo é obrigatório' });
      }

      await DocumentoService.updateDocumentoSubContratadoOwner({
        empresaId,
        documentoId,
        ds_motivo,
        usuarioId,
      });

      return res.status(200).json({
        message: 'Alteração de subcontratação registrada com sucesso',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          'Erro ao alterar subcontratação do documento. ' +
          (error as any).message,
      });
    }
  }

  static async patchSituacaoAlteracaoCte(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id_alteracao } = req.params;
      const usuarioId = req['usuarioId'];
      const { situacao, ds_observacao } = req.body;

      if (!situacao) {
        return res.status(400).json({ error: 'situacao é obrigatória' });
      }

      await DocumentoService.patchSituacaoAlteracaoCte({
        id_alteracao,
        situacao,
        ds_observacao,
        id_usuario_aprovador: usuarioId,
      });

      return res
        .status(200)
        .json({ message: 'Situação da alteração atualizada com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          'Erro ao atualizar situação da alteração. ' + (error as any).message,
      });
    }
  }

  static async revertAlteracaoSubcontratacaoCte(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id_alteracao } = req.params;
      const usuarioId = req['usuarioId'];
      const { situacao, ds_observacao } = req.body;

      if (!situacao) {
        return res.status(400).json({ error: 'situacao é obrigatória' });
      }

      await DocumentoService.revertAlteracaoSubcontratacaoCte({
        id_alteracao,
        situacao,
        ds_observacao,
        id_usuario_aprovador: usuarioId,
      });

      return res
        .status(200)
        .json({ message: 'Alteração de subcontratação revertida com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error:
          'Erro ao reverter alteração de subcontratação. ' +
          (error as any).message,
      });
    }
  }

  static async getRelacionadosDocumento(req: Request, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      if (!empresaId) {
        return res.status(400).json({ error: 'empresaId não informado' });
      }
      if (!id) {
        return res.status(400).json({ error: 'id do documento não informado' });
      }
      const result = await DocumentoService.getRelacionadosDocumento({
        empresaId: empresaId,
        documentoId: id,
      });
      return res.json(result);
    } catch (err) {
      return res.status(500).json({
        error: 'Erro ao buscar documentos relacionados',
        details: err?.message || err,
      });
    }
  }

  static async setCtesContra(req: Request, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const { competencia } = req.body || {};
      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }
      await DocumentoService.setCtesContra({ empresaId, competencia });
      return res.status(200).json({ message: 'OK' });
    } catch (err: any) {
      console.error('setCtesContra error:', err);
      return res.status(500).json({ error: err.message || err });
    }
  }

  static async setNfesProcessados(req: Request, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const { competencia } = req.body || {};
      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }
      await DocumentoService.setNfesProcessados({ empresaId, competencia });
      return res.status(200).json({ message: 'OK' });
    } catch (err: any) {
      console.error('setNfesProcessados error:', err);
      return res.status(500).json({ error: err.message || err });
    }
  }

  static async setNfesRelacionadasProcessados(req: Request, res: Response) {
    try {
      const empresaId = req['empresaId'];
      const { competencia } = req.body || {};
      if (!empresaId || !competencia) {
        return res
          .status(400)
          .json({ error: 'empresaId e competencia são obrigatórios' });
      }
      await DocumentoService.setNfesRelacionadasProcessados({
        empresaId,
        competencia,
      });
      return res.status(200).json({ message: 'OK' });
    } catch (err: any) {
      console.error('setNfesRelacionadasProcessados error:', err);
      return res.status(500).json({ error: err.message || err });
    }
  }

  static async setOrUnsetArquivado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ error: 'id é obrigatório' });
      }
      await DocumentoService.setOrUnsetArquivado({ documentoId: id });
      return res
        .status(200)
        .json({ message: 'Documento arquivado com sucesso' });
    } catch (err: any) {
      console.error('setAsArquivado error:', err);
      return res.status(500).json({ error: err.message || err });
    }
  }
}
