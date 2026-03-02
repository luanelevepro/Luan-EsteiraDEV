import { prisma } from '@/services/prisma';
import { getTmsEmpresa } from '@/services/tms/tms-empresa.service';
import { getRhEmpresa } from '@/services/rh/rh-empresa.service';
import { Prisma } from '@prisma/client';

/** id da fis_empresas da empresa (para filtrar CT-e onde id_fis_empresa_emitente = empresa) */
async function getFisEmpresaId(empresaId: string): Promise<string | null> {
  const fis = await prisma.fis_empresas.findFirst({
    where: { id_sis_empresas: empresaId },
    select: { id: true },
  });
  return fis?.id ?? null;
}

type ListArgs = {
  empresaId: string;
  page: number;
  pageSize: number;
  competencia: string; // YYYY-MM
  status: string; // 'TODOS' | 'ABERTO' | ...
  search: string;
  orderBy: 'asc' | 'desc';
  orderColumn: string;
};

type FechamentoMotoristaListItem = {
  id: string;
  id_tms_motoristas: string;
  motorista_nome: string;
  motorista_documento: string | null;
  competencia: string;
  status: string;
  total_viagens: number;
  total_cargas: number;
  total_frete: number;
  total_adiantamentos: number;
  total_despesas: number;
  total_descontos: number;
  total_liquido: number;
};

function monthRange(competencia: string) {
  if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) return null;
  const [y, m] = competencia.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // next month
  return { start, end };
}

type CargaEntregueNoMes = {
  id_carga: string;
  id_viagem: string | null;
  nr_sequencia: number | null;
  id_motorista_veiculo: string | null;
  dt_conclusao: Date;
  fl_deslocamento_vazio: boolean;
  ds_status_carga: string;
};

/** Viagem cuja data de percurso (dt_conclusao ou dt_agendada) está no mês da competência */
type ViagemPercorridaNoMes = { id_viagem: string };

const detalheFechamentoInclude = {
  tms_motoristas: {
    include: {
      rh_funcionarios: {
        select: { ds_nome: true, ds_documento: true },
      },
    },
  },
  tms_fechamento_viagens: {
    include: {
      tms_viagens: {
        include: {
          js_viagens_cargas: {
            include: {
              tms_cargas: {
                include: {
                  js_entregas: {
                    select: {
                      id: true,
                      cd_entrega: true,
                      ds_status: true,
                      dt_entrega: true,
                      vl_total_mercadoria: true,
                      nr_sequencia: true,
                    },
                    orderBy: { nr_sequencia: 'asc' as const },
                  },
                },
              },
            },
            orderBy: { nr_sequencia: 'asc' as const },
          },
        },
      },
    },
    orderBy: { tms_viagens: { dt_conclusao: 'asc' as const } },
  },
  tms_fechamento_cargas: {
    include: {
      tms_cargas: {
        include: {
          js_entregas: {
            select: {
              id: true,
              cd_entrega: true,
              ds_status: true,
              dt_entrega: true,
              vl_total_mercadoria: true,
              nr_sequencia: true,
            },
            orderBy: { nr_sequencia: 'asc' as const },
          },
          js_cargas_ctes: {
            include: {
              js_cte: {
                select: {
                  id: true,
                  vl_total: true,
                  ds_numero: true,
                  ds_chave: true,
                  ds_razao_social_tomador: true,
                  id_fis_empresa_emitente: true,
                },
              },
            },
          },
        },
      },
      tms_viagens: {
        select: {
          id: true,
          cd_viagem: true,
          dt_agendada: true,
          dt_conclusao: true,
          ds_status: true,
        },
      },
    },
    orderBy: { dt_created: 'asc' as const },
  },
  tms_fechamentos_titulos: {
    include: {
      tms_viagem_despesas: {
        select: {
          id: true,
          ds_tipo: true,
          dt_despesa: true,
          vl_despesa: true,
          ds_observacao: true,
        },
      },
    },
    orderBy: { nr_sequencia: 'asc' as const },
  },
} as const;

type FechamentoDetalhePayload = Prisma.tms_fechamentosGetPayload<{
  include: typeof detalheFechamentoInclude;
}>;

type MotoristaElegivel = {
  id_tms_motoristas: string;
  motorista_nome: string;
};

export default class FechamentoMotoristasService {
  /**
   * Viagens do motorista cuja data de percurso está no mês (viagem percorrida no mês).
   * Usa dt_conclusao quando preenchida; senão dt_agendada.
   */
  private async buscarViagensPercorridasNoMes(
    idMotorista: string,
    range: { start: Date; end: Date }
  ): Promise<ViagemPercorridaNoMes[]> {
    const result = await prisma.$queryRaw<ViagemPercorridaNoMes[]>`
      SELECT v.id AS id_viagem
      FROM tms_viagens v
      INNER JOIN tms_motoristas_veiculos mv ON mv.id = v.id_motorista_veiculo
      WHERE mv.id_tms_motoristas = ${idMotorista}
        AND (
          (v.dt_conclusao IS NOT NULL AND v.dt_conclusao >= ${range.start} AND v.dt_conclusao < ${range.end})
          OR
          (v.dt_conclusao IS NULL AND v.dt_agendada IS NOT NULL AND v.dt_agendada >= ${range.start} AND v.dt_agendada < ${range.end})
        )
      ORDER BY COALESCE(v.dt_conclusao, v.dt_agendada)
    `;
    return result;
  }

  /**
   * Cargas do motorista com ds_status = 'ENTREGUE' e data de conclusão no mês.
   * Usa dt_entregue_em, dt_finalizado_em (item da viagem) ou fallback das entregas.
   * Inclui carga vazia (fl_deslocamento_vazio), cargas sem entregas e cargas sem viagem
   * (quando id_motorista_veiculo está preenchido na própria carga).
   */
  private async buscarCargasEntreguesNoMes(
    idMotorista: string,
    idTmsEmpresa: string,
    range: { start: Date; end: Date }
  ): Promise<CargaEntregueNoMes[]> {
    // Cargas vinculadas a viagem: motorista via viagem ou via carga
    const comViagem = await prisma.$queryRaw<CargaEntregueNoMes[]>`
      SELECT
        c.id AS id_carga,
        vc.id_viagem AS id_viagem,
        vc.nr_sequencia AS nr_sequencia,
        COALESCE(c.id_motorista_veiculo, v.id_motorista_veiculo) AS id_motorista_veiculo,
        COALESCE(
          c.dt_entregue_em,
          vc.dt_finalizado_em,
          MAX(COALESCE(e.dt_entrega, e.dt_updated)),
          c.dt_updated
        ) AS dt_conclusao,
        COALESCE(c.fl_deslocamento_vazio, false) AS fl_deslocamento_vazio,
        c.ds_status::text AS ds_status_carga
      FROM tms_cargas c
      LEFT JOIN tms_entregas e
        ON e.id_carga = c.id AND e.ds_status = 'ENTREGUE'
      INNER JOIN tms_viagens_cargas vc ON vc.id_carga = c.id
      INNER JOIN tms_viagens v ON v.id = vc.id_viagem
      INNER JOIN tms_motoristas_veiculos mv
        ON mv.id = COALESCE(c.id_motorista_veiculo, v.id_motorista_veiculo)
      WHERE mv.id_tms_motoristas = ${idMotorista}
        AND c.id_tms_empresa = ${idTmsEmpresa}
        AND c.ds_status = 'ENTREGUE'
      GROUP BY c.id, vc.id_viagem, vc.nr_sequencia, vc.dt_finalizado_em, v.id_motorista_veiculo, c.id_motorista_veiculo, c.dt_entregue_em, c.dt_updated, c.fl_deslocamento_vazio, c.ds_status
      HAVING COALESCE(
          c.dt_entregue_em,
          vc.dt_finalizado_em,
          MAX(COALESCE(e.dt_entrega, e.dt_updated)),
          c.dt_updated
        ) >= ${range.start}
        AND COALESCE(
          c.dt_entregue_em,
          vc.dt_finalizado_em,
          MAX(COALESCE(e.dt_entrega, e.dt_updated)),
          c.dt_updated
        ) < ${range.end}
    `;
    // Cargas sem viagem: apenas quando id_motorista_veiculo está na carga
    const semViagem = await prisma.$queryRaw<CargaEntregueNoMes[]>`
      SELECT
        c.id AS id_carga,
        NULL::text AS id_viagem,
        NULL::integer AS nr_sequencia,
        c.id_motorista_veiculo,
        COALESCE(
          c.dt_entregue_em,
          (SELECT MAX(COALESCE(e2.dt_entrega, e2.dt_updated)) FROM tms_entregas e2 WHERE e2.id_carga = c.id AND e2.ds_status = 'ENTREGUE'),
          c.dt_updated
        ) AS dt_conclusao,
        COALESCE(c.fl_deslocamento_vazio, false) AS fl_deslocamento_vazio,
        c.ds_status::text AS ds_status_carga
      FROM tms_cargas c
      INNER JOIN tms_motoristas_veiculos mv ON mv.id = c.id_motorista_veiculo
      WHERE mv.id_tms_motoristas = ${idMotorista}
        AND c.id_tms_empresa = ${idTmsEmpresa}
        AND c.ds_status = 'ENTREGUE'
        AND NOT EXISTS (SELECT 1 FROM tms_viagens_cargas vc2 WHERE vc2.id_carga = c.id)
        AND COALESCE(
          c.dt_entregue_em,
          (SELECT MAX(COALESCE(e2.dt_entrega, e2.dt_updated)) FROM tms_entregas e2 WHERE e2.id_carga = c.id AND e2.ds_status = 'ENTREGUE'),
          c.dt_updated
        ) >= ${range.start}
        AND COALESCE(
          c.dt_entregue_em,
          (SELECT MAX(COALESCE(e2.dt_entrega, e2.dt_updated)) FROM tms_entregas e2 WHERE e2.id_carga = c.id AND e2.ds_status = 'ENTREGUE'),
          c.dt_updated
        ) < ${range.end}
    `;
    const todas = [...comViagem, ...semViagem];
    todas.sort((a, b) => a.dt_conclusao.getTime() - b.dt_conclusao.getTime());
    return todas;
  }

  async buscarMotoristasElegiveis({
    empresaId,
  }: {
    empresaId: string;
  }): Promise<MotoristaElegivel[]> {
    const rhEmpresa = await getRhEmpresa(empresaId);
    const motoristas = await prisma.tms_motoristas.findMany({
      where: {
        id_rh_funcionarios: { not: null },
        is_ativo: true,
        rh_funcionarios: {
          ds_situacao: 'Trabalhando',
          id_rh_empresas: rhEmpresa.id,
        },
      },
      include: {
        rh_funcionarios: {
          select: { ds_nome: true },
        },
      },
    });
    return motoristas.map((m) => ({
      id_tms_motoristas: m.id,
      motorista_nome: m.rh_funcionarios?.ds_nome ?? '—',
    }));
  }

  async criar({
    empresaId,
    motoristaId,
    competencia,
  }: {
    empresaId: string;
    motoristaId: string;
    competencia: string;
  }): Promise<FechamentoMotoristaListItem | null> {
    const tmsEmpresa = await getTmsEmpresa(empresaId);
    const range = monthRange(competencia);

    if (!range) {
      throw new Error('Competência inválida. Use o formato YYYY-MM');
    }

    // Verificar se já existe fechamento para este motorista e competência
    const fechamentoExistente = await prisma.tms_fechamentos.findFirst({
      where: {
        id_tms_empresa: tmsEmpresa.id,
        id_tms_motoristas: motoristaId,
        competencia,
      },
    });

    if (fechamentoExistente) {
      throw new Error(
        'Já existe um fechamento para este motorista nesta competência'
      );
    }

    // Criar fechamento (sem viagens/títulos; sincronização preenche por cargas ENTREGUE no mês)
    const fechamento = await prisma.tms_fechamentos.create({
      data: {
        id_tms_empresa: tmsEmpresa.id,
        id_tms_motoristas: motoristaId,
        competencia,
        ds_status: 'ABERTO',
        vl_total_frete: new Prisma.Decimal(0),
        vl_total_adiantamentos: new Prisma.Decimal(0),
        vl_total_despesas: new Prisma.Decimal(0),
        vl_total_descontos: new Prisma.Decimal(0),
        vl_total_proventos: null,
        vl_liquido: new Prisma.Decimal(0),
      },
      include: {
        tms_motoristas: {
          include: {
            rh_funcionarios: {
              select: {
                ds_nome: true,
                ds_documento: true,
              },
            },
          },
        },
      },
    });

    await this.sincronizarCargasDoFechamento({
      empresaId,
      fechamentoId: fechamento.id,
    });

    const totalCargas = await prisma.tms_fechamento_cargas.count({
      where: { id_fechamento: fechamento.id },
    });
    const totalViagens = await prisma.tms_fechamento_viagens.count({
      where: { id_fechamento: fechamento.id },
    });

    const atualizado = await prisma.tms_fechamentos.findUnique({
      where: { id: fechamento.id },
      select: {
        vl_total_frete: true,
        vl_total_adiantamentos: true,
        vl_total_despesas: true,
        vl_total_descontos: true,
        vl_liquido: true,
      },
    });

    return {
      id: fechamento.id,
      id_tms_motoristas: fechamento.id_tms_motoristas,
      motorista_nome: fechamento.tms_motoristas.rh_funcionarios?.ds_nome ?? '—',
      motorista_documento:
        fechamento.tms_motoristas.rh_funcionarios?.ds_documento ?? null,
      competencia: fechamento.competencia,
      status: fechamento.ds_status,
      total_viagens: totalViagens,
      total_cargas: totalCargas,
      total_frete: Number(atualizado?.vl_total_frete ?? 0),
      total_adiantamentos: Number(atualizado?.vl_total_adiantamentos ?? 0),
      total_despesas: Number(atualizado?.vl_total_despesas ?? 0),
      total_descontos: Number(atualizado?.vl_total_descontos ?? 0),
      total_liquido: Number(atualizado?.vl_liquido ?? 0),
    };
  }

  async list(args: ListArgs) {
    const tmsEmpresa = await getTmsEmpresa(args.empresaId);

    // Se competência fornecida, garantir que todos os motoristas elegíveis tenham fechamento
    if (args.competencia) {
      const motoristasElegiveis = await this.buscarMotoristasElegiveis({
        empresaId: args.empresaId,
      });
      for (const motorista of motoristasElegiveis) {
        const fechamentoExistente = await prisma.tms_fechamentos.findFirst({
          where: {
            id_tms_empresa: tmsEmpresa.id,
            id_tms_motoristas: motorista.id_tms_motoristas,
            competencia: args.competencia,
          },
        });
        if (!fechamentoExistente) {
          try {
            await this.criar({
              empresaId: args.empresaId,
              motoristaId: motorista.id_tms_motoristas,
              competencia: args.competencia,
            });
          } catch (e) {
            // Ignorar se já foi criado por outra requisição
            if (!(e instanceof Error) || !e.message?.includes('Já existe'))
              throw e;
          }
        }
      }
    }

    // Construir filtros
    const where: Prisma.tms_fechamentosWhereInput = {
      id_tms_empresa: tmsEmpresa.id,
    };

    if (args.competencia) {
      where.competencia = args.competencia;
    }

    if (args.status && args.status !== 'TODOS') {
      where.ds_status = args.status as any;
    }

    if (args.search) {
      where.tms_motoristas = {
        rh_funcionarios: {
          ds_nome: { contains: args.search, mode: 'insensitive' },
        },
      };
    }

    // Ordenação
    const orderBy: Prisma.tms_fechamentosOrderByWithRelationInput = {};
    if (args.orderColumn === 'motorista_nome') {
      orderBy.tms_motoristas = {
        rh_funcionarios: {
          ds_nome: args.orderBy,
        },
      };
    } else if (args.orderColumn === 'competencia') {
      orderBy.competencia = args.orderBy;
    } else if (args.orderColumn === 'status') {
      orderBy.ds_status = args.orderBy;
    } else {
      orderBy.dt_created = args.orderBy;
    }

    // Contar total
    const total = await prisma.tms_fechamentos.count({ where });

    // Buscar com paginação
    const fechamentos = await prisma.tms_fechamentos.findMany({
      where,
      orderBy,
      skip: (args.page - 1) * args.pageSize,
      take: args.pageSize,
      include: {
        tms_motoristas: {
          include: {
            rh_funcionarios: {
              select: {
                ds_nome: true,
                ds_documento: true,
              },
            },
          },
        },
        tms_fechamento_viagens: {
          select: {
            id: true,
          },
        },
      },
    });

    // Sincronizar cargas/viagens de cada fechamento da página para manter totais atualizados
    if (fechamentos.length > 0) {
      await Promise.all(
        fechamentos.map((f) =>
          this.sincronizarCargasDoFechamento({
            empresaId: args.empresaId,
            fechamentoId: f.id,
          }).catch((err) => {
            console.error(
              `[list] Erro ao sincronizar fechamento ${f.id}:`,
              err
            );
          })
        )
      );
      // Rebuscar fechamentos para refletir totais após sync
      const ids = fechamentos.map((f) => f.id);
      const fechamentosAtualizados = await prisma.tms_fechamentos.findMany({
        where: { id: { in: ids } },
        orderBy,
        include: {
          tms_motoristas: {
            include: {
              rh_funcionarios: {
                select: {
                  ds_nome: true,
                  ds_documento: true,
                },
              },
            },
          },
          tms_fechamento_viagens: {
            select: {
              id: true,
            },
          },
        },
      });
      const idToOrder = new Map(ids.map((id, i) => [id, i]));
      fechamentosAtualizados.sort(
        (a, b) => (idToOrder.get(a.id) ?? 0) - (idToOrder.get(b.id) ?? 0)
      );
      fechamentos.splice(0, fechamentos.length, ...fechamentosAtualizados);
    }

    const totalPages = Math.max(1, Math.ceil(total / args.pageSize));
    const allIds = fechamentos.map((f) => f.id);

    const counts = await prisma.tms_fechamento_cargas.groupBy({
      by: ['id_fechamento'],
      where: { id_fechamento: { in: allIds } },
      _count: { id: true },
    });
    const mapCount = new Map(counts.map((c) => [c.id_fechamento, c._count.id]));

    return {
      total,
      totalPages,
      page: args.page,
      pageSize: args.pageSize,
      fechamentos: fechamentos.map((f) => ({
        id: f.id,
        id_tms_motoristas: f.id_tms_motoristas,
        motorista_nome: f.tms_motoristas.rh_funcionarios?.ds_nome ?? '—',
        motorista_documento:
          f.tms_motoristas.rh_funcionarios?.ds_documento ?? null,
        competencia: f.competencia,
        status: f.ds_status,
        total_viagens: f.tms_fechamento_viagens.length,
        total_cargas: mapCount.get(f.id) ?? 0,
        total_frete: Number(f.vl_total_frete),
        total_adiantamentos: Number(f.vl_total_adiantamentos),
        total_despesas: Number(f.vl_total_despesas),
        total_descontos: Number(f.vl_total_descontos),
        total_liquido: Number(f.vl_liquido),
      })),
      allIds,
    };
  }

  async resumo({
    empresaId,
    competencia,
  }: {
    empresaId: string;
    competencia: string;
  }) {
    const list = await this.list({
      empresaId,
      page: 1,
      pageSize: 10_000,
      competencia,
      status: 'TODOS',
      search: '',
      orderBy: 'asc',
      orderColumn: 'motorista_nome',
    });

    const total_motoristas = list.total;
    const total_fechados = list.fechamentos.filter(
      (f: any) => f.status === 'FECHADO'
    ).length;
    const total_pendentes = list.fechamentos.filter(
      (f: any) => f.status === 'PENDENTE'
    ).length;
    const total_liquido = list.fechamentos.reduce(
      (s: number, f: any) => s + (Number(f.total_liquido || 0) || 0),
      0
    );

    return { total_motoristas, total_fechados, total_pendentes, total_liquido };
  }

  async detalhe({
    empresaId,
    fechamentoId,
  }: {
    empresaId: string;
    fechamentoId: string;
  }) {
    const tmsEmpresa = await getTmsEmpresa(empresaId);
    const idFisEmpresa = await getFisEmpresaId(empresaId);

    // Sincronizar cargas (fonte da verdade) e derivados antes de montar o payload
    await this.sincronizarCargasDoFechamento({ empresaId, fechamentoId });

    const fechamento = await prisma.tms_fechamentos.findFirst({
      where: {
        id: fechamentoId,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: detalheFechamentoInclude,
    });

    if (!fechamento) throw new Error('Fechamento não encontrado');

    const f = fechamento as FechamentoDetalhePayload;

    const adiantamentos = f.tms_fechamentos_titulos
      .filter((t) => t.tms_viagem_despesas.ds_tipo === 'ADIANTAMENTO')
      .map((t) => ({
        id: t.tms_viagem_despesas.id,
        ds_tipo: t.tms_viagem_despesas.ds_tipo,
        dt_despesa: t.tms_viagem_despesas.dt_despesa
          ? t.tms_viagem_despesas.dt_despesa.toISOString()
          : null,
        vl_despesa: Number(t.tms_viagem_despesas.vl_despesa || 0) || 0,
        ds_observacao: t.tms_viagem_despesas.ds_observacao ?? null,
      }));

    // vl_total do fis_cte: no projeto é tratado em centavos; converter para reais (÷100)
    const cteValorReais = (vl: string | null | undefined): number =>
      Number(vl ?? 0) / 100;

    // Viagens: agrupar por id_viagem a partir de tms_fechamento_cargas; usar tms_fechamento_viagens para ordem/metadados
    type FcItem = (typeof f.tms_fechamento_cargas)[number];
    const cargasPorViagem = new Map<string | 'SEM_VIAGEM', FcItem[]>();
    for (const fc of f.tms_fechamento_cargas) {
      const key = fc.id_viagem ?? 'SEM_VIAGEM';
      const arr = cargasPorViagem.get(key) ?? [];
      arr.push(fc);
      cargasPorViagem.set(key, arr);
    }

    let faturamentoCteProprio = 0;

    const viagens = f.tms_fechamento_viagens.map((fv) => {
      const v = fv.tms_viagens;
      const fcs = (cargasPorViagem.get(v.id) ?? ([] as FcItem[])).sort(
        (a, b) => (a.nr_sequencia ?? 0) - (b.nr_sequencia ?? 0)
      );
      let viagemCteQtd = 0;
      let viagemCteValor = 0;

      const cargas = fcs.map((fc) => {
        const c = fc.tms_cargas;
        const cteLinks = (c as any).js_cargas_ctes ?? [];
        const ctesProprios = idFisEmpresa
          ? cteLinks.filter(
              (link: any) =>
                link?.js_cte?.id_fis_empresa_emitente === idFisEmpresa
            )
          : [];
        const cteProprioQtd = ctesProprios.length;
        const cteProprioValor = ctesProprios.reduce(
          (s: number, link: any) => s + cteValorReais(link?.js_cte?.vl_total),
          0
        );
        viagemCteQtd += cteProprioQtd;
        viagemCteValor += cteProprioValor;
        faturamentoCteProprio += cteProprioValor;

        const entregas = (c.js_entregas ?? []).map((e) => ({
          id: e.id,
          ds_status: String(e.ds_status),
          dt_entrega: e.dt_entrega ? e.dt_entrega.toISOString() : null,
          vl_total_mercadoria: e.vl_total_mercadoria ?? null,
          nr_sequencia: e.nr_sequencia,
        }));
        const dtConclusaoCarga =
          fc.dt_entregue_em ??
          (c.js_entregas ?? [])
            .filter((e) => e.dt_entrega)
            .map((e) => e.dt_entrega!)
            .sort((a, b) => b.getTime() - a.getTime())[0] ??
          null;
        const valorTotal =
          (c.js_entregas ?? []).reduce(
            (s, e) => s + (Number(e.vl_total_mercadoria ?? 0) || 0),
            0
          ) || undefined;
        return {
          id: c.id,
          cd_carga: c.cd_carga ?? null,
          ds_status: c.ds_status,
          nr_sequencia: fc.nr_sequencia ?? 0,
          dt_conclusao: dtConclusaoCarga
            ? dtConclusaoCarga.toISOString()
            : null,
          entregas,
          valor_total: valorTotal,
          cteProprioQtd,
          cteProprioValor,
        };
      });

      return {
        id: v.id,
        cd_viagem: v.cd_viagem,
        dt_agendada: v.dt_agendada ? v.dt_agendada.toISOString() : null,
        dt_conclusao: v.dt_conclusao ? v.dt_conclusao.toISOString() : null,
        ds_status: String(v.ds_status),
        cargas,
        cteProprioQtd: viagemCteQtd,
        cteProprioValor: viagemCteValor,
      };
    });

    return {
      id_tms_motoristas: f.id_tms_motoristas,
      competencia: f.competencia,
      motorista_nome: f.tms_motoristas.rh_funcionarios?.ds_nome ?? '—',
      motorista_documento:
        f.tms_motoristas.rh_funcionarios?.ds_documento ?? null,
      total_viagens: f.tms_fechamento_viagens.length,
      total_frete: Number(f.vl_total_frete),
      faturamentoCteProprio,
      total_adiantamentos: Number(f.vl_total_adiantamentos),
      total_despesas: Number(f.vl_total_despesas),
      total_descontos: Number(f.vl_total_descontos),
      total_liquido: Number(f.vl_liquido),
      viagens,
      adiantamentos,
    };
  }

  async fechar({
    empresaId,
    fechamentoId,
    aprovadorId,
  }: {
    empresaId: string;
    fechamentoId: string;
    aprovadorId?: string;
  }) {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const fechamento = await prisma.tms_fechamentos.findFirst({
      where: {
        id: fechamentoId,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!fechamento) throw new Error('Fechamento não encontrado');

    if (
      fechamento.ds_status !== 'ABERTO' &&
      fechamento.ds_status !== 'REABERTO'
    ) {
      throw new Error(
        'Apenas fechamentos com status ABERTO ou REABERTO podem ser fechados'
      );
    }

    await prisma.tms_fechamentos.update({
      where: { id: fechamentoId },
      data: {
        ds_status: 'FECHADO',
        dt_fechamento: new Date(),
        id_sis_profile_aprovador: aprovadorId || null,
      },
    });
  }

  async reabrir({
    empresaId,
    fechamentoId,
  }: {
    empresaId: string;
    fechamentoId: string;
  }) {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const fechamento = await prisma.tms_fechamentos.findFirst({
      where: {
        id: fechamentoId,
        id_tms_empresa: tmsEmpresa.id,
      },
    });

    if (!fechamento) throw new Error('Fechamento não encontrado');

    if (fechamento.ds_status !== 'FECHADO') {
      throw new Error(
        'Apenas fechamentos com status FECHADO podem ser reabertos'
      );
    }

    await prisma.tms_fechamentos.update({
      where: { id: fechamentoId },
      data: {
        ds_status: 'REABERTO',
        dt_fechamento: null,
      },
    });
  }

  /**
   * Atualiza fechamento automaticamente quando uma viagem é concluída
   * Adiciona a viagem ao fechamento do motorista na competência correspondente
   */
  async atualizarFechamentoComViagem({
    empresaId,
    viagemId,
  }: {
    empresaId: string;
    viagemId: string;
  }): Promise<void> {
    try {
      const tmsEmpresa = await getTmsEmpresa(empresaId);

      // 1. Buscar viagem com motorista
      const viagem = await prisma.tms_viagens.findFirst({
        where: {
          id: viagemId,
          id_tms_empresa: tmsEmpresa.id,
        },
        include: {
          tms_motoristas_veiculos: {
            include: {
              tms_motoristas: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!viagem) {
        console.error(
          `[atualizarFechamentoComViagem] Viagem ${viagemId} não encontrada`
        );
        return;
      }

      // 2. Validar que viagem tem dt_conclusao (foi concluída)
      if (!viagem.dt_conclusao) {
        console.log(
          `[atualizarFechamentoComViagem] Viagem ${viagemId} não tem dt_conclusao, ignorando`
        );
        return;
      }

      // 3. Validar que viagem tem motorista
      const motoristaId = viagem.tms_motoristas_veiculos?.tms_motoristas?.id;
      if (!motoristaId) {
        console.error(
          `[atualizarFechamentoComViagem] Viagem ${viagemId} não tem motorista associado`
        );
        return;
      }

      // 4. Extrair competência de dt_conclusao (formato YYYY-MM)
      const dtConclusao = viagem.dt_conclusao;
      const competencia = `${dtConclusao.getUTCFullYear()}-${String(
        dtConclusao.getUTCMonth() + 1
      ).padStart(2, '0')}`;

      const range = monthRange(competencia);
      if (!range) {
        console.error(
          `[atualizarFechamentoComViagem] Competência inválida: ${competencia}`
        );
        return;
      }

      // 5. Buscar fechamento do motorista na competência (da dt_conclusao da viagem)
      let fechamento = await prisma.tms_fechamentos.findFirst({
        where: {
          id_tms_empresa: tmsEmpresa.id,
          id_tms_motoristas: motoristaId,
          competencia,
        },
      });

      // 6. Se não existe fechamento, criar um novo (fallback)
      if (!fechamento) {
        try {
          await this.criar({
            empresaId,
            motoristaId,
            competencia,
          });
          fechamento = await prisma.tms_fechamentos.findFirst({
            where: {
              id_tms_empresa: tmsEmpresa.id,
              id_tms_motoristas: motoristaId,
              competencia,
            },
          });
        } catch (e) {
          console.error(
            `[atualizarFechamentoComViagem] Erro ao criar fechamento:`,
            e
          );
          return;
        }
      }

      if (!fechamento) {
        console.error(
          `[atualizarFechamentoComViagem] Não foi possível obter/criar fechamento`
        );
        return;
      }

      // 7. Sincronizar viagens/títulos por competência (cargas concluídas no mês + dt_despesa no mês)
      await this.sincronizarViagensDoFechamento({
        empresaId,
        fechamentoId: fechamento.id,
      });
    } catch (error: any) {
      // Log erro mas não quebrar o fluxo principal
      console.error(
        `[atualizarFechamentoComViagem] Erro ao atualizar fechamento:`,
        error
      );
    }
  }

  /**
   * Atualiza fechamento automaticamente quando uma carga é finalizada.
   * Usa a data de conclusão da carga para definir a competência (carga concluída = pertence ao mês).
   */
  async atualizarFechamentoComCarga({
    empresaId,
    cargaId,
    dataConclusao,
  }: {
    empresaId: string;
    cargaId: string;
    dataConclusao: Date;
  }): Promise<void> {
    try {
      const tmsEmpresa = await getTmsEmpresa(empresaId);

      const carga = await prisma.tms_cargas.findFirst({
        where: {
          id: cargaId,
          id_tms_empresa: tmsEmpresa.id,
        },
        include: {
          tms_viagens_cargas: {
            include: {
              tms_viagens: {
                include: {
                  tms_motoristas_veiculos: {
                    select: { id_tms_motoristas: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!carga) {
        console.error(
          `[atualizarFechamentoComCarga] Carga ${cargaId} não encontrada`
        );
        return;
      }

      let motoristaId: string | null = null;
      if (carga.id_motorista_veiculo) {
        const mv = await prisma.tms_motoristas_veiculos.findUnique({
          where: { id: carga.id_motorista_veiculo },
          select: { id_tms_motoristas: true },
        });
        motoristaId = mv?.id_tms_motoristas ?? null;
      }
      if (
        !motoristaId &&
        carga.tms_viagens_cargas?.[0]?.tms_viagens?.tms_motoristas_veiculos
      ) {
        motoristaId =
          carga.tms_viagens_cargas[0].tms_viagens.tms_motoristas_veiculos
            .id_tms_motoristas;
      }

      if (!motoristaId) {
        console.error(
          `[atualizarFechamentoComCarga] Carga ${cargaId} não tem motorista associado (viagem ou carga)`
        );
        return;
      }

      const competencia = `${dataConclusao.getUTCFullYear()}-${String(
        dataConclusao.getUTCMonth() + 1
      ).padStart(2, '0')}`;

      const range = monthRange(competencia);
      if (!range) {
        console.error(
          `[atualizarFechamentoComCarga] Competência inválida: ${competencia}`
        );
        return;
      }

      let fechamento = await prisma.tms_fechamentos.findFirst({
        where: {
          id_tms_empresa: tmsEmpresa.id,
          id_tms_motoristas: motoristaId,
          competencia,
        },
      });

      if (!fechamento) {
        try {
          await this.criar({
            empresaId,
            motoristaId,
            competencia,
          });
          fechamento = await prisma.tms_fechamentos.findFirst({
            where: {
              id_tms_empresa: tmsEmpresa.id,
              id_tms_motoristas: motoristaId,
              competencia,
            },
          });
        } catch (e) {
          console.error(
            `[atualizarFechamentoComCarga] Erro ao criar fechamento:`,
            e
          );
          return;
        }
      }

      if (!fechamento) {
        console.error(
          `[atualizarFechamentoComCarga] Não foi possível obter/criar fechamento`
        );
        return;
      }

      await this.sincronizarCargasDoFechamento({
        empresaId,
        fechamentoId: fechamento.id,
      });
    } catch (error: any) {
      console.error(
        `[atualizarFechamentoComCarga] Erro ao atualizar fechamento:`,
        error
      );
    }
  }

  /**
   * Sincroniza tms_fechamentos_titulos com apenas despesas das viagens do fechamento
   * cuja dt_despesa está no mês da competência.
   */
  private async sincronizarTitulosDoFechamentoPorMes(
    idFechamento: string
  ): Promise<void> {
    const fechamento = await prisma.tms_fechamentos.findUnique({
      where: { id: idFechamento },
      select: { id: true, competencia: true },
    });
    if (!fechamento) throw new Error('Fechamento não encontrado');

    const range = monthRange(fechamento.competencia);
    if (!range) return;

    const fvList = await prisma.tms_fechamento_viagens.findMany({
      where: { id_fechamento: idFechamento },
      select: { id_viagem: true },
    });
    const viagemIds = fvList.map((fv) => fv.id_viagem);

    if (viagemIds.length === 0) {
      await prisma.tms_fechamentos_titulos.deleteMany({
        where: { id_fechamento: idFechamento },
      });
      return;
    }

    const despesas = await prisma.tms_viagem_despesas.findMany({
      where: {
        id_viagem: { in: viagemIds },
        dt_despesa: { gte: range.start, lt: range.end },
      },
      select: { id: true, id_viagem: true },
    });

    await prisma.tms_fechamentos_titulos.deleteMany({
      where: { id_fechamento: idFechamento },
    });

    if (despesas.length > 0) {
      await prisma.tms_fechamentos_titulos.createMany({
        data: despesas.map((d, idx) => ({
          id_fechamento: idFechamento,
          id_tms_viagem_despesa: d.id,
          id_viagem: d.id_viagem,
          nr_sequencia: idx + 1,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Sincroniza tms_fechamento_cargas (cargas ENTREGUE no mês), deriva tms_fechamento_viagens,
   * sincroniza títulos e recalcula totais. Fonte da verdade para fechamento por cargas.
   */
  async sincronizarCargasDoFechamento({
    empresaId,
    fechamentoId,
  }: {
    empresaId: string;
    fechamentoId: string;
  }): Promise<{
    ok: boolean;
    cargasIncluidas: number;
    cargasRemovidas: number;
    viagensIncluidas: number;
  }> {
    const tmsEmpresa = await getTmsEmpresa(empresaId);

    const fechamento = await prisma.tms_fechamentos.findFirst({
      where: { id: fechamentoId, id_tms_empresa: tmsEmpresa.id },
      select: {
        id: true,
        competencia: true,
        id_tms_empresa: true,
        id_tms_motoristas: true,
        ds_status: true,
      },
    });
    if (!fechamento) throw new Error('Fechamento não encontrado');

    const range = monthRange(fechamento.competencia);
    if (!range) throw new Error('Competência inválida');

    const cargasNoMes = await this.buscarCargasEntreguesNoMes(
      fechamento.id_tms_motoristas,
      fechamento.id_tms_empresa,
      range
    );

    const existentes = await prisma.tms_fechamento_cargas.findMany({
      where: { id_fechamento: fechamento.id },
      select: { id: true, id_carga: true },
    });

    const setExistentes = new Set(existentes.map((x) => x.id_carga));
    const setNovas = new Set(cargasNoMes.map((x) => x.id_carga));

    const toAdd = cargasNoMes.filter((c) => !setExistentes.has(c.id_carga));
    const toRemove = existentes.filter((e) => !setNovas.has(e.id_carga));

    const podeRemover =
      fechamento.ds_status === 'ABERTO' || fechamento.ds_status === 'REABERTO';

    await prisma.$transaction(async (tx) => {
      if (toAdd.length > 0) {
        await tx.tms_fechamento_cargas.createMany({
          data: toAdd.map((c) => ({
            id_fechamento: fechamento.id,
            id_carga: c.id_carga,
            id_viagem: c.id_viagem ?? undefined,
            nr_sequencia: c.nr_sequencia ?? undefined,
            id_motorista_veiculo: c.id_motorista_veiculo ?? undefined,
            dt_entregue_em: c.dt_conclusao,
            ds_status_carga: 'ENTREGUE',
            fl_deslocamento_vazio: !!c.fl_deslocamento_vazio,
          })),
          skipDuplicates: true,
        });
      }

      if (podeRemover && toRemove.length > 0) {
        await tx.tms_fechamento_cargas.deleteMany({
          where: { id: { in: toRemove.map((x) => x.id) } },
        });
      }

      const links = await tx.tms_fechamento_cargas.findMany({
        where: { id_fechamento: fechamento.id },
        select: { id_viagem: true },
      });
      const viagemIds: string[] = [
        ...new Set(
          links.map((l) => l.id_viagem).filter((x): x is string => !!x)
        ),
      ];

      if (viagemIds.length > 0) {
        await tx.tms_fechamento_viagens.createMany({
          data: viagemIds.map((id_viagem: string) => ({
            id_fechamento: fechamento.id,
            id_viagem,
          })),
          skipDuplicates: true,
        });
      }

      if (podeRemover) {
        const fv = await tx.tms_fechamento_viagens.findMany({
          where: { id_fechamento: fechamento.id },
          select: { id: true, id_viagem: true },
        });
        const viagemSet = new Set(viagemIds);
        const orfas = fv.filter((x) => !viagemSet.has(x.id_viagem));
        if (orfas.length > 0) {
          await tx.tms_fechamento_viagens.deleteMany({
            where: { id: { in: orfas.map((x) => x.id) } },
          });
        }
      }
    });

    await this.sincronizarTitulosDoFechamentoPorMes(fechamento.id);
    await this.recalcularTotaisFechamento({ empresaId, fechamentoId });

    const viagensIncluidas = await prisma.tms_fechamento_viagens.count({
      where: { id_fechamento: fechamento.id },
    });

    return {
      ok: true,
      cargasIncluidas: toAdd.length,
      cargasRemovidas: podeRemover ? toRemove.length : 0,
      viagensIncluidas,
    };
  }

  /**
   * Backfill: insere vínculos de cargas faltantes em tms_fechamento_cargas (nunca remove)
   * e deriva tms_fechamento_viagens a partir dos id_viagem das cargas.
   * Recomendado após deploy para popular fechamentos históricos (inclusive FECHADO).
   */
  async backfillCargasDoFechamentoSemRemover(fechamentoId: string): Promise<{
    fechamentoId: string;
    cargasIncluidas: number;
    viagensIncluidas: number;
  }> {
    const fechamento = await prisma.tms_fechamentos.findUnique({
      where: { id: fechamentoId },
      select: {
        id: true,
        competencia: true,
        id_tms_empresa: true,
        id_tms_motoristas: true,
      },
    });
    if (!fechamento) throw new Error('Fechamento não encontrado');

    const range = monthRange(fechamento.competencia);
    if (!range) throw new Error('Competência inválida');

    const cargasNoMes = await this.buscarCargasEntreguesNoMes(
      fechamento.id_tms_motoristas,
      fechamento.id_tms_empresa,
      range
    );
    const existentes = await prisma.tms_fechamento_cargas.findMany({
      where: { id_fechamento: fechamento.id },
      select: { id_carga: true },
    });
    const setExistentes = new Set(existentes.map((x) => x.id_carga));
    const toAdd = cargasNoMes.filter((c) => !setExistentes.has(c.id_carga));

    if (toAdd.length > 0) {
      await prisma.tms_fechamento_cargas.createMany({
        data: toAdd.map((c) => ({
          id_fechamento: fechamento.id,
          id_carga: c.id_carga,
          id_viagem: c.id_viagem ?? undefined,
          nr_sequencia: c.nr_sequencia ?? undefined,
          id_motorista_veiculo: c.id_motorista_veiculo ?? undefined,
          dt_entregue_em: c.dt_conclusao,
          ds_status_carga: 'ENTREGUE',
          fl_deslocamento_vazio: !!c.fl_deslocamento_vazio,
        })),
        skipDuplicates: true,
      });
    }

    // Derivar tms_fechamento_viagens a partir dos id_viagem em tms_fechamento_cargas
    const links = await prisma.tms_fechamento_cargas.findMany({
      where: { id_fechamento: fechamento.id },
      select: { id_viagem: true },
    });
    const viagemIds: string[] = [
      ...new Set(links.map((l) => l.id_viagem).filter((x): x is string => !!x)),
    ];
    let viagensIncluidas = 0;
    if (viagemIds.length > 0) {
      const result = await prisma.tms_fechamento_viagens.createMany({
        data: viagemIds.map((id_viagem: string) => ({
          id_fechamento: fechamento.id,
          id_viagem,
        })),
        skipDuplicates: true,
      });
      viagensIncluidas = result.count;
    }

    return {
      fechamentoId,
      cargasIncluidas: toAdd.length,
      viagensIncluidas,
    };
  }

  /**
   * Compatibilidade: delega para sincronizarCargasDoFechamento.
   * Fonte da verdade: cargas concluídas no mês (não viagens).
   */
  async sincronizarViagensDoFechamento({
    empresaId,
    fechamentoId,
  }: {
    empresaId: string;
    fechamentoId: string;
  }): Promise<{
    ok: boolean;
    cargasIncluidas: number;
    viagensIncluidas: number;
  }> {
    const r = await this.sincronizarCargasDoFechamento({
      empresaId,
      fechamentoId,
    });
    return {
      ok: r.ok,
      cargasIncluidas: r.cargasIncluidas,
      viagensIncluidas: r.viagensIncluidas,
    };
  }

  /**
   * Sincroniza todos os fechamentos da competência: garante que existam e atualiza
   * viagens/cargas de cada um.
   */
  async sincronizarCompetencia({
    empresaId,
    competencia,
  }: {
    empresaId: string;
    competencia: string;
  }): Promise<{
    ok: boolean;
    fechamentosAtualizados: number;
    totalViagensIncluidas: number;
  }> {
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      throw new Error('Competência inválida. Use o formato YYYY-MM');
    }

    const listResult = await this.list({
      empresaId,
      page: 1,
      pageSize: 10_000,
      competencia,
      status: 'TODOS',
      search: '',
      orderBy: 'asc',
      orderColumn: 'motorista_nome',
    });

    let totalViagensIncluidas = 0;
    for (const f of listResult.fechamentos) {
      const result = await this.sincronizarViagensDoFechamento({
        empresaId,
        fechamentoId: f.id,
      });
      totalViagensIncluidas += result.viagensIncluidas;
    }

    return {
      ok: true,
      fechamentosAtualizados: listResult.fechamentos.length,
      totalViagensIncluidas,
    };
  }

  /**
   * Recalcula os totais de um fechamento baseado nas viagens e despesas vinculadas
   * (apenas despesas com dt_despesa no mês da competência).
   */
  private async recalcularTotaisFechamento({
    empresaId,
    fechamentoId,
  }: {
    empresaId: string;
    fechamentoId: string;
  }): Promise<void> {
    const tmsEmpresa = await getTmsEmpresa(empresaId);
    const idFisEmpresa = await getFisEmpresaId(empresaId);

    const fechamento = await prisma.tms_fechamentos.findFirst({
      where: {
        id: fechamentoId,
        id_tms_empresa: tmsEmpresa.id,
      },
      include: {
        tms_fechamento_viagens: {
          select: { id_viagem: true },
        },
      },
    });

    if (!fechamento) return;

    const range = monthRange(fechamento.competencia);
    if (!range) return;

    const viagemIds = fechamento.tms_fechamento_viagens.map(
      (fv) => fv.id_viagem
    );

    // Faturamento = soma vl_total dos CT-e em que id_fis_empresa_emitente = empresa (cargas do fechamento)
    let totalFrete = 0;
    if (idFisEmpresa) {
      const cargasFechamento = await prisma.tms_fechamento_cargas.findMany({
        where: { id_fechamento: fechamentoId },
        select: { id_carga: true },
      });
      const cargaIds = cargasFechamento.map((fc) => fc.id_carga);
      if (cargaIds.length > 0) {
        const cteLinks = await prisma.tms_cargas_cte.findMany({
          where: { id_carga: { in: cargaIds } },
          include: {
            js_cte: {
              select: { vl_total: true, id_fis_empresa_emitente: true },
            },
          },
        });
        // vl_total no fis_cte em centavos; converter para reais; só CT-e emitidos pela empresa
        for (const link of cteLinks) {
          if (
            link.js_cte?.id_fis_empresa_emitente === idFisEmpresa &&
            link.js_cte?.vl_total != null
          ) {
            totalFrete += Number(link.js_cte.vl_total) / 100;
          }
        }
      }
    }

    // Apenas despesas das viagens do fechamento com dt_despesa no mês da competência
    const despesas =
      viagemIds.length > 0
        ? await prisma.tms_viagem_despesas.findMany({
            where: {
              id_viagem: { in: viagemIds },
              dt_despesa: { gte: range.start, lt: range.end },
            },
            select: {
              id: true,
              ds_tipo: true,
              vl_despesa: true,
              id_viagem: true,
            },
          })
        : [];

    // Calcular totais
    const totalAdiantamentos = despesas
      .filter((d) => d.ds_tipo === 'ADIANTAMENTO')
      .reduce((s, d) => s + (Number(d.vl_despesa || 0) || 0), 0);

    const totalDespesas = despesas
      .filter((d) => d.ds_tipo !== 'ADIANTAMENTO')
      .reduce((s, d) => s + (Number(d.vl_despesa || 0) || 0), 0);

    const totalDescontos = 0;
    const totalProventos = null;
    const totalLiquido =
      totalFrete +
      (totalProventos || 0) -
      totalAdiantamentos -
      totalDespesas -
      totalDescontos;

    // Atualizar fechamento
    await prisma.tms_fechamentos.update({
      where: { id: fechamentoId },
      data: {
        vl_total_frete: new Prisma.Decimal(totalFrete),
        vl_total_adiantamentos: new Prisma.Decimal(totalAdiantamentos),
        vl_total_despesas: new Prisma.Decimal(totalDespesas),
        vl_total_descontos: new Prisma.Decimal(totalDescontos),
        vl_total_proventos: totalProventos
          ? new Prisma.Decimal(totalProventos)
          : null,
        vl_liquido: new Prisma.Decimal(totalLiquido),
      },
    });

    // Sincronizar tms_fechamentos_titulos com as despesas
    // Remover títulos de despesas que não existem mais
    const despesaIds = new Set(despesas.map((d) => d.id));
    const titulosExistentes = await prisma.tms_fechamentos_titulos.findMany({
      where: { id_fechamento: fechamentoId },
      select: { id: true, id_tms_viagem_despesa: true },
    });

    const titulosParaRemover = titulosExistentes.filter(
      (t) => t.id_tms_viagem_despesa && !despesaIds.has(t.id_tms_viagem_despesa)
    );

    if (titulosParaRemover.length > 0) {
      await prisma.tms_fechamentos_titulos.deleteMany({
        where: {
          id: { in: titulosParaRemover.map((t) => t.id) },
        },
      });
    }

    // Adicionar títulos de despesas que ainda não estão no fechamento
    const titulosExistentesDespesaIds = new Set(
      titulosExistentes
        .map((t) => t.id_tms_viagem_despesa)
        .filter((id): id is string => id !== null)
    );

    const despesasParaAdicionar = despesas.filter(
      (d) => !titulosExistentesDespesaIds.has(d.id)
    );

    if (despesasParaAdicionar.length > 0) {
      // Buscar maior sequência existente
      const { _max } = await prisma.tms_fechamentos_titulos.aggregate({
        where: { id_fechamento: fechamentoId },
        _max: { nr_sequencia: true },
      });

      let proximaSequencia = (_max.nr_sequencia ?? 0) + 1;

      await prisma.tms_fechamentos_titulos.createMany({
        data: despesasParaAdicionar.map((d) => ({
          id_fechamento: fechamentoId,
          id_tms_viagem_despesa: d.id,
          id_viagem: d.id_viagem,
          nr_sequencia: proximaSequencia++,
        })),
      });
    }
  }

  /**
   * Atualiza fechamento automaticamente quando uma despesa é criada/atualizada/deletada
   * Recalcula totais e sincroniza tms_fechamentos_titulos
   */
  async atualizarFechamentoComDespesa({
    empresaId,
    viagemId,
  }: {
    empresaId: string;
    viagemId: string;
  }): Promise<void> {
    try {
      const tmsEmpresa = await getTmsEmpresa(empresaId);

      // Buscar se viagem está vinculada a algum fechamento
      const fechamentoViagem = await prisma.tms_fechamento_viagens.findFirst({
        where: { id_viagem: viagemId },
        select: { id_fechamento: true },
      });

      if (!fechamentoViagem) {
        // Viagem não está em nenhum fechamento ainda, não há nada para atualizar
        return;
      }

      // Recalcular totais do fechamento (já sincroniza tms_fechamentos_titulos)
      await this.recalcularTotaisFechamento({
        empresaId,
        fechamentoId: fechamentoViagem.id_fechamento,
      });
    } catch (error: any) {
      // Log erro mas não quebrar o fluxo principal
      console.error(
        `[atualizarFechamentoComDespesa] Erro ao atualizar fechamento:`,
        error
      );
    }
  }
}
