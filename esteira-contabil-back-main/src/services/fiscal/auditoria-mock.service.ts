/**
 * Service de Auditoria Fiscal - MOCK DATA
 * Este service simula os dados das tabelas:
 * - fis_auditoria_doc
 * - fis_tipo_inconsistencia
 * - fis_auditoria_doc_incons
 * - fis_execucao_auditoria
 */

export type TipoDocumento = 'NFE' | 'NFSE' | 'CTE' | 'NFCE';
export type AuditoriaStatusTecnico = 'OK' | 'INCONSISTENTE';
export type AuditoriaStatusOperacional =
  | 'ABERTA'
  | 'EM_ANALISE'
  | 'RESOLVIDA'
  | 'IGNORADA';
export type CriticidadeLevel = 'INFO' | 'AVISO' | 'CRITICA';
export type StatusTratativa =
  | 'ABERTA'
  | 'EM_TRATAMENTO'
  | 'AJUSTADA'
  | 'JUSTIFICADA'
  | 'IGNORADA';

export interface FisAuditoriaDoc {
  id: string;
  dt_created: Date;
  dt_updated: Date;
  id_execucao_auditoria?: string;
  id_fis_documento: string;
  ds_chave?: string;
  ds_tipo_doc: TipoDocumento;
  dt_emissao?: Date;
  ds_cnpj_emitente?: string;
  ds_cnpj_destinatario?: string;
  vl_documento?: number;
  status_tecnico: AuditoriaStatusTecnico;
  status_operacional: AuditoriaStatusOperacional;
  qtde_inconsistencias?: number;
  nivel_criticidade_max?: CriticidadeLevel;
  js_meta?: any;
  js_inconsistencias?: any;
  id_nfe?: string;
  id_nfse?: string;
  id_cte?: string;
  // Campos adicionais para o mock
  ds_razao_social_emitente?: string;
  ds_razao_social_destinatario?: string;
}

export interface FisTipoInconsistencia {
  id: string;
  dt_created: Date;
  dt_updated: Date;
  cd_codigo: string;
  ds_descricao: string;
  criticidade_padrao: CriticidadeLevel;
  ds_grupo?: string;
  fl_ativo: boolean;
  ds_ordem_exibicao?: number;
  versao_regra?: string;
  dt_inicio_vigencia?: Date;
  dt_fim_vigencia?: Date;
}

export interface FisAuditoriaDocIncons {
  id: string;
  dt_created: Date;
  id_auditoria_doc: string;
  id_tipo_inconsistencia?: string;
  ds_campo_impactado?: string;
  ds_valor_encontrado?: string;
  ds_valor_esperado?: string;
  ds_mensagem_detalhada?: string;
  criticidade?: CriticidadeLevel;
  status_tratativa?: StatusTratativa;
  id_usuario_responsavel?: string;
  js_origem?: any;
  vl_impacto_financeiro?: number;
  dt_resolucao?: Date;
}

export interface FisExecucaoAuditoria {
  id: string;
  dt_inicio: Date;
  dt_fim?: Date;
  ds_status_execucao?: string;
  qtde_documentos?: number;
  qtde_inconsistencias?: number;
  id_usuario_execucao?: string;
  js_parametros?: any;
  ds_mensagem_erro?: string;
}

// === DADOS MOCKADOS ===

// Empresas mockadas com relacionamento de escritório (baseado em dados reais do sistema)
// const MOCK_EMPRESAS = [
//   // Escritório ELEVE CONTABILIDADE
//   {
//     id: 'ffa33b6a-1c9c-4a79-a999-1c5bab11c04b',
//     cnpj: '29896278000170',
//     nome: 'ELEVE CONTABILIDADE E GESTAO LTDA',
//     is_escritorio: true,
//     id_escritorio: null,
//   },
//   // Empresas vinculadas ao escritório ELEVE
//   {
//     id: '226a593c-4e2a-46d7-b886-76f7e30082a6',
//     cnpj: '85369254000134',
//     nome: 'COMERCIO E TRANSPORTES FF LTDA',
//     is_escritorio: false,
//     id_escritorio: 'ffa33b6a-1c9c-4a79-a999-1c5bab11c04b',
//   },
//   {
//     id: '71bbe990-8cb1-4f76-8739-6bb4c996e676',
//     cnpj: '30864756000140',
//     nome: 'TRANSPORTES BASEGGIO E DETTENBORN LTDA',
//     is_escritorio: false,
//     id_escritorio: 'ffa33b6a-1c9c-4a79-a999-1c5bab11c04b',
//   },
//   {
//     id: 'c53773eb-d156-4c33-9df2-d619d99637d8',
//     cnpj: '17001779000162',
//     nome: 'CERVEJARIA UNSA BIER LTDA',
//     is_escritorio: false,
//     id_escritorio: 'ffa33b6a-1c9c-4a79-a999-1c5bab11c04b',
//   },
//   {
//     id: '375a7c2e-7fad-45d8-96ce-50d3e64afad5',
//     cnpj: '37257361000128',
//     nome: 'ZAMIANI E CERUTTI SERVICOS LTDA',
//     is_escritorio: false,
//     id_escritorio: 'ffa33b6a-1c9c-4a79-a999-1c5bab11c04b',
//   },
//   // Escritório SCARIOT E SCHAFER
//   {
//     id: '34fb3038-6166-49b3-b63d-26625522cbf4',
//     cnpj: '48885718000139',
//     nome: 'SCARIOT E SCHAFER CONTADORES ASSOCIADOS LTDA',
//     is_escritorio: true,
//     id_escritorio: null,
//   },
//   // Empresas vinculadas ao escritório SCARIOT
//   {
//     id: '89573ee9-916d-438c-9e69-e77a6e18e5a0',
//     cnpj: '11646447000159',
//     nome: 'SANGEN - COMERCIO E TRANSPORTES LTDA',
//     is_escritorio: false,
//     id_escritorio: '34fb3038-6166-49b3-b63d-26625522cbf4',
//   },
// ];

/**
 * Simula findUnique do Prisma para buscar empresa por ID
 * Na implementação real, isso será: prisma.sis_empresas.findUnique({ where: { id: empresaId } })
 */
async function getEmpresaById(empresaId: string) {
  return await prisma.sis_empresas.findUnique({ where: { id: empresaId } });
}

/**
 * Simula findMany do Prisma para buscar empresas vinculadas a um escritório
 * Na implementação real: prisma.sis_empresas.findMany({ where: { id_escritorio: empresaId } })
 */
async function getEmpresasVinculadas(escritorioId: string) {
  return await prisma.sis_empresas.findMany({
    where: { id_escritorio: escritorioId },
  });
}

/**
 * Resolve os CNPJs alvo baseado na empresa selecionada
 * - Se for escritório: retorna CNPJ do escritório + CNPJs de todas empresas vinculadas
 * - Se não for escritório: retorna apenas o CNPJ da empresa
 */
async function resolveTargetCnpjs(empresaId: string): Promise<string[]> {
  const empresa = await getEmpresaById(empresaId);

  if (!empresa) {
    return []; // Empresa não encontrada
  }

  // Se for escritório, buscar todas empresas vinculadas
  if (empresa.is_escritorio) {
    const vinculadas = await getEmpresasVinculadas(empresaId);
    const cnpjsVinculados = vinculadas.map((e) => e.ds_documento);
    return [empresa.ds_documento, ...cnpjsVinculados];
  }

  // Não é escritório, retorna apenas o CNPJ da empresa
  return [empresa.ds_documento];
}

// ==== RESOLUÇÃO REAL VIA PRISMA (quando disponível) ====
import { prisma } from '@/services/prisma';

async function resolveTargetCnpjsFromDB(empresaId: string): Promise<string[]> {
  try {
    if (!empresaId) return [];

    const empresa = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        ds_documento: true,
        is_escritorio: true,
      },
    });
    console.log('Empresa encontrada para resolução de CNPJs:', empresa);

    if (!empresa) return [];

    if (empresa.is_escritorio) {
      console.log('Empresa é um escritório, buscando vinculadas...');
      const vinculadas = await prisma.sis_empresas.findMany({
        where: { id_escritorio: empresaId },
        select: { ds_documento: true },
      });
      const cnpjsVinculados = vinculadas.map((e) => e.ds_documento);
      console.log('Empresas vinculadas encontradas:', vinculadas);
      return [empresa.ds_documento, ...cnpjsVinculados].filter((v) =>
        Boolean(v)
      );
    }

    return [empresa.ds_documento].filter(Boolean);
  } catch (e) {
    // Em caso de qualquer erro na base, retornar vazio para fallback ao mock
    return [];
  }
}

const MOCK_TIPOS_INCONSISTENCIA: FisTipoInconsistencia[] = [
  {
    id: 'tipo-001',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'OMISSAO_ENTRADA',
    ds_descricao: 'Omissão de Entrada - Documento não escriturado',
    criticidade_padrao: 'CRITICA',
    ds_grupo: 'Escrituração',
    fl_ativo: true,
    ds_ordem_exibicao: 1,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-002',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'DIV_VALOR',
    ds_descricao: 'Divergência de Valor entre XML e Escrituração',
    criticidade_padrao: 'AVISO',
    ds_grupo: 'Valores',
    fl_ativo: true,
    ds_ordem_exibicao: 2,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-003',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'DIV_ICMS',
    ds_descricao: 'Divergência de ICMS - Valor calculado incorreto',
    criticidade_padrao: 'CRITICA',
    ds_grupo: 'Impostos',
    fl_ativo: true,
    ds_ordem_exibicao: 3,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-004',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'ALIQUOTA_INCORRETA',
    ds_descricao: 'Alíquota de ICMS incorreta para a operação',
    criticidade_padrao: 'CRITICA',
    ds_grupo: 'Impostos',
    fl_ativo: true,
    ds_ordem_exibicao: 4,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-005',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'ERRO_CADASTRAL',
    ds_descricao: 'Erro Cadastral - Dados divergentes do cadastro',
    criticidade_padrao: 'AVISO',
    ds_grupo: 'Cadastro',
    fl_ativo: true,
    ds_ordem_exibicao: 5,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-006',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'BENEFICIO_FISCAL',
    ds_descricao: 'Benefício Fiscal não informado ou incorreto',
    criticidade_padrao: 'AVISO',
    ds_grupo: 'Benefícios',
    fl_ativo: true,
    ds_ordem_exibicao: 6,
    versao_regra: 'v1.0',
  },
  {
    id: 'tipo-007',
    dt_created: new Date('2025-01-01'),
    dt_updated: new Date('2025-01-01'),
    cd_codigo: 'DIV_RECEITA',
    ds_descricao: 'Divergência de Receita - Classificação incorreta',
    criticidade_padrao: 'INFO',
    ds_grupo: 'Classificação',
    fl_ativo: true,
    ds_ordem_exibicao: 7,
    versao_regra: 'v1.0',
  },
];

const MOCK_EXECUCOES: FisExecucaoAuditoria[] = [
  {
    id: 'exec-001',
    dt_inicio: new Date('2025-12-03T14:00:00'),
    dt_fim: new Date('2025-12-03T14:30:00'),
    ds_status_execucao: 'FINALIZADA',
    qtde_documentos: 1540,
    qtde_inconsistencias: 453,
    id_usuario_execucao: 'user-001',
    js_parametros: { periodo: '04/2025', empresas: ['TODAS'] },
  },
];

const MOCK_DOCUMENTOS: FisAuditoriaDoc[] = [
  {
    id: 'doc-001',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-001',
    ds_chave: '35251201234567000189550010000987451123456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-12-03'),
    ds_cnpj_emitente: '01234567000189',
    ds_cnpj_destinatario: '85369254000134',
    ds_razao_social_emitente: 'FORNECEDOR TESTE LTDA',
    ds_razao_social_destinatario: 'COMERCIO E TRANSPORTES FF LTDA',
    vl_documento: 22521.68,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'ABERTA',
    qtde_inconsistencias: 1,
    nivel_criticidade_max: 'CRITICA',
    js_meta: { referencia: '04/2025', origem: 'Cruzamento XML vs Escrita' },
  },
  {
    id: 'doc-002',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-002',
    ds_chave: '35251201234567000189550010000556481223456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-11-15'),
    ds_cnpj_emitente: '01234567000189',
    ds_cnpj_destinatario: '85369254000134',
    ds_razao_social_emitente: 'FORNECEDOR TESTE LTDA',
    ds_razao_social_destinatario: 'COMERCIO E TRANSPORTES FF LTDA',
    vl_documento: 3500.0,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'ABERTA',
    qtde_inconsistencias: 1,
    nivel_criticidade_max: 'AVISO',
    js_meta: { referencia: '03/2025', origem: 'Validação de Totais' },
  },
  {
    id: 'doc-003',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-003',
    ds_chave: '35251201234567000189550010000645781323456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-10-20'),
    ds_cnpj_emitente: '01234567000189',
    ds_cnpj_destinatario: '85369254000134',
    ds_razao_social_emitente: 'FORNECEDOR TESTE LTDA',
    ds_razao_social_destinatario: 'COMERCIO E TRANSPORTES FF LTDA',
    vl_documento: 1050.0,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'ABERTA',
    qtde_inconsistencias: 1,
    nivel_criticidade_max: 'CRITICA',
    js_meta: { referencia: '02/2025', origem: 'Auditoria de Itens' },
  },
  {
    id: 'doc-004',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-004',
    ds_chave: '35251201234567000189550010000111902423456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-10-15'),
    ds_cnpj_emitente: '01234567000189',
    ds_cnpj_destinatario: '30864756000140',
    ds_razao_social_emitente: 'FORNECEDOR TESTE LTDA',
    ds_razao_social_destinatario: 'TRANSPORTES BASEGGIO E DETTENBORN LTDA',
    vl_documento: 833.65,
    status_tecnico: 'OK',
    status_operacional: 'RESOLVIDA',
    qtde_inconsistencias: 0,
    nivel_criticidade_max: undefined,
    js_meta: { referencia: '02/2025', origem: 'Auditoria NFe' },
  },
  {
    id: 'doc-005',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-005',
    ds_chave: '35251201234567000189570000000882912523456789',
    ds_tipo_doc: 'CTE',
    dt_emissao: new Date('2025-10-15'),
    ds_cnpj_emitente: '01234567000189',
    ds_cnpj_destinatario: '17001779000162',
    ds_razao_social_emitente: 'TRANSPORTADORA TESTE LTDA',
    ds_razao_social_destinatario: 'CERVEJARIA UNSA BIER LTDA',
    vl_documento: 120.0,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'ABERTA',
    qtde_inconsistencias: 1,
    nivel_criticidade_max: 'CRITICA',
    js_meta: { referencia: '02/2025', origem: 'Auditoria CTe' },
  },
  // Adicionar mais documentos para outras empresas
  {
    id: 'doc-006',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-006',
    ds_chave: '35251201234567000189550010000123451623456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-11-28'),
    ds_cnpj_emitente: '98765432000110',
    ds_cnpj_destinatario: '37257361000128',
    ds_razao_social_emitente: 'OUTRO FORNECEDOR LTDA',
    ds_razao_social_destinatario: 'ZAMIANI E CERUTTI SERVICOS LTDA',
    vl_documento: 5890.0,
    status_tecnico: 'OK',
    status_operacional: 'RESOLVIDA',
    qtde_inconsistencias: 0,
    nivel_criticidade_max: undefined,
    js_meta: { referencia: '04/2025', origem: 'Cruzamento XML vs Escrita' },
  },
  {
    id: 'doc-007',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-007',
    ds_chave: '35251201234567000189550010000234562723456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-12-01'),
    ds_cnpj_emitente: '98765432000110',
    ds_cnpj_destinatario: '11646447000159',
    ds_razao_social_emitente: 'OUTRO FORNECEDOR LTDA',
    ds_razao_social_destinatario: 'SANGEN - COMERCIO E TRANSPORTES LTDA',
    vl_documento: 15000.0,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'EM_ANALISE',
    qtde_inconsistencias: 2,
    nivel_criticidade_max: 'CRITICA',
    js_meta: { referencia: '04/2025', origem: 'Cruzamento XML vs Escrita' },
  },
  {
    id: 'doc-008',
    dt_created: new Date('2025-12-03'),
    dt_updated: new Date('2025-12-03'),
    id_execucao_auditoria: 'exec-001',
    id_fis_documento: 'fisdoc-008',
    ds_chave: '35251201234567000189550010000345673823456789',
    ds_tipo_doc: 'NFE',
    dt_emissao: new Date('2025-11-20'),
    ds_cnpj_emitente: '98765432000110',
    ds_cnpj_destinatario: '29896278000170',
    ds_razao_social_emitente: 'OUTRO FORNECEDOR LTDA',
    ds_razao_social_destinatario: 'ELEVE CONTABILIDADE E GESTAO LTDA',
    vl_documento: 20978.82,
    status_tecnico: 'INCONSISTENTE',
    status_operacional: 'ABERTA',
    qtde_inconsistencias: 1,
    nivel_criticidade_max: 'AVISO',
    js_meta: { referencia: '03/2025', origem: 'Validação de Totais' },
  },
];

const MOCK_INCONSISTENCIAS: FisAuditoriaDocIncons[] = [
  {
    id: 'incons-001',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-001',
    id_tipo_inconsistencia: 'tipo-001',
    ds_campo_impactado: 'Escrituração Fiscal',
    ds_valor_encontrado: 'Não localizado na tabela de entradas (EFD/DIME)',
    ds_valor_esperado: 'Registro C100/C190 presente na escrituração',
    ds_mensagem_detalhada:
      'Documento autorizado na SEFAZ mas não escriturado no Livro Fiscal.',
    criticidade: 'CRITICA',
    status_tratativa: 'ABERTA',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 22521.68,
  },
  {
    id: 'incons-002',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-002',
    id_tipo_inconsistencia: 'tipo-002',
    ds_campo_impactado: 'Valor Total da Nota',
    ds_valor_encontrado: 'Valor Escriturado: R$ 3.490,00',
    ds_valor_esperado: 'Valor XML: R$ 3.500,00',
    ds_mensagem_detalhada:
      'Valor contábil escriturado difere do valor total da nota no XML.',
    criticidade: 'AVISO',
    status_tratativa: 'ABERTA',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 10.0,
  },
  {
    id: 'incons-003',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-003',
    id_tipo_inconsistencia: 'tipo-003',
    ds_campo_impactado: 'ICMS do Item 2',
    ds_valor_encontrado: 'Base: R$ 1.000,00 | Alíq: 12% | ICMS: R$ 120,00',
    ds_valor_esperado: 'Base: R$ 1.000,00 | Alíq: 17% | ICMS: R$ 170,00',
    ds_mensagem_detalhada:
      'O valor do ICMS destacado no item 2 está menor que o calculado pela alíquota interna.',
    criticidade: 'CRITICA',
    status_tratativa: 'ABERTA',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 50.0,
  },
  {
    id: 'incons-004',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-005',
    id_tipo_inconsistencia: 'tipo-005',
    ds_campo_impactado: 'CNPJ do Tomador',
    ds_valor_encontrado: 'CNPJ Filial 02',
    ds_valor_esperado: 'CNPJ Matriz',
    ds_mensagem_detalhada: 'CNPJ do tomador difere do cadastro.',
    criticidade: 'CRITICA',
    status_tratativa: 'ABERTA',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 120.0,
  },
  {
    id: 'incons-005',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-007',
    id_tipo_inconsistencia: 'tipo-003',
    ds_campo_impactado: 'ICMS Total',
    ds_valor_encontrado: 'R$ 1.800,00',
    ds_valor_esperado: 'R$ 2.550,00',
    ds_mensagem_detalhada:
      'Valor do ICMS calculado está divergente do esperado.',
    criticidade: 'CRITICA',
    status_tratativa: 'EM_TRATAMENTO',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 750.0,
  },
  {
    id: 'incons-006',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-007',
    id_tipo_inconsistencia: 'tipo-004',
    ds_campo_impactado: 'Alíquota ICMS',
    ds_valor_encontrado: '12%',
    ds_valor_esperado: '17%',
    ds_mensagem_detalhada:
      'Alíquota de ICMS aplicada está incorreta para a operação.',
    criticidade: 'CRITICA',
    status_tratativa: 'EM_TRATAMENTO',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 750.0,
  },
  {
    id: 'incons-007',
    dt_created: new Date('2025-12-03'),
    id_auditoria_doc: 'doc-008',
    id_tipo_inconsistencia: 'tipo-002',
    ds_campo_impactado: 'Valor Total',
    ds_valor_encontrado: 'R$ 20.900,00',
    ds_valor_esperado: 'R$ 20.978,82',
    ds_mensagem_detalhada: 'Valor escriturado difere do XML.',
    criticidade: 'AVISO',
    status_tratativa: 'ABERTA',
    js_origem: { tipo: 'AUTOMATICA', sistema: 'Auditoria Fiscal v2.0' },
    vl_impacto_financeiro: 78.82,
  },
];

// === MÉTODOS DE CONSULTA ===

/**
 * Lista documentos auditados
 * @param empresaId - ID da empresa selecionada (vem do req.empresaId do middleware)
 * @param filters - Filtros adicionais (status, tipo, datas)
 */
export const listDocumentos = async (
  empresaId: string,
  filters?: {
    status_tecnico?: AuditoriaStatusTecnico;
    status_operacional?: AuditoriaStatusOperacional;
    tipo_doc?: TipoDocumento;
    criticidade?: CriticidadeLevel | 'SEM_CRITICIDADE';
    dt_inicio?: Date;
    dt_fim?: Date;
  }
) => {
  let result = [...MOCK_DOCUMENTOS];
  console.log(
    'listDocumentos called with empresaId:',
    empresaId,
    'and filters:',
    filters
  );
  // 1. Resolver CNPJs alvo baseado na empresa (escritório ou não)
  //    Preferir base real (Prisma); se não houver, usar mock local
  const targetCnpjsDb = await resolveTargetCnpjsFromDB(empresaId);
  console.log('CNPJs alvo resolvidos via DB:', targetCnpjsDb);
  const targetCnpjs =
    targetCnpjsDb.length > 0
      ? targetCnpjsDb
      : await resolveTargetCnpjs(empresaId);
  for (const cnpj of targetCnpjs) {
    console.log('CNPJ alvo:', cnpj);
    for (const doc of result) {
      if (doc.ds_cnpj_destinatario === cnpj) {
        console.log(
          `Comparando documento ${doc.id} com CNPJ destinatário ${doc.ds_cnpj_destinatario}`
        );
      }
    }
  }
  // 2. Filtrar documentos pelos CNPJs alvo
  if (targetCnpjs.length > 0) {
    console.log('Filtrando documentos pelos CNPJs alvo:', targetCnpjs);
    result = result.filter((doc) =>
      targetCnpjs.includes(doc.ds_cnpj_destinatario || '')
    );
  }

  // 3. Aplicar filtros adicionais
  if (filters?.status_tecnico) {
    console.log('Aplicando filtro status_tecnico:', filters.status_tecnico);
    result = result.filter(
      (doc) => doc.status_tecnico === filters.status_tecnico
    );
  }

  if (filters?.status_operacional) {
    console.log(
      'Aplicando filtro status_operacional:',
      filters.status_operacional
    );
    result = result.filter(
      (doc) => doc.status_operacional === filters.status_operacional
    );
  }

  if (filters?.tipo_doc) {
    console.log('Aplicando filtro tipo_doc:', filters.tipo_doc);
    result = result.filter((doc) => doc.ds_tipo_doc === filters.tipo_doc);
  }

  if (filters?.criticidade) {
    console.log('Aplicando filtro criticidade:', filters.criticidade);
    result = result.filter((doc) => {
      const nivel = doc.nivel_criticidade_max || 'SEM_CRITICIDADE';
      return nivel === filters.criticidade;
    });
  }

  if (filters?.dt_inicio || filters?.dt_fim) {
    const start = filters.dt_inicio ? new Date(filters.dt_inicio) : undefined;
    const end = filters.dt_fim ? new Date(filters.dt_fim) : undefined;
    console.log('Aplicando filtro por período:', start, end);
    result = result.filter((doc) => {
      if (!doc.dt_emissao) return false;
      const dt = new Date(doc.dt_emissao);
      if (start && dt < start) return false;
      if (end && dt > end) return false;
      return true;
    });
  }
  console.log('Resultado após filtros adicionais:', result);
  return result;
};

export const getDocumentoById = async (id: string) => {
  return MOCK_DOCUMENTOS.find((doc) => doc.id === id);
};

export const getInconsistenciasByDocumento = async (
  id_auditoria_doc: string
) => {
  const inconsistencias = MOCK_INCONSISTENCIAS.filter(
    (inc) => inc.id_auditoria_doc === id_auditoria_doc
  );

  // Enriquecer com dados do tipo
  return inconsistencias.map((inc) => {
    const tipo = MOCK_TIPOS_INCONSISTENCIA.find(
      (t) => t.id === inc.id_tipo_inconsistencia
    );
    return {
      ...inc,
      tipo_inconsistencia: tipo,
    };
  });
};

export const listTiposInconsistencia = async (activeOnly: boolean = true) => {
  if (activeOnly) {
    return MOCK_TIPOS_INCONSISTENCIA.filter((t) => t.fl_ativo);
  }
  return [...MOCK_TIPOS_INCONSISTENCIA];
};

export const getTipoInconsistenciaById = async (id: string) => {
  return MOCK_TIPOS_INCONSISTENCIA.find((t) => t.id === id);
};

export const getExecucaoById = async (id: string) => {
  return MOCK_EXECUCOES.find((e) => e.id === id);
};

export const listExecucoes = async () => {
  return [...MOCK_EXECUCOES];
};

// Estatísticas agregadas
export const getEstatisticasGerais = async () => {
  // Mantém comportamento anterior (todas as empresas do mock)
  return getEstatisticasGeraisScoped();
};

export const getEstatisticasGeraisScoped = async (empresaId?: string) => {
  // Filtrar documentos pela empresa (usando DB se possível); se não houver empresa, usar todos
  const targetCnpjs = empresaId
    ? (await resolveTargetCnpjsFromDB(empresaId)).length > 0
      ? await resolveTargetCnpjsFromDB(empresaId)
      : await resolveTargetCnpjs(empresaId)
    : [];

  const documentos = targetCnpjs.length
    ? MOCK_DOCUMENTOS.filter((d) =>
        targetCnpjs.includes(d.ds_cnpj_destinatario || '')
      )
    : [...MOCK_DOCUMENTOS];

  const inconsistencias = MOCK_INCONSISTENCIAS.filter((inc) => {
    const doc = documentos.find((d) => d.id === inc.id_auditoria_doc);
    return !!doc;
  });

  const totalDocumentos = documentos.length;
  const totalInconsistencias = inconsistencias.length;

  const documentosInconsistentes = documentos.filter(
    (d) => d.status_tecnico === 'INCONSISTENTE'
  ).length;

  const documentosOk = documentos.filter(
    (d) => d.status_tecnico === 'OK'
  ).length;

  const porStatusOperacional = {
    ABERTA: documentos.filter((d) => d.status_operacional === 'ABERTA').length,
    EM_ANALISE: documentos.filter((d) => d.status_operacional === 'EM_ANALISE')
      .length,

    RESOLVIDA: documentos.filter((d) => d.status_operacional === 'RESOLVIDA')
      .length,

    IGNORADA: documentos.filter((d) => d.status_operacional === 'IGNORADA')
      .length,
  };

  const valorTotalRisco = inconsistencias.reduce(
    (sum, inc) => sum + (inc.vl_impacto_financeiro || 0),
    0
  );

  return {
    totalDocumentos,
    totalInconsistencias,
    documentosInconsistentes,
    documentosOk,
    porStatusOperacional,
    valorTotalRisco,
  };
};

export const getEstatisticasPorEmpresa = async (empresa_cnpj: string) => {
  const documentosEmpresa = MOCK_DOCUMENTOS.filter(
    (d) => d.ds_cnpj_destinatario === empresa_cnpj
  );

  const inconsistenciasEmpresa = MOCK_INCONSISTENCIAS.filter((inc) => {
    const doc = MOCK_DOCUMENTOS.find((d) => d.id === inc.id_auditoria_doc);
    return doc?.ds_cnpj_destinatario === empresa_cnpj;
  });

  const totalDocumentos = documentosEmpresa.length;
  const totalInconsistencias = inconsistenciasEmpresa.length;

  const porStatusOperacional = {
    ABERTA: documentosEmpresa.filter((d) => d.status_operacional === 'ABERTA')
      .length,
    EM_ANALISE: documentosEmpresa.filter(
      (d) => d.status_operacional === 'EM_ANALISE'
    ).length,
    RESOLVIDA: documentosEmpresa.filter(
      (d) => d.status_operacional === 'RESOLVIDA'
    ).length,
    IGNORADA: documentosEmpresa.filter(
      (d) => d.status_operacional === 'IGNORADA'
    ).length,
  };

  const porCriticidade = {
    CRITICA: inconsistenciasEmpresa.filter((i) => i.criticidade === 'CRITICA')
      .length,
    AVISO: inconsistenciasEmpresa.filter((i) => i.criticidade === 'AVISO')
      .length,
    INFO: inconsistenciasEmpresa.filter((i) => i.criticidade === 'INFO').length,
  };

  const valorTotalRisco = inconsistenciasEmpresa.reduce(
    (sum, inc) => sum + (inc.vl_impacto_financeiro || 0),
    0
  );

  return {
    totalDocumentos,
    totalInconsistencias,
    porStatusOperacional,
    porCriticidade,
    valorTotalRisco,
  };
};

/**
 * Lista empresas vinculadas com suas estatísticas de auditoria
 * Usado para escritórios que precisam visualizar dados agrupados por empresa
 */
export const getEmpresasComEstatisticas = async (empresaId: string) => {
  try {
    // Verifica se é escritório
    const empresa = await prisma.sis_empresas.findUnique({
      where: { id: empresaId },
      select: { id: true, is_escritorio: true },
    });

    if (!empresa?.is_escritorio) {
      // Se não for escritório, retorna vazio
      return [];
    }

    // Busca empresas vinculadas
    const empresasVinculadas = await prisma.sis_empresas.findMany({
      where: {
        id_escritorio: empresaId,
      },
      select: {
        id: true,
        ds_documento: true,
        ds_razao_social: true,
        ds_fantasia: true,
      },
      orderBy: {
        ds_razao_social: 'asc',
      },
    });

    // Para cada empresa, calcular estatísticas
    const empresasComStats = empresasVinculadas.map((emp) => {
      const cnpj = emp.ds_documento;
      const documentos = MOCK_DOCUMENTOS.filter(
        (d) => d.ds_cnpj_destinatario === cnpj
      );

      const inconsistencias = MOCK_INCONSISTENCIAS.filter((inc) => {
        const doc = MOCK_DOCUMENTOS.find((d) => d.id === inc.id_auditoria_doc);
        return doc?.ds_cnpj_destinatario === cnpj;
      });

      const totalDocs = documentos.length;
      const docsComInconsistencia = documentos.filter(
        (d) => d.status_tecnico === 'INCONSISTENTE'
      ).length;
      const docsResolvidos = documentos.filter(
        (d) => d.status_operacional === 'RESOLVIDA'
      ).length;

      const criticasCount = documentos.filter(
        (d) => d.nivel_criticidade_max === 'CRITICA'
      ).length;

      const valorTotal = documentos.reduce(
        (sum, doc) => sum + (doc.vl_documento || 0),
        0
      );

      return {
        id: emp.id,
        cnpj,
        nome: emp.ds_razao_social || emp.ds_fantasia || 'Sem nome',
        total_documentos: totalDocs,
        total_inconsistencias: docsComInconsistencia,
        documentos_resolvidos: docsResolvidos,
        documentos_criticos: criticasCount,
        valor_total: valorTotal,
      };
    });

    return empresasComStats;
  } catch (e) {
    console.error('Erro ao buscar empresas com estatísticas:', e);
    return [];
  }
};

export default {
  listDocumentos,
  getDocumentoById,
  getInconsistenciasByDocumento,
  listTiposInconsistencia,
  getTipoInconsistenciaById,
  getExecucaoById,
  listExecucoes,
  getEstatisticasGerais,
  getEstatisticasGeraisScoped,
  getEstatisticasPorEmpresa,
  getEmpresasComEstatisticas,
};
