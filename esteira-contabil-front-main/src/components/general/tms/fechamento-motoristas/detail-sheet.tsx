import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import type { FechamentoMotoristaDetalhe } from './types';

function formatCurrencyBR(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR');
}

export default function FechamentoDetailSheet({
  open,
  onOpenChange,
  data,
  onFechar,
  onReabrir,
  onSincronizar,
  canClose,
  canReopen,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data?: FechamentoMotoristaDetalhe;
  onFechar: () => void;
  onReabrir: () => void;
  onSincronizar?: () => Promise<void>;
  canClose: boolean;
  canReopen: boolean;
}) {
  const [sincronizando, setSincronizando] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='w-full sm:max-w-xl'>
        <SheetHeader>
          <SheetTitle>Detalhes do fechamento</SheetTitle>
        </SheetHeader>

        {!data ? (
          <div className='text-muted-foreground mt-6 text-sm'>Selecione um motorista para ver os detalhes.</div>
        ) : (
          <div className='mt-6 flex flex-col gap-6 px-6'>
            <div className='space-y-1'>
              <div className='text-lg font-semibold'>{data.motorista_nome}</div>
              <div className='text-muted-foreground text-sm'>
                Competência: <span className='font-medium text-foreground'>{data.competencia}</span>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Faturamento (CT-e emitidos pela empresa)</div>
                <div className='text-xl font-semibold'>
                  {formatCurrencyBR(data.faturamentoCteProprio ?? data.total_frete ?? 0)}
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Adiantamentos</div>
                <div className='text-xl font-semibold'>{formatCurrencyBR(data.total_adiantamentos)}</div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Despesas</div>
                <div className='text-xl font-semibold'>{formatCurrencyBR(data.total_despesas)}</div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Descontos</div>
                <div className='text-xl font-semibold'>{formatCurrencyBR(data.total_descontos)}</div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Líquido</div>
                <div className='text-xl font-semibold'>{formatCurrencyBR(data.total_liquido)}</div>
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between gap-2'>
                <div className='text-sm font-semibold'>Viagens</div>
                {onSincronizar && (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={async () => {
                      setSincronizando(true);
                      try {
                        await onSincronizar();
                      } finally {
                        setSincronizando(false);
                      }
                    }}
                    disabled={sincronizando}
                  >
                    {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
                  </Button>
                )}
              </div>
              <div className='rounded-md border'>
                {(data.viagens ?? []).length === 0 ? (
                  <div className='flex flex-col gap-2 p-3'>
                    <p className='text-muted-foreground text-sm'>
                      Nenhuma viagem com carga concluída na competência.
                    </p>
                  </div>
                ) : (
                  (data.viagens ?? []).map((v) => (
                    <Collapsible key={v.id} asChild>
                      <div className='border-b last:border-b-0'>
                        <CollapsibleTrigger asChild>
                          <button
                            type='button'
                            className='flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50 [&[data-state=open]>svg]:rotate-90'
                          >
                            <ChevronRight className='h-4 w-4 shrink-0 transition-transform' />
                            <span className='font-medium'>{v.cd_viagem}</span>
                            <span className='text-muted-foreground'>
                              {fmtDate(v.dt_agendada)} / {fmtDate(v.dt_conclusao)}
                            </span>
                            <span className='text-muted-foreground'>{v.ds_status}</span>
                            <span className='ml-auto shrink-0 font-semibold text-foreground'>
                              CT-e: {(v.cteProprioQtd ?? 0)} · {formatCurrencyBR(v.cteProprioValor ?? 0)}
                            </span>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className='bg-muted/50 px-3 pb-3 pt-0'>
                            <div className='text-muted-foreground mb-1.5 text-xs font-medium'>
                              Cargas da viagem
                            </div>
                            <div className='space-y-2'>
                              {(v.cargas ?? []).map((c) => (
                                <div
                                  key={c.id}
                                  className='flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-background px-2 py-1.5 text-xs'
                                >
                                  <span className='font-medium'>
                                    {c.cd_carga ?? c.id.slice(0, 8)} · {c.ds_status}
                                    {c.dt_conclusao != null && (
                                      <span className='text-muted-foreground ml-1'>
                                        Concluída: {fmtDate(c.dt_conclusao)}
                                      </span>
                                    )}
                                  </span>
                                  <span className='font-semibold text-foreground'>
                                    CT-e: {(c.cteProprioQtd ?? 0)} · {formatCurrencyBR(c.cteProprioValor ?? 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className='text-muted-foreground mt-2 border-t border-border/50 pt-2 text-xs'>
                              CT-e emitidos na viagem: {formatCurrencyBR(v.cteProprioValor ?? 0)} (
                              {v.cteProprioQtd ?? 0} doc{v.cteProprioQtd !== 1 ? 's' : ''})
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-semibold'>Adiantamentos</div>
              <div className='rounded-md border'>
                <div className='grid grid-cols-3 gap-2 border-b p-2 text-xs font-semibold'>
                  <div>Tipo</div>
                  <div>Data</div>
                  <div>Valor</div>
                </div>
                {data.adiantamentos.length === 0 ? (
                  <div className='text-muted-foreground p-3 text-sm'>Nenhum adiantamento registrado.</div>
                ) : (
                  data.adiantamentos.map((a) => (
                    <div key={a.id} className='grid grid-cols-3 gap-2 border-b p-2 text-sm last:border-b-0'>
                      <div className='font-medium'>{a.ds_tipo}</div>
                      <div>{fmtDate(a.dt_despesa)}</div>
                      <div className='font-semibold'>{formatCurrencyBR(a.vl_despesa)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className='flex gap-2'>
              <Button className='flex-1' onClick={onFechar} disabled={!canClose}>
                Fechar
              </Button>
              <Button className='flex-1' variant='outline' onClick={onReabrir} disabled={!canReopen}>
                Reabrir
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
