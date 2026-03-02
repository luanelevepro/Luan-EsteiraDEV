/**
 * Sincroniza dados extraídos do parse (ds_raw) para as tabelas de destino:
 * - Atualiza fis_cte/fis_nfe com campos que ainda estejam nulos
 * - Faz upsert em tms_embarcadores a partir do expedidor do CT-e
 *
 * Usado na importação de XML e no parse on-demand (parseDocumentosParaCarga).
 */

import { prisma } from '@/services/prisma';

/** DTO do parser CT-e (campos usados para sync) */
export interface CteDtoForSync {
  exped_CNPJ?: string;
  exped_xNome?: string;
  rem_CNPJ?: string;
  rem_xNome?: string;
  rem_endereco?: string;
  rem_complemento?: string;
  receb_CNPJ?: string;
  receb_xNome?: string;
  dest_CNPJ?: string;
  dest_xNome?: string;
  dest_endereco?: string;
  dest_complemento?: string;
  receb_endereco?: string;
  receb_complemento?: string;
  /** Tomador canônico (toma3 ou toma4) */
  toma_CNPJ?: string;
  toma_xNome?: string;
  toma_CPF?: string;
  vl_mercadoria_carga?: string;
  ds_produto_predominante?: string;
}

const DS_ORIGEM_CADASTRO = 'XML';

/**
 * Obtém id_tms_empresa a partir do id do fis_cte (emitente ou subcontratada).
 */
export async function getIdTmsEmpresaFromCteId(cteId: string): Promise<string | null> {
  const cte = await prisma.fis_cte.findUnique({
    where: { id: cteId },
    select: {
      id_fis_empresa_emitente: true,
      id_fis_empresa_subcontratada: true,
      fis_empresa_emitente: { select: { id_sis_empresas: true } },
      fis_empresa_subcontratada: { select: { id_sis_empresas: true } },
    },
  });
  if (!cte) return null;
  const idSisEmpresas =
    cte.fis_empresa_emitente?.id_sis_empresas ??
    cte.fis_empresa_subcontratada?.id_sis_empresas ??
    null;
  if (!idSisEmpresas) return null;
  const tmsEmpresa = await prisma.tms_empresas.findUnique({
    where: { id_sis_empresas: idSisEmpresas },
    select: { id: true },
  });
  return tmsEmpresa?.id ?? null;
}

/**
 * Upsert tms_embarcadores a partir do expedidor (e fallback remetente) do CT-e.
 * Usado após import ou quando temos apenas o registro fis_cte.
 */
export async function syncTmsEmbarcadorFromFisCte(cteId: string): Promise<void> {
  const cte = await prisma.fis_cte.findUnique({
    where: { id: cteId },
    select: {
      ds_razao_social_expedidor: true,
      ds_documento_expedidor: true,
      ds_razao_social_remetente: true,
      ds_documento_remetente: true,
    },
  });
  if (!cte) return;

  const nome = cte.ds_razao_social_expedidor ?? cte.ds_razao_social_remetente;
  const documento =
    (cte.ds_documento_expedidor ?? cte.ds_documento_remetente ?? '').trim() || null;
  if (!nome) return;

  const idTmsEmpresa = await getIdTmsEmpresaFromCteId(cteId);
  if (!idTmsEmpresa) return;

  await upsertTmsEmbarcador(idTmsEmpresa, {
    ds_nome: nome,
    ds_documento: documento,
  });
}

/**
 * Faz upsert em tms_embarcadores (unique por id_tms_empresa + ds_documento).
 */
export async function upsertTmsEmbarcador(
  idTmsEmpresa: string,
  data: { ds_nome: string; ds_documento?: string | null; ds_ie?: string | null }
): Promise<void> {
  const doc = (data.ds_documento ?? '').trim() || null;
  if (doc) {
    await prisma.tms_embarcadores.upsert({
      where: {
        id_tms_empresa_ds_documento: {
          id_tms_empresa: idTmsEmpresa,
          ds_documento: doc,
        },
      },
      create: {
        id_tms_empresa: idTmsEmpresa,
        ds_nome: data.ds_nome,
        ds_documento: doc,
        ds_ie: data.ds_ie ?? undefined,
        ds_origem_cadastro: DS_ORIGEM_CADASTRO,
      },
      update: {
        ds_nome: data.ds_nome,
        ds_ie: data.ds_ie ?? undefined,
      },
    });
  } else {
    const existing = await prisma.tms_embarcadores.findFirst({
      where: { id_tms_empresa: idTmsEmpresa, ds_nome: data.ds_nome },
    });
    if (!existing) {
      await prisma.tms_embarcadores.create({
        data: {
          id_tms_empresa: idTmsEmpresa,
          ds_nome: data.ds_nome,
          ds_ie: data.ds_ie ?? undefined,
          ds_origem_cadastro: DS_ORIGEM_CADASTRO,
        },
      });
    }
  }
}

/**
 * Atualiza fis_cte apenas em campos que estejam nulos no banco e preenchidos no DTO.
 * Se idTmsEmpresa for informado, faz upsert de tms_embarcadores a partir do expedidor do DTO.
 */
export async function syncCteFromDto(
  idCte: string,
  dto: CteDtoForSync,
  idTmsEmpresa: string | null
): Promise<void> {
  const current = await prisma.fis_cte.findUnique({
    where: { id: idCte },
    select: {
      ds_razao_social_tomador: true,
      ds_documento_tomador: true,
      ds_razao_social_recebedor: true,
      ds_documento_recebedor: true,
      ds_razao_social_destinatario: true,
      ds_razao_social_expedidor: true,
      ds_documento_expedidor: true,
      ds_endereco_destino: true,
      ds_complemento_destino: true,
      ds_endereco_remetente: true,
      ds_complemento_remetente: true,
    },
  });
  if (!current) return;

  const updateData: Record<string, unknown> = {};
  const tomadorDoc = (dto.toma_CNPJ || dto.toma_CPF || '').trim() || undefined;
  const tomadorNome = dto.toma_xNome?.trim();
  // Sempre que o DTO trouxer tomador (toma3/toma4), garantir que o fis_cte seja preenchido/atualizado
  if (tomadorNome) {
    updateData.ds_razao_social_tomador = tomadorNome;
  }
  if (tomadorDoc) {
    updateData.ds_documento_tomador = tomadorDoc;
  }
  if (!current.ds_razao_social_recebedor && (dto.receb_xNome || dto.receb_CNPJ)) {
    updateData.ds_razao_social_recebedor = dto.receb_xNome ?? undefined;
    updateData.ds_documento_recebedor = dto.receb_CNPJ ?? undefined;
  }
  if (!current.ds_razao_social_destinatario && dto.dest_xNome) {
    updateData.ds_razao_social_destinatario = dto.dest_xNome;
  }
  if (!current.ds_razao_social_expedidor && (dto.exped_xNome || dto.exped_CNPJ)) {
    updateData.ds_razao_social_expedidor = dto.exped_xNome ?? undefined;
    updateData.ds_documento_expedidor = dto.exped_CNPJ ?? undefined;
  }
  const enderecoDestino = (dto.receb_endereco || dto.dest_endereco)?.trim();
  const complementoDestino = (dto.receb_complemento || dto.dest_complemento)?.trim();
  if (!current.ds_endereco_destino && enderecoDestino) {
    updateData.ds_endereco_destino = enderecoDestino;
  }
  if (!current.ds_complemento_destino && complementoDestino) {
    updateData.ds_complemento_destino = complementoDestino;
  }
  const enderecoRemetente = dto.rem_endereco?.trim();
  const complementoRemetente = dto.rem_complemento?.trim();
  if (!current.ds_endereco_remetente && enderecoRemetente) {
    updateData.ds_endereco_remetente = enderecoRemetente;
  }
  if (!current.ds_complemento_remetente && complementoRemetente) {
    updateData.ds_complemento_remetente = complementoRemetente;
  }
  if (Object.keys(updateData).length > 0) {
    await prisma.fis_cte.update({
      where: { id: idCte },
      data: updateData as any,
    });
  }

  const nome = dto.exped_xNome || dto.exped_CNPJ || dto.rem_xNome || dto.rem_CNPJ;
  if (idTmsEmpresa && nome) {
    await upsertTmsEmbarcador(idTmsEmpresa, {
      ds_nome: nome,
      ds_documento: dto.exped_CNPJ ?? dto.rem_CNPJ ?? undefined,
    });
  }
}
