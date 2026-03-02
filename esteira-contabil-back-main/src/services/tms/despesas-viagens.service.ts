import { prisma } from '@/services/prisma';
import { TipoDespesa } from '@prisma/client';
import FechamentoMotoristasService from './fechamento-motoristas.service';

export class DespesasViagensService {
  async createDespesas({
    viagemId,
    despesas,
  }: {
    viagemId: string;
    despesas: Array<{
      tipo: TipoDespesa;
      valor: string;
      data: Date;
      nfeItemId?: string;
      odometro?: number;
      nfseId?: string;
      observacao?: string;
      id_conta_despesa?: string;
      contaId?: string;
    }>;
  }) {
    // Normalize and validate despesas sequentially
    const dataToCreate: any[] = [];
    for (const despesa of despesas) {
      const contaId = despesa.id_conta_despesa || despesa.contaId || '';
      const contaTipo = await prisma.con_plano_contas.findUnique({
        where: { id: contaId || undefined },
        select: { ds_tipo_tms_despesa: true },
      });
      const tipo = (contaTipo?.ds_tipo_tms_despesa as TipoDespesa) || 'DESPESA';

      // If type is ABASTECIMENTO, require odometer values
      if (tipo === 'ABASTECIMENTO') {
        if (despesa.odometro === undefined) {
          throw new Error(
            'Odômetro é obrigatório para despesas do tipo ABASTECIMENTO.'
          );
        }
      }

      if (despesa.nfeItemId) {
        const item = await prisma.fis_nfe_itens.findUnique({
          where: { id: despesa.nfeItemId || undefined },
          select: { vl_total: true, vl_desconto: true },
        });
        despesa.valor = String(
          (Number(item?.vl_total || 0) - Number(item?.vl_desconto || 0)) * 100
        );
      }

      dataToCreate.push({
        id_viagem: viagemId,
        ds_tipo: tipo,
        vl_despesa: despesa.valor,
        dt_despesa: despesa.data,
        id_nfe_item: despesa.nfeItemId || null,
        ds_odometro:
          despesa.odometro !== undefined ? String(despesa.odometro) : null,
        id_nfse: despesa.nfseId || null,
        ds_observacao: despesa.observacao || null,
        id_conta_despesa: despesa.id_conta_despesa || despesa.contaId || null,
      });
    }

    const result = await prisma.tms_viagem_despesas.createMany({
      data: dataToCreate,
    });

    // Atualizar fechamento automaticamente
    try {
      const viagem = await prisma.tms_viagens.findFirst({
        where: { id: viagemId },
        include: {
          tms_empresas: {
            include: {
              sis_empresas: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (viagem?.tms_empresas?.sis_empresas?.id) {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComDespesa({
          empresaId: viagem.tms_empresas.sis_empresas.id,
          viagemId: viagemId,
        });
      }
    } catch (e) {
      console.error('Erro ao atualizar fechamento:', e);
    }

    return result;
  }
  async getDespesasByViagemId(viagemId: string) {
    return await prisma.tms_viagem_despesas.findMany({
      where: { id_viagem: viagemId },
      include: {
        fis_nfe_item: {
          include: {
            fis_nfe: true,
          },
        },
        fis_nfse: true,
        con_conta_despesa: {
          select: {
            ds_tipo_tms_despesa: true,
          },
        },
      },
    });
  }
  async getDespesaById(id: string) {
    return await prisma.tms_viagem_despesas.findUnique({
      where: { id },
      include: {
        fis_nfe_item: { include: { fis_nfe: true } },
        fis_nfse: true,
      },
    });
  }

  async updateDespesaById(
    id: string,
    data: Partial<{
      tipo: TipoDespesa;
      valor: string;
      data: Date;
      nfeItemId?: string | null;
      nfseId?: string | null;
      observacao?: string | null;
      id_conta_despesa?: string | null;
      contaId?: string | null;
      ds_odometro?: number | null;
    }>
  ) {
    const updateData: any = {};
    if (data.tipo !== undefined) updateData.ds_tipo = data.tipo;
    if (data.valor !== undefined) updateData.vl_despesa = data.valor;
    if (data.data !== undefined) updateData.dt_despesa = data.data;
    if (data.nfeItemId !== undefined) updateData.id_nfe_item = data.nfeItemId;
    if (data.nfseId !== undefined) updateData.id_nfse = data.nfseId;
    if (data.observacao !== undefined)
      updateData.ds_observacao = data.observacao;
    if (data.id_conta_despesa !== undefined)
      updateData.id_conta_despesa = data.id_conta_despesa;
    if (data.contaId !== undefined) updateData.id_conta_despesa = data.contaId;
    if (data.ds_odometro !== undefined)
      updateData.ds_odometro =
        data.ds_odometro !== null ? String(data.ds_odometro) : null;

    // Validate ABASTECIMENTO requires odometer values
    // Determine which contaId will apply after update
    const existing = await prisma.tms_viagem_despesas.findUnique({
      where: { id },
      include: { con_conta_despesa: { select: { ds_tipo_tms_despesa: true } } },
    });

    const targetContaId =
      (data.id_conta_despesa as string) ||
      (data.contaId as string) ||
      existing?.id_conta_despesa;

    let contaTipo: string | undefined =
      existing?.con_conta_despesa?.ds_tipo_tms_despesa || undefined;
    if (targetContaId) {
      const conta = await prisma.con_plano_contas.findUnique({
        where: { id: targetContaId },
        select: { ds_tipo_tms_despesa: true },
      });
      contaTipo = conta?.ds_tipo_tms_despesa || contaTipo;
    }

    if (contaTipo === 'ABASTECIMENTO') {
      const odometro =
        data.ds_odometro !== undefined && data.ds_odometro !== null
          ? String(data.ds_odometro)
          : existing?.ds_odometro;
      if (!odometro) {
        throw new Error(
          'Odômetro inicial e final são obrigatórios para despesas do tipo ABASTECIMENTO.'
        );
      }
    }

    const despesaAtualizada = await prisma.tms_viagem_despesas.update({
      where: { id },
      data: updateData,
    });

    // Atualizar fechamento automaticamente
    try {
      const viagem = await prisma.tms_viagens.findFirst({
        where: { id: despesaAtualizada.id_viagem },
        include: {
          tms_empresas: {
            include: {
              sis_empresas: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (viagem?.tms_empresas?.sis_empresas?.id) {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComDespesa({
          empresaId: viagem.tms_empresas.sis_empresas.id,
          viagemId: despesaAtualizada.id_viagem,
        });
      }
    } catch (e) {
      console.error('Erro ao atualizar fechamento:', e);
    }

    return despesaAtualizada;
  }
  async deleteDespesasByViagemId(viagemId: string) {
    // Buscar empresaId antes de deletar
    const viagem = await prisma.tms_viagens.findFirst({
      where: { id: viagemId },
      include: {
        tms_empresas: {
          include: {
            sis_empresas: {
              select: { id: true },
            },
          },
        },
      },
    });

    // Deletar despesas
    await prisma.tms_viagem_despesas.deleteMany({
      where: { id_viagem: viagemId },
    });

    // Atualizar fechamento automaticamente
    if (viagem?.tms_empresas?.sis_empresas?.id) {
      try {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComDespesa({
          empresaId: viagem.tms_empresas.sis_empresas.id,
          viagemId: viagemId,
        });
      } catch (e) {
        console.error('Erro ao atualizar fechamento:', e);
      }
    }
  }

  async deleteDespesaById(id: string) {
    // Buscar id_viagem antes de deletar
    const despesa = await prisma.tms_viagem_despesas.findUnique({
      where: { id },
      select: { id_viagem: true },
    });

    if (!despesa) {
      throw new Error('Despesa não encontrada');
    }

    // Deletar despesa
    await prisma.tms_viagem_despesas.delete({ where: { id } });

    // Atualizar fechamento automaticamente
    try {
      const viagem = await prisma.tms_viagens.findFirst({
        where: { id: despesa.id_viagem },
        include: {
          tms_empresas: {
            include: {
              sis_empresas: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (viagem?.tms_empresas?.sis_empresas?.id) {
        const fechamentoService = new FechamentoMotoristasService();
        await fechamentoService.atualizarFechamentoComDespesa({
          empresaId: viagem.tms_empresas.sis_empresas.id,
          viagemId: despesa.id_viagem,
        });
      }
    } catch (e) {
      console.error('Erro ao atualizar fechamento:', e);
    }
  }
}
