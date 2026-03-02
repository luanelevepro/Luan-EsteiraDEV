import { getFiscalEmpresa } from './fiscal-empresa.service';
import { prisma } from '../prisma';

// Segmentos Empresas
export const getSegmentosEmpresas = async (empresaId: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { id_escritorio: true, is_escritorio: true, id: true },
  });

  let fis_empresa_escritorio = null;
  if (empresa) {
    const escritorioId = empresa.is_escritorio
      ? empresa.id
      : empresa.id_escritorio;
    if (escritorioId) {
      try {
        fis_empresa_escritorio = await getFiscalEmpresa(escritorioId);
      } catch (err) {
        fis_empresa_escritorio = null;
      }
    }
  }

  const sistema = await prisma.sis_empresas.findFirst({
    where: { ds_nome: 'Sistema' },
    select: { id: true },
  });
  const fis_sistema = await getFiscalEmpresa(sistema.id);

  const [segmentosSistema, segmentosEscritorio] = await Promise.all([
    prisma.fis_segmentos_empresas.findMany({
      where: { id_fis_empresas: fis_sistema.id },
      orderBy: {
        ds_descricao: 'asc',
      },
    }),
    fis_empresa_escritorio
      ? prisma.fis_segmentos_empresas.findMany({
          where: { id_fis_empresas: fis_empresa_escritorio.id },
          orderBy: {
            ds_descricao: 'asc',
          },
        })
      : [],
  ]);

  let segmentosEmpresa: any[] = [];
  if (empresa && !empresa.is_escritorio) {
    segmentosEmpresa = await prisma.fis_segmentos_empresas.findMany({
      where: { id_fis_empresas: fis_empresa.id },
      orderBy: {
        ds_descricao: 'asc',
      },
    });
  }
  const mapa = new Map<string, any>();
  for (const s of segmentosSistema) {
    mapa.set(s.id, { ...s, is_padrao: true });
  }
  const isCallerEscritorio = !!empresa && empresa.is_escritorio === true;
  for (const s of segmentosEscritorio) {
    mapa.set(s.id, { ...s, is_padrao: isCallerEscritorio ? false : true });
  }
  for (const s of segmentosEmpresa) {
    if (!mapa.has(s.id)) {
      mapa.set(s.id, { ...s, is_padrao: false });
    }
  }

  return Array.from(mapa.values());
};

export const getSegmentosById = async (id: string) => {
  const segmento = await prisma.fis_segmentos_empresas.findUnique({
    where: { id },
  });
  return segmento;
};

export const getSegmentosEmpresasPorEscritorio = async (empresaId: string) => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId, is_escritorio: false },
    select: { id_escritorio: true },
  });

  const fis_empresa = await getFiscalEmpresa(empresa.id_escritorio);
  return prisma.fis_segmentos_empresas.findMany({
    where: { id_fis_empresas: fis_empresa.id },
    orderBy: {
      ds_descricao: 'asc',
    },
  });
};

export const createSegmentoEmpresa = async (empresaId: string, data: any) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_segmentos_empresas.create({
    data: {
      ...data,
      id_fis_empresas: fis_empresa.id,
    },
  });
};

export const updateSegmentoEmpresa = async (
  empresaId: string,
  id: string,
  data: any
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_segmentos_empresas.update({
    where: { id, id_fis_empresas: fis_empresa.id },
    data,
  });
};

export const deleteSegmentoEmpresa = async (empresaId: string, id: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_segmentos_empresas.delete({
    where: { id, id_fis_empresas: fis_empresa.id },
  });
};

// Produtos Segmento
export const getPadraoSegmento = async (empresaId: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  // Buscar empresa sem filtrar por is_escritorio para saber se o chamador é
  // um escritório ou uma empresa associada a um escritório.
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { id_escritorio: true, is_escritorio: true, id: true },
  });

  let fis_empresa_escritorio = null;
  if (empresa) {
    const escritorioId = empresa.is_escritorio
      ? empresa.id
      : empresa.id_escritorio;
    if (escritorioId) {
      try {
        fis_empresa_escritorio = await getFiscalEmpresa(escritorioId);
      } catch (err) {
        fis_empresa_escritorio = null;
      }
    }
  }

  const [segmentosEscritorio, segmentosEmpresa] = await Promise.all([
    fis_empresa_escritorio
      ? prisma.fis_prd_segmento.findMany({
          where: { id_fis_empresas: fis_empresa_escritorio.id },
          include: {
            fis_segmentos: true,
            sis_tipos_produto: true,
            sis_tipos_servico: true,
          },
          orderBy: {
            ds_descricao: 'asc',
          },
        })
      : [],
    prisma.fis_prd_segmento.findMany({
      where: { id_fis_empresas: fis_empresa.id },
      include: {
        fis_segmentos: true,
        sis_tipos_produto: true,
        sis_tipos_servico: true,
      },
      orderBy: {
        ds_descricao: 'asc',
      },
    }),
  ]);

  // Mesma lógica de merge/dedup usada em getSegmentosEmpresas: preferir
  // segmentos do escritorio/empresa sobre os do sistema quando houver
  // mesmo id. Aqui consideramos apenas escritorio vs empresa, marcando
  // is_padrao dependendo do tipo do chamador.
  const mapa = new Map<string, any>();
  const isCallerEscritorio = !!empresa && empresa.is_escritorio === true;

  for (const s of segmentosEscritorio) {
    mapa.set(s.id, { ...s, is_padrao: isCallerEscritorio ? false : true });
  }

  for (const s of segmentosEmpresa) {
    if (!mapa.has(s.id)) {
      mapa.set(s.id, { ...s, is_padrao: false });
    }
  }

  return Array.from(mapa.values());
};

export const getPadraoSegmentoEscritorio = async (empresaId: string) => {
  const empresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId, is_escritorio: false },
    select: { id_escritorio: true },
  });
  const fis_empresa = await getFiscalEmpresa(empresa.id_escritorio);

  return prisma.fis_prd_segmento.findMany({
    where: { id_fis_empresas: fis_empresa.id },
    include: { fis_segmentos: true },
    orderBy: {
      ds_descricao: 'asc',
    },
  });
};

export const getPadraoSegmentoById = async (empresaId: string, id: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_prd_segmento.findUnique({
    where: { id: id, id_fis_empresas: fis_empresa.id },
    include: { fis_segmentos: true },
  });
};

export const createPadraoSegmento = async (empresaId: string, data: any) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  await validaTipoServico(data.id_sis_tipos_produto, data.id_sis_tipos_servico);

  return prisma.fis_prd_segmento.create({
    data: {
      ...data,
      id_fis_empresas: fis_empresa.id,
      fis_segmentos: {
        connect: data.fis_segmentos.map((segmentoId: string) => ({
          id: segmentoId,
        })),
      },
    },
  });
};

export const updatePadraoSegmento = async (
  empresaId: string,
  id: string,
  data: any
) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);

  await validaTipoServico(data.id_sis_tipos_produto, data.id_sis_tipos_servico);

  return prisma.fis_prd_segmento.update({
    where: { id, id_fis_empresas: fis_empresa.id },
    data: {
      ...data,
      fis_segmentos: {
        set: data.fis_segmentos.map((segmentoId: string) => ({
          id: segmentoId,
        })), // Remove antigos e adiciona os novos
      },
    },
  });
};

export const deletePadraoSegmento = async (empresaId: string, id: string) => {
  const fis_empresa = await getFiscalEmpresa(empresaId);
  return prisma.fis_prd_segmento.deleteMany({
    where: { id, id_fis_empresas: fis_empresa.id },
  });
};

export const validaTipoServico = async (
  id_sis_tipos_produto: string,
  id_sis_tipos_servico: string
) => {
  if (id_sis_tipos_produto && id_sis_tipos_servico) {
    const tipoProduto = await prisma.sis_tipos_produto.findUnique({
      where: { id: id_sis_tipos_produto },
    });

    if (tipoProduto?.ds_codigo != '09') {
      throw new Error(
        'Tipos de serviço só podem ser salvos em produtos do tipo serviço.'
      );
    }
  }
};
