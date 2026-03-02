import { Request, Response } from 'express';
import * as NotasFiscaisService from '../../services/fiscal/nota-fiscal.service';
import { xmlNotaFiscalServico } from '@/services/fiscal/onvio/gerar-xml.service';
import {
  enviarListaXmlParaOnvio,
  enviarXmlParaOnvio,
} from '@/services/fiscal/onvio/envio-xml.service';

export class FiscalNotaFiscalController {
  static async getNotasFiscais(req: Request, res: Response): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const notas = await NotasFiscaisService.getNotasFiscais(empresaId);
      return res.status(200).json(notas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter notas fiscais.' });
    }
  }

  static async getNotaFiscalById(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const nota = await NotasFiscaisService.getNotaFiscalById(empresaId, id);
      if (!nota) {
        return res.status(404).json({ error: 'Nota não encontrada.' });
      }
      return res.status(200).json(nota);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter nota fiscal.' });
    }
  }

  static async sincronizarDominioByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { competencia } = req.body;
      const notas = await NotasFiscaisService.sincronizarDominioNfseByEmpresaId(
        empresaId,
        competencia
      );
      return res.status(200).json(notas);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar com o Dominio.' });
    }
  }

  static async sincronizarDominioNfeByEmpresaId(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const { competencia } = req.body;
      const resultado =
        await NotasFiscaisService.sincronizarDominioNfeByEmpresaId(
          empresaId,
          competencia,
          usuarioId
        );
      return res.status(200).json(resultado);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar NFe com o Dominio.' });
    }
  }

  static async sincronizarDominioCtePorEmpresa(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const { competencia } = req.body;
      const resultado = await NotasFiscaisService.sincronizarCteDominio(
        empresaId,
        competencia,
        usuarioId
      );
      return res.status(200).json(resultado);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar CTe com o Dominio.' });
    }
  }

  static async xmlNotaFiscalServico(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const notaGerada = await xmlNotaFiscalServico(empresaId, id);
      if (!notaGerada) {
        return res.status(404).json({ error: 'Nota não gerada.' });
      }
      return res.status(200).json(notaGerada);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar nota fiscal.' });
    }
  }

  static async integrarListaNotaFiscalServico(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { notaFiscalIDs } = req.body;
      const resultados = await enviarListaXmlParaOnvio(
        empresaId,
        notaFiscalIDs
      );
      return res.status(200).json(resultados);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar notas fiscais.' });
    }
  }

  static async integrarNotaFiscalServico(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { id } = req.params;
      const notaIntegrada = await enviarXmlParaOnvio(empresaId, id);
      if (!notaIntegrada) {
        return res.status(404).json({ error: 'Nota não integrada.' });
      }
      return res.status(200).json(notaIntegrada);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao enviar nota fiscal.' + error.message });
    }
  }

  static async createNotaFiscal(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const usuarioId = req['usuarioId'];
      const nota = await NotasFiscaisService.createNotaFiscal(
        empresaId,
        req.body,
        usuarioId
      );
      return res.status(201).json(nota);
    } catch (error) {
      console.error(error);

      if (
        error.message ===
        'Já existe uma nota fiscal com este número para esta empresa.'
      ) {
        return res.status(409).json({
          error:
            'Já existe uma nota fiscal com este número para esta empresa. (Nota: números como "01" e "1" são considerados idênticos)',
          code: 'DUPLICATE_ENTRY',
        });
      }

      return res.status(500).json({ error: 'Erro ao criar nota fiscal.' });
    }
  }

  static async updateNotaFiscal(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const updated = await NotasFiscaisService.updateNotaFiscal(
        empresaId,
        id,
        req.body
      );
      return res.status(200).json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar nota fiscal.' });
    }
  }

  static async deleteNotaFiscal(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id } = req.params;
      const empresaId = req['empresaId'];
      const deleted = await NotasFiscaisService.deleteNotaFiscal(empresaId, id);
      return res.status(200).json(deleted);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir nota fiscal.' });
    }
  }
  static async sincronizarDominioVerfNotas(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const empresaId = req['empresaId'];
      const { competencia } = req.body;
      const notas = await NotasFiscaisService.sincronizarDominioVerfNotas(
        empresaId,
        competencia
      );
      return res.status(200).json(notas);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: 'Erro ao sincronizar com o Dominio.' });
    }
  }
  static async getChavesXml(req: Request, res: Response): Promise<Response> {
    try {
      const { ano, id_escritorio, documento_escritorio } = req.body;

      if (!ano) {
        return res.status(400).json({ error: 'Parâmetro "ano" é obrigatório' });
      }

      const chaves = await NotasFiscaisService.getChavesXml(
        ano,
        id_escritorio,
        documento_escritorio
      );

      if (chaves && (chaves as any).error) {
        const err = (chaves as any).error;
        // Escritório não encontrado -> 404
        if (
          typeof err === 'string' &&
          err.includes('Escritório não encontrado')
        ) {
          return res.status(404).json({ error: err });
        }

        // Outros erros retornados pelo serviço -> 500
        return res
          .status(500)
          .json({ error: 'Erro ao obter chaves XML', details: String(err) });
      }

      const { chavesNfe = [], chavesCte = [] } = chaves as any;

      // Sem conteúdo -> 204 No Content
      if (
        (!chavesNfe || chavesNfe.length === 0) &&
        (!chavesCte || chavesCte.length === 0)
      ) {
        return res.status(204).send();
      }

      return res.status(200).json({ chavesNfe, chavesCte });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : String(error);
      return res
        .status(500)
        .json({ error: 'Erro ao obter chaves XML.', details: message });
    }
  }
}
