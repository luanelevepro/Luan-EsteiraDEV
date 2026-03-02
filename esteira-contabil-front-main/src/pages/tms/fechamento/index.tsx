import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import { toast } from 'sonner';

import { DataTableDynamic } from '@/components/ui/data-table-dynamic';

import FechamentoFilters from '@/components/general/tms/fechamento-motoristas/filters';
import FechamentoSummaryCards from '@/components/general/tms/fechamento-motoristas/summary-cards';
import FechamentoDetailSheet from '@/components/general/tms/fechamento-motoristas/detail-sheet';
import { getFechamentoColumns } from '@/components/general/tms/fechamento-motoristas/columns';

import type { FechamentoMotoristaFilters, FechamentoMotoristaListItem } from '@/components/general/tms/fechamento-motoristas/types';

import {
  fecharFechamentoMotorista,
  getDetalheFechamentoMotorista,
  getFechamentosMotoristas,
  getResumoFechamentosMotoristas,
  reabrirFechamentoMotorista,
  sincronizarCompetenciaFechamentos,
  sincronizarViagensFechamentoMotorista,
} from '@/services/api/tms/fechamento-motoristas';

export default function FechamentoMotoristasPage() {
  const [filters, setFilters] = useState<FechamentoMotoristaFilters>(() => {
    const d = new Date();
    const competencia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { competencia, status: 'TODOS', search: undefined };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'motorista_nome', desc: false }]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<FechamentoMotoristaListItem | null>(null);

  const orderColumn = sorting?.[0]?.id ?? 'motorista_nome';
  const orderBy = sorting?.[0]?.desc ? 'desc' : 'asc';

  const listQuery = useQuery({
    queryKey: ['fechamento-motoristas', filters, page, pageSize, orderColumn, orderBy],
    queryFn: () =>
      getFechamentosMotoristas({
        page,
        pageSize,
        competencia: filters.competencia || undefined,
        status: (filters.status ?? 'TODOS') as FechamentoMotoristaFilters['status'],
        search: filters.search || undefined,
        orderColumn,
        orderBy,
      }),
    placeholderData: keepPreviousData,
  });

  const resumoQuery = useQuery({
    queryKey: ['fechamento-motoristas-resumo', filters.competencia],
    queryFn: () => getResumoFechamentosMotoristas(filters.competencia || undefined),
  });

  const detalheQuery = useQuery({
    queryKey: ['fechamento-motoristas-detalhe', selected?.id],
    queryFn: () => getDetalheFechamentoMotorista(selected!.id),
    enabled: !!selected?.id && detailOpen,
  });

  const columns = useMemo(
    () =>
      getFechamentoColumns({
        onOpenDetail: (row) => {
          setSelected(row);
          setDetailOpen(true);
        },
      }),
    []
  );

  const data = listQuery.data?.fechamentos ?? [];
  const pageParameters = {
    page: listQuery.data?.page ?? page,
    pageSize: listQuery.data?.pageSize ?? pageSize,
    total: listQuery.data?.total ?? 0,
    totalPages: listQuery.data?.totalPages ?? 1,
  };

  async function handleFechar() {
    if (!selected) return;
    try {
      await fecharFechamentoMotorista(selected.id);
      toast.success('Fechamento realizado.');
      await listQuery.refetch();
      await resumoQuery.refetch();
      await detalheQuery.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao fechar.');
    }
  }

  async function handleReabrir() {
    if (!selected) return;
    try {
      await reabrirFechamentoMotorista(selected.id);
      toast.success('Fechamento reaberto.');
      await listQuery.refetch();
      await resumoQuery.refetch();
      await detalheQuery.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reabrir.');
    }
  }

  async function handleSincronizar() {
    if (!selected) return;
    try {
      const result = await sincronizarViagensFechamentoMotorista(selected.id);
      const msgs: string[] = [];
      if (result.cargasIncluidas > 0) {
        msgs.push(`${result.cargasIncluidas} carga(s) incluída(s)`);
      }
      if (result.viagensIncluidas > 0) {
        msgs.push(`${result.viagensIncluidas} viagem(ns) incluída(s)`);
      }
      toast.success(
        msgs.length > 0 ? msgs.join('. ') : 'Sincronização concluída.'
      );
      await listQuery.refetch();
      await resumoQuery.refetch();
      await detalheQuery.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar.');
    }
  }

  async function handleSincronizarCompetencia() {
    if (!filters.competencia) return;
    try {
      const result = await sincronizarCompetenciaFechamentos(filters.competencia);
      toast.success(
        result.fechamentosAtualizados > 0
          ? `${result.fechamentosAtualizados} fechamento(s) atualizado(s).${result.totalViagensIncluidas > 0 ? ` ${result.totalViagensIncluidas} viagem(ns) incluída(s).` : ''}`
          : 'Sincronização concluída.'
      );
      await listQuery.refetch();
      await resumoQuery.refetch();
      if (selected) await detalheQuery.refetch();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar.');
    }
  }

  const canClose = (selected?.status ?? '') !== 'FECHADO';
  const canReopen = (selected?.status ?? '') === 'FECHADO';

  return (
    <>
      <Head>
        <title>Fechamento</title>
      </Head>

      <DashboardLayout title='Fechamento' description='Acompanhe e finalize os fechamentos por competência.'>
        <div className='flex flex-col gap-4'>
          <FechamentoSummaryCards resumo={resumoQuery.data} />

          <div className='flex w-full'>
            <FechamentoFilters
              value={filters}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
              onRefresh={async () => {
                try {
                  await Promise.all([
                    listQuery.refetch(),
                    resumoQuery.refetch(),
                  ]);
                } catch (error) {
                  console.error('Erro ao atualizar:', error);
                }
              }}
              onSincronizar={handleSincronizarCompetencia}
              competencia={filters.competencia}
              isFetching={listQuery.isFetching}
            />
          </div>

          {!filters.competencia && (
            <p className='text-muted-foreground text-sm'>Selecione uma competência para visualizar os fechamentos.</p>
          )}

          <DataTableDynamic
            columns={columns}
            data={data}
            pageParameters={pageParameters}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            sorting={sorting}
            onSortingChange={setSorting}
            allIds={(listQuery.data?.allIds ?? []).map((id) => ({ id }))}
          />
        </div>

        <FechamentoDetailSheet
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setSelected(null);
            }
          }}
          data={detalheQuery.data}
          onFechar={handleFechar}
          onReabrir={handleReabrir}
          onSincronizar={handleSincronizar}
          canClose={canClose}
          canReopen={canReopen}
        />
      </DashboardLayout>
    </>
  );
}
