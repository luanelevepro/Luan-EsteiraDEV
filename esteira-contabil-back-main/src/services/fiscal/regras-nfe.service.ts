import { adjustToGMT3 } from '@/core/utils';
import { prisma } from '../prisma';
import { conferirStatusNfe } from './documento.service';
import { getFiscalEmpresa } from './fiscal-empresa.service';
import pLimit from 'p-limit';

export const getRegrasNfe = async (id_empresa: string) => {
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id_escritorio: true, id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: sisEmp.id_escritorio },
    select: { id: true },
  });
  const escritorioFiscal = await getFiscalEmpresa(escritorio.id);
  const empresaFiscal = await getFiscalEmpresa(sisEmp.id);
  const regrasNfe = await prisma.fis_regras_entrada_nfe.findMany({
    where: {
      OR: [
        { id_empresa: escritorioFiscal.id },
        { id_empresa: empresaFiscal.id },
      ],
    },
    include: {
      // Empresa fiscal (para obter id_sis_empresas)
      fis_empresas: {
        select: {
          id: true,
          id_sis_empresas: true,
        },
      },
      // Segmento destinatário
      fis_segmentos: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
      // Regime tributário destinatário
      sis_regime_tributario: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
      // Regime tributário emitente
      sis_regime_tributario_emit: {
        select: {
          id: true,
          ds_descricao: true,
          ds_crt: true,
        },
      },
      // CFOP entrada
      sis_cfop_entrada: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      // CST entrada
      sis_cst_entrada: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      js_origem_trib: {
        include: {
          sis_origem_cst: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_tipos_produto: {
        include: {
          sis_tipos_produto: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_cfop_origem: {
        include: {
          sis_cfop: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_cst_origem: {
        include: {
          sis_cst: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      // CFOP gerado
      sis_cfop_gerado: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      // CST gerado
      sis_cst_gerado: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
    },
  });
  return regrasNfe;
};

export const getRegraNfeById = async (id_regra: string, id_empresa: string) => {
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id_escritorio: true, id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }

  const escritorio = await prisma.sis_empresas.findUnique({
    where: { id: sisEmp.id_escritorio },
    select: { id: true },
  });

  const escritorioFiscal = await getFiscalEmpresa(escritorio.id);
  const empresaFiscal = await getFiscalEmpresa(sisEmp.id);

  const regraNfe = await prisma.fis_regras_entrada_nfe.findFirst({
    where: {
      id: id_regra,
      OR: [
        { id_empresa: escritorioFiscal.id },
        { id_empresa: empresaFiscal.id },
      ],
    },
    include: {
      fis_segmentos: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
      sis_regime_tributario: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
      sis_regime_tributario_emit: {
        select: {
          id: true,
          ds_descricao: true,
        },
      },
      sis_cfop_entrada: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      sis_cst_entrada: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      js_origem_trib: {
        include: {
          sis_origem_cst: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_tipos_produto: {
        include: {
          sis_tipos_produto: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_cfop_origem: {
        include: {
          sis_cfop: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      js_cst_origem: {
        include: {
          sis_cst: {
            select: {
              id: true,
              ds_descricao: true,
              ds_codigo: true,
            },
          },
        },
      },
      // CFOP gerado
      sis_cfop_gerado: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
      // CST gerado
      sis_cst_gerado: {
        select: {
          id: true,
          ds_descricao: true,
          ds_codigo: true,
        },
      },
    },
  });

  if (!regraNfe) {
    throw new Error('Regra não encontrada');
  }

  return regraNfe;
};

export const createRegraNfe = async (
  id_empresa: string,
  data: {
    ds_descricao: string;
    id_regime_destinatario?: string;
    id_segmento_destinatario?: string;
    ds_destino_uf: string;
    ds_origem_uf: string;
    dt_vigencia: string;
    js_tipo_produto?: string[];
    js_origem_trib?: string[];
    js_ncm_produto?: string[];
    id_regime_emitente?: string;
    js_cfop_origem?: string[];
    js_cst_origem?: string[];
    id_cfop_entrada?: string;
    id_cst_entrada?: string;
    id_cfop_gerado?: string;
    id_cst_gerado?: string;
  }
) => {
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }
  const empresa = await getFiscalEmpresa(sisEmp.id);
  // criar a regra NFe com todas as relações
  const regraNfe = await prisma.fis_regras_entrada_nfe.create({
    data: {
      ds_descricao: data.ds_descricao,
      ds_origem_uf: data.ds_origem_uf,
      ds_destino_uf: data.ds_destino_uf,
      dt_vigencia: adjustToGMT3(new Date(data.dt_vigencia)),
      id_empresa: empresa.id,

      // Relações opcionais diretas (FK simples)
      id_regime_destinatario: data.id_regime_destinatario || null,
      id_segmento_destinatario: data.id_segmento_destinatario || null,
      id_regime_emitente: data.id_regime_emitente || null,
      id_cfop_entrada: data.id_cfop_entrada || null,
      id_cst_entrada: data.id_cst_entrada || null,
      id_cfop_gerado: (data as any).id_cfop_gerado || null,
      id_cst_gerado: (data as any).id_cst_gerado || null,

      // JSON para NCM (mantido como JSON por enquanto)
      js_ncm_produto: data.js_ncm_produto || [],

      // Relações many-to-many
      js_tipos_produto: data.js_tipo_produto
        ? {
            create: data.js_tipo_produto.map((id_tipo) => ({
              id_sis_tipos_produto: id_tipo,
            })),
          }
        : undefined,

      js_origem_trib: data.js_origem_trib
        ? {
            create: data.js_origem_trib.map((id_origem) => ({
              id_sis_origem_cst: id_origem,
            })),
          }
        : undefined,

      js_cfop_origem: data.js_cfop_origem
        ? {
            create: data.js_cfop_origem.map((id_cfop) => ({
              id_cfop: id_cfop,
            })),
          }
        : undefined,

      js_cst_origem: data.js_cst_origem
        ? {
            create: data.js_cst_origem.map((id_cst) => ({
              id_sis_cst: id_cst,
            })),
          }
        : undefined,
    },
  });
  return regraNfe;
};

export const updateRegraNfe = async (
  id_regra: string,
  id_empresa: string,
  data: {
    ds_descricao?: string;
    id_regime_destinatario?: string;
    id_segmento_destinatario?: string;
    ds_destino_uf?: string;
    ds_origem_uf?: string;
    dt_vigencia?: string;
    js_tipo_produto?: string[];
    js_origem_trib?: string[];
    js_ncm_produto?: string[];
    id_regime_emitente?: string;
    js_cfop_origem?: string[];
    js_cst_origem?: string[];
    id_cfop_entrada?: string;
    id_cst_entrada?: string;
    id_cfop_gerado?: string;
    id_cst_gerado?: string;
  }
) => {
  // verificar se a regra existe e pertence ao escritório da empresa
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }
  const empresa = await getFiscalEmpresa(sisEmp.id);
  const regraExistente = await prisma.fis_regras_entrada_nfe.findFirst({
    where: {
      id: id_regra,
      id_empresa: empresa.id,
    },
  });

  if (!regraExistente) {
    throw new Error('Regra não encontrada ou não pertence a esta empresa');
  }

  if (data.js_tipo_produto !== undefined && data.js_tipo_produto.length > 0) {
    const count = await prisma.sis_tipos_produto.count({
      where: { id: { in: data.js_tipo_produto } },
    });
    if (count !== data.js_tipo_produto.length) {
      const found = await prisma.sis_tipos_produto.findMany({
        where: { id: { in: data.js_tipo_produto } },
        select: { id: true },
      });
      const foundIds = found.map((f) => f.id);
      const missing = data.js_tipo_produto.filter((id) => {
        return !foundIds.includes(id);
      });
      throw new Error(
        `Tipos de produto não encontrados: ${missing.join(', ')}`
      );
    }
  }

  if (data.js_origem_trib !== undefined && data.js_origem_trib.length > 0) {
    const count = await prisma.sis_origem_cst.count({
      where: { id: { in: data.js_origem_trib } },
    });
    if (count !== data.js_origem_trib.length) {
      const found = await prisma.sis_origem_cst.findMany({
        where: { id: { in: data.js_origem_trib } },
        select: { id: true },
      });
      const foundIds = found.map((f) => f.id);
      const missing = data.js_origem_trib.filter((id) => {
        return !foundIds.includes(id);
      });
      throw new Error(
        `Origens de tributação não encontradas: ${missing.join(', ')}`
      );
    }
  }

  if (data.js_cfop_origem !== undefined && data.js_cfop_origem.length > 0) {
    const count = await prisma.sis_cfop.count({
      where: { id: { in: data.js_cfop_origem } },
    });
    if (count !== data.js_cfop_origem.length) {
      const found = await prisma.sis_cfop.findMany({
        where: { id: { in: data.js_cfop_origem } },
        select: { id: true },
      });
      const foundIds = found.map((f) => f.id);
      const missing = data.js_cfop_origem.filter((id) => {
        return !foundIds.includes(id);
      });
      throw new Error(`CFOPs de origem não encontrados: ${missing.join(', ')}`);
    }
  }

  if (data.js_cst_origem !== undefined && data.js_cst_origem.length > 0) {
    const count = await prisma.sis_cst.count({
      where: { id: { in: data.js_cst_origem } },
    });
    if (count !== data.js_cst_origem.length) {
      const found = await prisma.sis_cst.findMany({
        where: { id: { in: data.js_cst_origem } },
        select: { id: true },
      });
      const foundIds = found.map((f) => f.id);
      const missing = data.js_cst_origem.filter((id) => !foundIds.includes(id));
      throw new Error(`CSTs de origem não encontrados: ${missing.join(', ')}`);
    }
  }

  // usar transação para atualizar a regra e suas relações
  const regraNfe = await prisma.$transaction(
    async (tx) => {
      // atualizar dados principais
      await tx.fis_regras_entrada_nfe.update({
        where: { id: id_regra },
        data: {
          ...(data.ds_descricao && { ds_descricao: data.ds_descricao }),
          ...(data.ds_origem_uf && { ds_origem_uf: data.ds_origem_uf }),
          ...(data.ds_destino_uf && { ds_destino_uf: data.ds_destino_uf }),
          ...(data.dt_vigencia && {
            dt_vigencia: adjustToGMT3(new Date(data.dt_vigencia)),
          }),
          ...(data.id_regime_destinatario !== undefined && {
            id_regime_destinatario: data.id_regime_destinatario || null,
          }),
          ...(data.id_segmento_destinatario !== undefined && {
            id_segmento_destinatario: data.id_segmento_destinatario || null,
          }),
          ...(data.id_regime_emitente !== undefined && {
            id_regime_emitente: data.id_regime_emitente || null,
          }),
          ...(data.id_cfop_entrada !== undefined && {
            id_cfop_entrada: data.id_cfop_entrada || null,
          }),
          ...(data.id_cst_entrada !== undefined && {
            id_cst_entrada:
              data.id_cst_entrada === 'MANTER_CST'
                ? null
                : (data as any).id_cst_entrada || null,
          }),
          ...(data.id_cfop_gerado !== undefined && {
            id_cfop_gerado: (data as any).id_cfop_gerado || null,
          }),
          ...(data.id_cst_gerado !== undefined && {
            id_cst_gerado:
              data.id_cst_gerado === 'MANTER_CST'
                ? null
                : (data as any).id_cst_gerado || null,
          }),
          ...(data.js_ncm_produto && { js_ncm_produto: data.js_ncm_produto }),
        },
      });

      // atualizar relações many-to-many (deletar antigas e criar novas)
      if (data.js_tipo_produto !== undefined) {
        await tx.fis_regras_entrada_nfe_tipos_produto.deleteMany({
          where: { id_fis_regras_entrada_nfe: id_regra },
        });
        if (data.js_tipo_produto.length > 0) {
          await tx.fis_regras_entrada_nfe_tipos_produto.createMany({
            data: data.js_tipo_produto.map((id_tipo) => ({
              id_fis_regras_entrada_nfe: id_regra,
              id_sis_tipos_produto: id_tipo,
            })),
          });
        }
      }

      if (data.js_origem_trib !== undefined) {
        await tx.fis_regras_entrada_nfe_origem_trib.deleteMany({
          where: { id_fis_regras_entrada_nfe: id_regra },
        });
        if (data.js_origem_trib.length > 0) {
          await tx.fis_regras_entrada_nfe_origem_trib.createMany({
            data: data.js_origem_trib.map((id_origem) => ({
              id_fis_regras_entrada_nfe: id_regra,
              id_sis_origem_cst: id_origem,
            })),
          });
        }
      }

      if (data.js_cfop_origem !== undefined) {
        await tx.fis_regras_entrada_nfe_cfop_origem.deleteMany({
          where: { id_fis_regras_entrada_nfe: id_regra },
        });
        if (data.js_cfop_origem.length > 0) {
          await tx.fis_regras_entrada_nfe_cfop_origem.createMany({
            data: data.js_cfop_origem.map((id_cfop) => ({
              id_fis_regras_entrada_nfe: id_regra,
              id_cfop: id_cfop,
            })),
          });
        }
      }

      if (data.js_cst_origem !== undefined) {
        await tx.fis_regras_entrada_nfe_cst_origem.deleteMany({
          where: { id_fis_regras_entrada_nfe: id_regra },
        });
        if (data.js_cst_origem.length > 0) {
          await tx.fis_regras_entrada_nfe_cst_origem.createMany({
            data: data.js_cst_origem.map((id_cst) => ({
              id_fis_regras_entrada_nfe: id_regra,
              id_sis_cst: id_cst,
            })),
          });
        }
      }

      return;
      // return await tx.fis_regras_entrada_nfe.findUnique({
      //   where: { id: id_regra },
      //   include: {
      //     fis_segmentos: {
      //       select: {
      //         id: true,
      //         ds_descricao: true,
      //       },
      //     },
      //     sis_regime_tributario: {
      //       select: {
      //         id: true,
      //         ds_descricao: true,
      //       },
      //     },
      //     sis_regime_tributario_emit: {
      //       select: {
      //         id: true,
      //         ds_descricao: true,
      //       },
      //     },
      //     sis_cfop_entrada: {
      //       select: {
      //         id: true,
      //         ds_descricao: true,
      //         ds_codigo: true,
      //       },
      //     },
      //     sis_cst_entrada: {
      //       select: {
      //         id: true,
      //         ds_descricao: true,
      //         ds_codigo: true,
      //       },
      //     },
      //     js_origem_trib: {
      //       include: {
      //         sis_origem_cst: {
      //           select: {
      //             id: true,
      //             ds_descricao: true,
      //             ds_codigo: true,
      //           },
      //         },
      //       },
      //     },
      //     js_tipos_produto: {
      //       include: {
      //         sis_tipos_produto: {
      //           select: {
      //             id: true,
      //             ds_descricao: true,
      //             ds_codigo: true,
      //           },
      //         },
      //       },
      //     },
      //     js_cfop_origem: {
      //       include: {
      //         sis_cfop: {
      //           select: {
      //             id: true,
      //             ds_descricao: true,
      //             ds_codigo: true,
      //           },
      //         },
      //       },
      //     },
      //     js_cst_origem: {
      //       include: {
      //         sis_cst: {
      //           select: {
      //             id: true,
      //             ds_descricao: true,
      //             ds_codigo: true,
      //           },
      //         },
      //       },
      //     },
      //   },
      // });
    },
    { maxWait: 10000, timeout: 10000 }
  );

  // console.log('Regra NFe atualizada:', regraNfe);
  return { message: 'Regra atualizada com sucesso' };
};

export const deleteRegraNfe = async (id_regra: string, id_empresa: string) => {
  // Verificar se a regra existe e pertence ao escritório da empresa
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }

  const empresa = await getFiscalEmpresa(sisEmp.id);
  const regraExistente = await prisma.fis_regras_entrada_nfe.findFirst({
    where: {
      id: id_regra,
      id_empresa: empresa.id,
    },
  });

  if (!regraExistente) {
    throw new Error('Regra não encontrada ou não pertence a esta empresa');
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Deletar relações many-to-many (CASCADE está configurado no schema)
    await tx.fis_regras_entrada_nfe_tipos_produto.deleteMany({
      where: { id_fis_regras_entrada_nfe: id_regra },
    });

    await tx.fis_regras_entrada_nfe_origem_trib.deleteMany({
      where: { id_fis_regras_entrada_nfe: id_regra },
    });

    await tx.fis_regras_entrada_nfe_cfop_origem.deleteMany({
      where: { id_fis_regras_entrada_nfe: id_regra },
    });

    await tx.fis_regras_entrada_nfe_cst_origem.deleteMany({
      where: { id_fis_regras_entrada_nfe: id_regra },
    });

    // 2. Deletar a regra principal
    const deletedRegra = await tx.fis_regras_entrada_nfe.delete({
      where: { id: id_regra },
    });

    return deletedRegra;
  });

  return { message: 'Regra deletada com sucesso', id: id_regra };
};

/**
 * Duplica uma regra de entrada NFe criando uma cópia exata
 * com prefixo [CÓPIA] ou [CÓPIA N] na descrição
 *
 * @param id_regra - ID da regra a ser duplicada
 * @param id_empresa - ID da empresa (para validação)
 * @returns A nova regra criada com todas as relações
 */
export const duplicateRegraNfe = async (
  id_regra: string,
  id_empresa: string
) => {
  // 1. Verificar se a regra existe e pertence à empresa
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: id_empresa },
    select: { id: true },
  });

  if (!sisEmp) {
    throw new Error('Empresa não encontrada');
  }

  const empresa = await getFiscalEmpresa(sisEmp.id);

  // 2. Buscar a regra original com todas as relações
  const regraOriginal = await prisma.fis_regras_entrada_nfe.findFirst({
    where: {
      id: id_regra,
      id_empresa: empresa.id,
    },
    include: {
      js_tipos_produto: true,
      js_cfop_origem: true,
      js_cst_origem: true,
      js_origem_trib: true,
    },
  });

  if (!regraOriginal) {
    throw new Error('Regra não encontrada ou não pertence a esta empresa');
  }

  // 3. Gerar nova descrição com numeração inteligente
  const gerarNovaDescricao = async (
    descricaoOriginal: string
  ): Promise<string> => {
    // Remover prefixos [CÓPIA] ou [CÓPIA N] existentes para obter descrição base
    const descricaoBase = descricaoOriginal.replace(/^\[CÓPIA( \d+)?\]\s*/, '');

    // Buscar todas as cópias existentes desta regra
    const copias = await prisma.fis_regras_entrada_nfe.findMany({
      where: {
        id_empresa: empresa.id,
        ds_descricao: {
          startsWith: '[CÓPIA',
          contains: descricaoBase,
        },
      },
      select: { ds_descricao: true },
    });

    // Se não houver cópias, retornar [CÓPIA]
    if (copias.length === 0) {
      return `[CÓPIA] ${descricaoBase}`;
    }

    // Extrair números das cópias existentes
    const numeros = copias
      .map((c) => {
        const match = c.ds_descricao.match(/^\[CÓPIA( (\d+))?\]/);
        if (!match) return 0;
        return match[2] ? parseInt(match[2], 10) : 1;
      })
      .filter((n) => !isNaN(n));

    // Encontrar o próximo número disponível
    const proximoNumero = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;

    return `[CÓPIA ${proximoNumero}] ${descricaoBase}`;
  };

  const novaDescricao = await gerarNovaDescricao(regraOriginal.ds_descricao);

  // 4. Criar a nova regra em uma transação
  const novaRegra = await prisma.$transaction(async (tx) => {
    // 4.1. Criar regra principal
    const regraCriada = await tx.fis_regras_entrada_nfe.create({
      data: {
        ds_descricao: novaDescricao,
        ds_origem_uf: regraOriginal.ds_origem_uf,
        ds_destino_uf: regraOriginal.ds_destino_uf,
        dt_vigencia: regraOriginal.dt_vigencia,
        js_ncm_produto: regraOriginal.js_ncm_produto,
        id_segmento_destinatario: regraOriginal.id_segmento_destinatario,
        id_regime_destinatario: regraOriginal.id_regime_destinatario,
        id_regime_emitente: regraOriginal.id_regime_emitente,
        id_cfop_entrada: regraOriginal.id_cfop_entrada,
        id_cst_entrada: regraOriginal.id_cst_entrada,
        id_cfop_gerado: regraOriginal.id_cfop_gerado,
        id_cst_gerado: regraOriginal.id_cst_gerado,
        id_empresa: regraOriginal.id_empresa,
      },
    });

    // 4.2. Duplicar tipos de produto
    if (regraOriginal.js_tipos_produto.length > 0) {
      await tx.fis_regras_entrada_nfe_tipos_produto.createMany({
        data: regraOriginal.js_tipos_produto.map((tp) => ({
          id_fis_regras_entrada_nfe: regraCriada.id,
          id_sis_tipos_produto: tp.id_sis_tipos_produto,
        })),
      });
    }

    // 4.3. Duplicar CFOPs de origem
    if (regraOriginal.js_cfop_origem.length > 0) {
      await tx.fis_regras_entrada_nfe_cfop_origem.createMany({
        data: regraOriginal.js_cfop_origem.map((cfop) => ({
          id_fis_regras_entrada_nfe: regraCriada.id,
          id_cfop: cfop.id_cfop,
        })),
      });
    }

    // 4.4. Duplicar CSTs de origem
    if (regraOriginal.js_cst_origem.length > 0) {
      await tx.fis_regras_entrada_nfe_cst_origem.createMany({
        data: regraOriginal.js_cst_origem.map((cst) => ({
          id_fis_regras_entrada_nfe: regraCriada.id,
          id_sis_cst: cst.id_sis_cst,
        })),
      });
    }

    // 4.5. Duplicar origens tributárias
    if (regraOriginal.js_origem_trib.length > 0) {
      await tx.fis_regras_entrada_nfe_origem_trib.createMany({
        data: regraOriginal.js_origem_trib.map((orig) => ({
          id_fis_regras_entrada_nfe: regraCriada.id,
          id_sis_origem_cst: orig.id_sis_origem_cst,
        })),
      });
    }

    return regraCriada;
  });

  console.log(
    `[DuplicateRegra] Regra duplicada: ${regraOriginal.ds_descricao} → ${novaDescricao}`
  );

  return {
    message: 'Regra duplicada com sucesso',
    id_original: id_regra,
    id_nova: novaRegra.id,
    descricao_nova: novaDescricao,
  };
};

// indexar regras por critérios
interface RegrasIndexadas {
  porUF: Map<string, any[]>; // origem_uf + destino_uf
  porCFOP: Map<string, any[]>;
  porCST: Map<string, any[]>;
  porNCM: Map<string, any[]>;
  todas: any[];
}

// função para criar índices de regras
const criarIndicesRegras = (regras: any[]): RegrasIndexadas => {
  // normaliza CFOPs removendo quaisquer caracteres não numéricos (ex: '5-933' -> '5933')
  const normalizeCfop = (v: any) => {
    try {
      return String(v || '').replace(/[^0-9]/g, '');
    } catch (e) {
      return '';
    }
  };

  const indices: RegrasIndexadas = {
    porUF: new Map(),
    porCFOP: new Map(),
    porCST: new Map(),
    porNCM: new Map(),
    todas: regras,
  };

  regras.forEach((regra) => {
    // Índice por UF (origem + destino)
    const chaveUF = `${regra.ds_origem_uf}-${regra.ds_destino_uf}`;
    if (!indices.porUF.has(chaveUF)) {
      indices.porUF.set(chaveUF, []);
    }
    indices.porUF.get(chaveUF)!.push(regra);

    // Índice por CFOP origem (normalizado)
    if (regra.js_cfop_origem && regra.js_cfop_origem.length > 0) {
      regra.js_cfop_origem?.forEach((cfop: any) => {
        const chaveCFOP = normalizeCfop(cfop.sis_cfop.ds_codigo);
        if (!indices.porCFOP.has(chaveCFOP)) {
          indices.porCFOP.set(chaveCFOP, []);
        }
        indices.porCFOP.get(chaveCFOP)!.push(regra);
      });
    } else {
      console.log(`  - Nenhum CFOP de origem para indexar`);
    }

    // Índice por CST origem
    if (regra.js_cst_origem && regra.js_cst_origem.length > 0) {
      regra.js_cst_origem?.forEach((cst: any) => {
        const chaveCST = cst.sis_cst.ds_codigo;
        if (!indices.porCST.has(chaveCST)) {
          indices.porCST.set(chaveCST, []);
        }
        indices.porCST.get(chaveCST)!.push(regra);
      });
    } else {
      console.log(`  - Nenhum CST de origem para indexar`);
    }

    // Índice por NCM (se houver)
    if (regra.js_ncm_produto && Array.isArray(regra.js_ncm_produto)) {
      regra.js_ncm_produto.forEach((ncm: string) => {
        if (!indices.porNCM.has(ncm)) {
          indices.porNCM.set(ncm, []);
        }
        indices.porNCM.get(ncm)!.push(regra);
      });
    } else {
      console.log(`  - Nenhum NCM para indexar`);
    }
  });

  return indices;
};

// função otimizada para buscar regras candidatas
const buscarRegrasCandidatas = (
  item: any,
  documento: any,
  indices: RegrasIndexadas,
  companyContext: {
    uf: string | undefined;
    id_segmento?: string | null;
    id_regime_tributario?: string | null;
  },
  options?: { requireTriangle?: boolean }
): Set<any> => {
  const candidatos = new Set<any>();

  // If caller requests the 'triangle' filter (UF + regime + segmento) then
  // try to return only rules that match all three. If no rules match, fall
  // back to the normal candidate-selection flow.
  if (
    options?.requireTriangle &&
    companyContext.uf &&
    companyContext.id_regime_tributario &&
    companyContext.id_segmento
  ) {
    const filtered = indices.todas.filter((regra) => {
      const ufMatches =
        regra.ds_destino_uf === '*' ||
        regra.ds_destino_uf === companyContext.uf;
      const segmentoMatches =
        regra.id_segmento_destinatario === companyContext.id_segmento;
      const regimeMatches =
        regra.id_regime_destinatario === companyContext.id_regime_tributario;
      return ufMatches && segmentoMatches && regimeMatches;
    });

    if (filtered.length > 0) {
      filtered.forEach((r) => candidatos.add(r));
      return candidatos;
    }
    // else: fall through to normal selection behavior
  }

  // 1. Buscar por CFOP (mais seletivo) - normalizar CFOP do item removendo '-'
  const normalizeCfop = (v: any) => {
    try {
      return String(v || '').replace(/[^0-9]/g, '');
    } catch (e) {
      return '';
    }
  };
  if (item.cd_cfop) {
    const itemCfopNorm = normalizeCfop(item.cd_cfop);
    const regrasPorCFOP = indices.porCFOP.get(itemCfopNorm) || [];
    regrasPorCFOP.forEach((regra) => candidatos.add(regra));
  }

  // 2. Buscar por CST
  if (item.ds_cst) {
    const regrasPorCST = indices.porCST.get(item.ds_cst) || [];
    regrasPorCST.forEach((regra) => candidatos.add(regra));
  }

  // 3. Buscar por NCM
  if (item.cd_ncm) {
    const regrasPorNCM = indices.porNCM.get(item.cd_ncm) || [];
    regrasPorNCM.forEach((regra) => candidatos.add(regra));
  }

  // 4. SEMPRE buscar também por UF (para pegar regras genéricas sem CFOP/CST/NCM)
  // Inferir origem baseado no CFOP
  let origemInferida: 'DENTRO' | 'FORA' | null = null;
  try {
    const cfop = String(item.cd_cfop || '').trim();
    if (cfop.length > 0) {
      const first = cfop[0];
      if (first === '5') origemInferida = 'DENTRO';
      else if (first === '6') origemInferida = 'FORA';
    }
  } catch (e) {
    origemInferida = null;
  }

  if (origemInferida && companyContext.uf) {
    const chaveUF = `${origemInferida}-${companyContext.uf}`;
    const regrasPorUF = indices.porUF.get(chaveUF) || [];
    regrasPorUF.forEach((regra) => candidatos.add(regra));
  }

  // 5. Se não encontrou candidatos específicos, usar todas as regras
  if (candidatos.size === 0) {
    indices.todas.forEach((regra) => candidatos.add(regra));
  }

  return candidatos;
};

export const calcularPontuacaoRegra = async (
  item: any,
  documento: any,
  regra: any,
  companyContext: {
    uf: string | undefined;
    id_segmento?: string | null;
    id_regime_tributario?: string | null;
  }
): Promise<{ id_regra: string; pontos: number; reason?: string }> => {
  let pontos = 0;
  const tipoItemRaw =
    item.fis_nfe_itens_alter_entrada?.[1]?.fis_produtos?.ds_tipo_item ?? null;
  const tipoItem =
    tipoItemRaw !== null ? String(tipoItemRaw).padStart(2, '0') : null;

  const avaliarRegraDeterministica = async (): Promise<{
    ok: boolean;
    reason?:
      | 'DESTINO_UF'
      | 'ORIGEM_UF'
      | 'SEGMENTO_DEST'
      | 'NCM_INCOMPATIVEL'
      | 'SEGMENTO_MISSING'
      | 'REGIME_DEST'
      | 'REGIME_MISSING'
      | 'REGIME_SEGMENTO_DEST'
      | 'CRT_EMITENTE_MISSING'
      | 'CRT_EMITENTE_INCOMPATIVEL'
      | 'CFOP_INCOMPATIVEL'
      | 'CST_INCOMPATIVEL'
      | 'ORIGEM_TRIB_INCOMPATIVEL'
      | 'TIPO_PRODUTO_INCOMPATIVEL';
  }> => {
    if (
      (companyContext.id_segmento === undefined ||
        companyContext.id_segmento === null) &&
      (companyContext.id_regime_tributario === undefined ||
        companyContext.id_regime_tributario === null)
    ) {
      return { ok: false, reason: 'REGIME_SEGMENTO_DEST' };
    } else if (
      companyContext.id_regime_tributario === undefined ||
      companyContext.id_regime_tributario === null
    ) {
      return { ok: false, reason: 'REGIME_MISSING' };
    } else if (
      companyContext.id_segmento === undefined ||
      companyContext.id_segmento === null
    ) {
      return { ok: false, reason: 'SEGMENTO_MISSING' };
    }
    if (companyContext.uf === undefined || companyContext.uf === null) {
      return { ok: false, reason: 'DESTINO_UF' };
    }

    // 9) tipo produto
    if (regra.js_tipos_produto && regra.js_tipos_produto.length > 0) {
      const tiposRegra = regra.js_tipos_produto
        .map((t: any) => t.sis_tipos_produto?.ds_codigo)
        .filter(Boolean);
      if (!tipoItem || !tiposRegra.includes(tipoItem)) {
        return { ok: false, reason: 'TIPO_PRODUTO_INCOMPATIVEL' };
      }
    }

    // 3) segmento destinatário
    if (
      (regra.id_segmento_destinatario &&
        companyContext.id_segmento &&
        regra.id_segmento_destinatario !== companyContext.id_segmento) ||
      companyContext.id_segmento === null ||
      companyContext.id_segmento === undefined
    ) {
      return { ok: false, reason: 'SEGMENTO_DEST' };
    }
    // 4) regime destinatário
    if (
      (regra.id_regime_destinatario &&
        companyContext.id_regime_tributario &&
        regra.id_regime_destinatario !== companyContext.id_regime_tributario) ||
      companyContext.id_regime_tributario === null ||
      companyContext.id_regime_tributario === undefined
    ) {
      return { ok: false, reason: 'REGIME_DEST' };
    }

    // 6) CFOP
    if (regra.js_cfop_origem && regra.js_cfop_origem.length > 0) {
      const normalizeCfop = (v: any) => {
        try {
          return String(v || '').replace(/[^0-9]/g, '');
        } catch (e) {
          return '';
        }
      };
      const cfopsRegra =
        (regra.js_cfop_origem
          ?.map((c: any) => normalizeCfop(c.sis_cfop?.ds_codigo))
          .filter(Boolean) as string[]) || [];
      const itemCfop = normalizeCfop(item.cd_cfop);
      if (!itemCfop || !cfopsRegra.includes(itemCfop)) {
        return { ok: false, reason: 'CFOP_INCOMPATIVEL' };
      }
    }

    // 7) CST
    if (regra.js_cst_origem && regra.js_cst_origem.length > 0) {
      const cstsRegra =
        regra.js_cst_origem
          ?.map((c: any) => c.sis_cst?.ds_codigo)
          .filter(Boolean) || [];
      const itemCst = item.ds_cst ? String(item.ds_cst).trim() : '';
      if (!itemCst || !cstsRegra.includes(itemCst)) {
        return { ok: false, reason: 'CST_INCOMPATIVEL' };
      }
    }

    // 8) origem tributação
    if (regra.js_origem_trib && regra.js_origem_trib.length > 0) {
      const origensRegra = regra.js_origem_trib
        .map((o: any) => o.sis_origem_cst?.ds_codigo)
        .filter(Boolean);
      const itemOrigem = item.ds_origem ? String(item.ds_origem).trim() : '';
      if (!itemOrigem || !origensRegra.includes(itemOrigem)) {
        return { ok: false, reason: 'ORIGEM_TRIB_INCOMPATIVEL' };
      }
    }

    if (
      regra.js_ncm_produto &&
      Array.isArray(regra.js_ncm_produto) &&
      regra.js_ncm_produto.length > 0
    ) {
      const itemNcm = item.cd_ncm ? String(item.cd_ncm).trim() : '';
      if (!itemNcm || !regra.js_ncm_produto.includes(itemNcm)) {
        return { ok: false, reason: 'NCM_INCOMPATIVEL' };
      }
    }
    // 1) destino UF
    if (
      regra.ds_destino_uf &&
      regra.ds_destino_uf !== '*' &&
      companyContext.uf &&
      regra.ds_destino_uf !== companyContext.uf
    ) {
      return { ok: false, reason: 'DESTINO_UF' };
    }

    // 5) CRT emitente
    if (regra.id_regime_emitente) {
      const rawDocCrt = documento.js_nfe?.cd_crt_emitente;
      const docCrt =
        rawDocCrt === undefined || rawDocCrt === null
          ? ''
          : String(rawDocCrt).trim();
      const regraCrt = regra.sis_regime_tributario_emit?.ds_crt;

      if (regraCrt && (!docCrt || String(docCrt).toUpperCase() === 'EMPTY')) {
        return { ok: false, reason: 'CRT_EMITENTE_MISSING' };
      }

      if (docCrt && regraCrt) {
        const mapCrt: Record<string, string> = {
          '1': 'SIMPLES',
          '2': 'SIMPLES',
          '3': 'NORMAL',
          '4': 'MEI',
        };
        const mapped = mapCrt[String(docCrt)];
        if (!mapped || mapped !== regraCrt) {
          return { ok: false, reason: 'CRT_EMITENTE_INCOMPATIVEL' };
        }
      }
    }
    // 2) infer origin: if document UF != company UF => FORA else DENTRO
    if (regra.ds_origem_uf && regra.ds_origem_uf !== '*') {
      let inferred: 'DENTRO' | 'FORA' | null = null;
      try {
        const cfop = String(item.cd_cfop || '').trim();
        if (cfop.length > 0) {
          const first = cfop[0];
          if (first === '5') inferred = 'DENTRO';
          else if (first === '6') inferred = 'FORA';
        }
      } catch (e) {
        inferred = null;
      }

      if (regra.ds_origem_uf !== inferred) {
        return { ok: false, reason: 'ORIGEM_UF' };
      }
    }

    return { ok: true };
  };

  // determinísticas
  const det = await avaliarRegraDeterministica();
  if (!det.ok) {
    // rejeitado com reason
    return { id_regra: regra.id, pontos: 0, reason: det.reason };
  }

  // filtros pontuáveis
  console.log('  - Avaliando regra:', regra.ds_descricao);
  console.log('    - Item CFOP:', item.cd_cfop);
  console.log(
    '    - Regra CFOPs:',
    regra.js_cfop_origem?.map((c: any) => c.sis_cfop?.ds_codigo).filter(Boolean)
  );
  console.log('    - Regra passou nos filtros determinísticos');
  if (
    item.cd_cfop &&
    regra.js_cfop_origem?.some(
      (cfop: any) =>
        String(cfop.sis_cfop.ds_codigo || '').replace(/[^0-9]/g, '') ===
        String(item.cd_cfop || '').replace(/[^0-9]/g, '')
    )
  ) {
    pontos += 5;
    console.log('    - CFOP do item corresponde à regra', pontos);
  }

  if (
    item.ds_cst &&
    regra.js_cst_origem?.some(
      (cst: any) => cst.sis_cst.ds_codigo === item.ds_cst
    )
  ) {
    pontos += 5;
    console.log('    - CST do item corresponde à regra', pontos);
  }

  if (item.cd_ncm && regra.js_ncm_produto?.includes(item.cd_ncm)) {
    pontos += 25;
  }

  if (
    tipoItem &&
    regra.js_tipos_produto?.some(
      (t: any) => t.sis_tipos_produto?.ds_codigo === tipoItem
    )
  ) {
    pontos += 5;
    console.log('    - Tipo do item corresponde à regra', pontos);
  }

  if (
    item.ds_origem &&
    regra.js_origem_trib?.some(
      (orig: any) => orig.sis_origem_cst.ds_codigo === item.ds_origem
    )
  ) {
    pontos += 5;
    console.log('    - Origem do item corresponde à regra', pontos);
  }

  // if (regra.ds_origem_uf === documento.js_nfe?.ds_uf) {
  //   pontos += 5;
  // }
  // if (regra.ds_destino_uf === companyContext.uf) {
  //   pontos += 5;
  // }

  return { id_regra: regra.id, pontos };
};

export const executarConciliacaoRegrasNfe = async (
  empresaId: string,
  nfeIds: string[],
  usuarioId?: string
) => {
  const empresa = await getFiscalEmpresa(empresaId);
  const sisEmp = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { id_escritorio: true },
  });
  const escritorio = await getFiscalEmpresa(sisEmp?.id_escritorio);
  if (!Array.isArray(nfeIds) || nfeIds.length === 0) {
    throw new Error('É necessário fornecer uma lista de ids de NFe');
  }

  const documentos = await prisma.fis_documento.findMany({
    where: {
      id_fis_empresas: empresa.id,
      ds_tipo: 'NFE',
      id_nfe: { in: nfeIds },
      ds_status: {
        notIn: [
          'CANCELADO',
          'DIGITADO_FISCAL',
          'CONFERIDO_FISCAL',
          'INTEGRACAO_ESCRITA',
        ],
      },
      // Excluir documentos que possuam eventos cujo motivo/descrição indiquem
      // que a operação não foi realizada, houve desconhecimento ou cancelamento.
      // Usamos `none` para garantir que NENHUM evento relacionado contenha essas frases.
      fis_evento: {
        none: {
          OR: [
            {
              ds_justificativa_evento: {
                contains: 'Operacao nao Realizada',
                mode: 'insensitive',
              },
            },
            {
              ds_justificativa_evento: {
                contains: 'Operação não Realizada',
                mode: 'insensitive',
              },
            },
            {
              ds_justificativa_evento: {
                contains: 'Desconhecimento da Operacao',
                mode: 'insensitive',
              },
            },
            {
              ds_justificativa_evento: {
                contains: 'Desconhecimento da Operação',
                mode: 'insensitive',
              },
            },
            {
              ds_justificativa_evento: {
                contains: 'Cancelamento',
                mode: 'insensitive',
              },
            },
            {
              ds_descricao_evento: {
                contains: 'Operacao nao Realizada',
                mode: 'insensitive',
              },
            },
            {
              ds_descricao_evento: {
                contains: 'Operação não Realizada',
                mode: 'insensitive',
              },
            },
            {
              ds_descricao_evento: {
                contains: 'Desconhecimento da Operacao',
                mode: 'insensitive',
              },
            },
            {
              ds_descricao_evento: {
                contains: 'Desconhecimento da Operação',
                mode: 'insensitive',
              },
            },
            {
              ds_descricao_evento: {
                contains: 'Cancelamento',
                mode: 'insensitive',
              },
            },
          ],
        },
      },
    },
    include: {
      js_nfe: {
        select: {
          id: true,
          ds_uf: true,
          id_fis_fornecedor: true,
          cd_crt_emitente: true,
          fis_nfe_itens: {
            select: {
              id: true,
              ds_codigo: true,
              cd_cfop: true,
              ds_cst: true,
              cd_ncm: true,
              ds_origem: true,
              fis_nfe_itens_alter_entrada: {
                select: {
                  id: true,
                  id_produto_alterado: true,
                  fis_produtos: { select: { ds_tipo_item: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  const foundNfeIds = documentos
    .map((d) => d.id_nfe)
    .filter(Boolean) as string[];
  const missing = nfeIds.filter((id) => !foundNfeIds.includes(id));
  if (missing.length) {
    console.warn(
      'Algumas NFe ids não foram encontradas ou não pertencem à empresa:',
      missing
    );
  }

  if (!documentos || documentos.length === 0) {
    throw new Error('Nenhum documento NFe apto encontrado');
  }

  const regrasNfeEmpresa = await prisma.fis_regras_entrada_nfe.findMany({
    where: {
      OR: [{ id_empresa: empresa.id }, { id_empresa: escritorio.id }],
    },
    orderBy: { dt_created: 'asc' },
    include: {
      fis_segmentos: {
        select: { id: true, ds_descricao: true },
      },
      sis_regime_tributario: {
        select: { id: true, ds_descricao: true },
      },
      sis_regime_tributario_emit: {
        select: { id: true, ds_descricao: true, ds_crt: true },
      },
      sis_cfop_entrada: {
        select: { id: true, ds_descricao: true, ds_codigo: true },
      },
      sis_cst_entrada: {
        select: { id: true, ds_descricao: true, ds_codigo: true },
      },
      js_origem_trib: {
        include: {
          sis_origem_cst: {
            select: { id: true, ds_descricao: true, ds_codigo: true },
          },
        },
      },
      js_tipos_produto: {
        include: {
          sis_tipos_produto: {
            select: { id: true, ds_descricao: true, ds_codigo: true },
          },
        },
      },
      js_cfop_origem: {
        include: {
          sis_cfop: {
            select: { id: true, ds_descricao: true, ds_codigo: true },
          },
        },
      },
      js_cst_origem: {
        include: {
          sis_cst: {
            select: { id: true, ds_descricao: true, ds_codigo: true },
          },
        },
      },
    },
  });
  if (!regrasNfeEmpresa || regrasNfeEmpresa.length === 0) {
    throw new Error('Nenhuma regra NFe encontrada');
  }

  // criar índices das regras (O(n)) (evita busca O(n^2) depois)
  const indicesRegras = criarIndicesRegras(regrasNfeEmpresa);
  const sisEmpresa = await prisma.sis_empresas.findUnique({
    where: { id: empresaId },
    select: { ds_uf: true, id_segmento: true, id_regime_tributario: true },
  });

  const limitDocs = pLimit(4);
  const docsNotFullyApplied: string[] = [];
  try {
    const resultados = await Promise.all(
      documentos.map((doc) =>
        limitDocs(async () => {
          if (!doc.js_nfe?.fis_nfe_itens)
            return { documentoId: doc.id, itens: [] };
          // pegar todos os itens e, se algum não possuir produto vinculado,
          // tentar mapear automaticamente via relação produto-fornecedor
          const allItems = doc.js_nfe.fis_nfe_itens || [];

          // Para cada item sem id_produto_alterado, tentar buscar mapeamento
          for (const it of allItems) {
            console.log('conferindo produto do item', it.id);
            // const hasProdutoVinculado =
            //   !!it.fis_nfe_itens_alter_entrada?.[0]?.id_produto_alterado;
            // console.log(
            //   '    - Produto vinculado?',
            //   hasProdutoVinculado ? 'SIM' : 'NÃO'
            // );
            // if (hasProdutoVinculado) continue;

            // precisamos do fornecedor da NFe para buscar mapeamento
            const fornecedorId = doc.js_nfe?.id_fis_fornecedor;
            if (!fornecedorId) continue;

            // tentar casar pelo código do produto na NFe (ds_codigo)
            const codigoProdutoFornecedor =
              (it.ds_codigo && String(it.ds_codigo).trim()) || null;
            if (!codigoProdutoFornecedor) continue;
            console.log(
              '    - Tentando buscar mapeamento para código do fornecedor:',
              codigoProdutoFornecedor
            );
            try {
              const mapping = await prisma.fis_nfe_produto_fornecedor.findFirst(
                {
                  where: {
                    id_fis_empresas: empresa.id,
                    id_fis_fornecedor: fornecedorId,
                    ds_codigo_produto: codigoProdutoFornecedor,
                    fis_produtos: {
                      OR: [{ ds_status: 'ATIVO' }, { ds_status: 'NOVO' }],
                    },
                  },
                  include: { fis_produtos: { select: { id_externo: true } } },
                  orderBy: { dt_created: 'desc' },
                }
              );
              console.log(
                '    - Mapeamento produto-fornecedor buscado:',
                mapping ? 'ENCONTRADO' : 'NÃO ENCONTRADO'
              );

              if (mapping) {
                console.log(
                  '    - Mapeamento produto-fornecedor encontrado, vinculando item',
                  it.id,
                  '-> produto',
                  mapping.id_fis_produto
                );
                // criar ou atualizar entrada de alteração apenas com o produto vinculado
                let created;
                // Primeiro, tentar encontrar por id_nfe_item usando findFirst (id_nfe_item é coberto por uma unique composta no schema).
                const existingAlter =
                  await prisma.fis_nfe_itens_alter_entrada.findFirst({
                    where: { id_nfe_item: it.id },
                  });

                if (existingAlter) {
                  // atualizar usando o id primário
                  created = await prisma.fis_nfe_itens_alter_entrada.update({
                    where: { id: existingAlter.id },
                    data: {
                      id_produto_alterado: mapping.id_fis_produto,
                      cd_produto_alterado:
                        mapping.fis_produtos.id_externo || null,
                    },
                  });
                } else {
                  created = await prisma.fis_nfe_itens_alter_entrada.create({
                    data: {
                      id_nfe_item: it.id,
                      id_produto_alterado: mapping.id_fis_produto,
                      cd_produto_alterado:
                        mapping.fis_produtos.id_externo || null,
                    },
                  });
                }

                it.fis_nfe_itens_alter_entrada =
                  it.fis_nfe_itens_alter_entrada || [];
                it.fis_nfe_itens_alter_entrada.unshift(created as any);
              }
            } catch (error) {
              console.error('Erro ao buscar mapping produto-fornecedor', error);
            }
          }

          const itemsToProcess = allItems.filter(
            (it) => it.fis_nfe_itens_alter_entrada?.[0]?.id_produto_alterado
          );

          if (itemsToProcess.length !== allItems.length) {
            // marcar documento como não 100% aplicado
            docsNotFullyApplied.push(doc.id);
          }

          // cada item do documento (apenas os filtrados)
          // usar um limiter separado para os itens do documento para evitar
          // deadlock quando o mesmo limiter é usado em níveis aninhados
          const limitItems = pLimit(4);

          const resultadosItens = await Promise.all(
            itemsToProcess.map((item) =>
              limitItems(async () => {
                // buscar apenas regras candidatas
                const regrasCandidatas = buscarRegrasCandidatas(
                  item,
                  doc,
                  indicesRegras,
                  {
                    uf: sisEmpresa?.ds_uf || undefined,
                    id_segmento: sisEmpresa?.id_segmento || undefined,
                    id_regime_tributario:
                      sisEmpresa?.id_regime_tributario || undefined,
                  },
                  { requireTriangle: true }
                );

                // calcular pontuação apenas para candidatos e anotar dt_vigencia para desempate
                const pontuacoes = await Promise.all(
                  Array.from(regrasCandidatas).map(async (regra) => {
                    const score = await calcularPontuacaoRegra(
                      item,
                      doc,
                      regra,
                      {
                        uf: sisEmpresa?.ds_uf || undefined,
                        id_segmento: sisEmpresa?.id_segmento || undefined,
                        id_regime_tributario:
                          sisEmpresa?.id_regime_tributario || undefined,
                      }
                    );
                    console.log(
                      '    - Regra:',
                      regra.ds_descricao,
                      'Pontos:',
                      score.pontos
                    );
                    return {
                      ...score,
                      dt_vigencia: (regra as any)?.dt_vigencia || null,
                    };
                  })
                );

                // escolher melhor regra — em caso de empate, mais recente vence
                const melhorRegra = pontuacoes.reduce(
                  (melhor, atual) => {
                    if (atual.pontos > melhor.pontos) return atual;
                    if (atual.pontos < melhor.pontos) return melhor;

                    // empate de pontos -> desempate por dt_vigencia (mais recente vence)
                    const dtMelhor = new Date(
                      melhor.dt_vigencia || 0
                    ).getTime();
                    const dtAtual = new Date(atual.dt_vigencia || 0).getTime();
                    return dtAtual >= dtMelhor ? atual : melhor;
                  },
                  { id_regra: '', pontos: -1, dt_vigencia: 0 }
                );

                // aplicar regra se pontuação for suficiente
                if (melhorRegra.pontos > 0) {
                  await aplicarRegra(item.id, melhorRegra.id_regra);
                }

                // quando apenas 1 NFe é processada, fornecer motivo principal
                // caso nenhuma regra tenha sido aplicada
                let motivoNaoAplicacao: string | null = null;
                if (melhorRegra.pontos <= 0 && nfeIds.length === 1) {
                  if (!pontuacoes || pontuacoes.length === 0) {
                    motivoNaoAplicacao = 'NO_CANDIDATES';
                  } else {
                    const counts = new Map<string, number>();
                    for (const p of pontuacoes) {
                      const r = (p as any).reason;
                      if (r) counts.set(r, (counts.get(r) || 0) + 1);
                      else
                        counts.set(
                          'NO_PONTUAVEL',
                          (counts.get('NO_PONTUAVEL') || 0) + 1
                        );
                    }
                    let maxReason: string | null = null;
                    let maxCount = 0;
                    for (const [k, v] of counts) {
                      if (v > maxCount) {
                        maxCount = v;
                        maxReason = k;
                      }
                    }
                    motivoNaoAplicacao = maxReason || 'NO_MATCHING_RULES';
                  }
                }
                return {
                  itemId: item.id,
                  regraAplicada:
                    melhorRegra.pontos > 0 ? melhorRegra.id_regra : null,
                  pontuacao: melhorRegra.pontos,
                  motivoNaoAplicacao,
                };
              })
            )
          );
          conferirStatusNfe(doc.js_nfe.id, usuarioId);
          return {
            documentoId: doc.id,
            itens: resultadosItens,
          };
        })
      )
    );
    const docsNotFullyAppliedCount = Array.from(
      new Set(docsNotFullyApplied)
    ).length;
    return {
      processados: documentos.length,
      itensProcessados: resultados.flatMap((r) => r.itens).length,
      resultados,
      docsNotFullyAppliedCount,
    };
  } catch (error) {
    console.error('Erro ao executar conciliação:', error);
    throw new Error('Erro ao executar conciliação');
  }
};

// função para aplicar a regra ao item
const aplicarRegra = async (itemId: string, regraId: string) => {
  const regra = await prisma.fis_regras_entrada_nfe.findUnique({
    where: { id: regraId },
    select: {
      id_cfop_gerado: true,
      id_cst_gerado: true,
      sis_cfop_gerado: { select: { ds_codigo: true } },
      sis_cst_gerado: { select: { ds_codigo: true } },
    },
  });

  if (!regra) return;
  // se a regra não define CFOP nem CST gerado, não há alteração a registrar
  if (!regra.id_cfop_gerado && !regra.id_cst_gerado) return;

  const itemOriginal = await prisma.fis_nfe_itens.findUnique({
    where: { id: itemId },
    select: { ds_cst: true },
  });

  const dsCodigoCstGerado =
    regra.id_cst_gerado == null
      ? // se a regra não define id_cst_gerado, replicamos o CST original da nota (sem utilizar o id)
        itemOriginal?.ds_cst || null
      : regra.sis_cst_gerado?.ds_codigo || null;

  const dataToWrite = {
    id_regra_nfe_entrada: regraId,
    id_cfop_alterado: regra.id_cfop_gerado || null,
    ds_codigo_cfop_alterado: regra.sis_cfop_gerado?.ds_codigo || null,
    id_cst_gerado: regra.id_cst_gerado || null,
    ds_codigo_cst_gerado: dsCodigoCstGerado,
  };

  const exists = await prisma.fis_nfe_itens_alter_entrada.findFirst({
    where: { id_nfe_item: itemId },
  });

  if (exists) {
    await prisma.fis_nfe_itens_alter_entrada.update({
      where: { id: exists.id },
      data: dataToWrite as any,
    });
    return;
  }

  await prisma.fis_nfe_itens_alter_entrada.create({
    // cast de segurança por conta das typings geradas pelo Prisma (relacionamento requerido)
    data: { id_nfe_item: itemId, ...dataToWrite },
  });
};
