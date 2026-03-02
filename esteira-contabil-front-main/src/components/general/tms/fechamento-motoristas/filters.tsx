import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ListFilter, RefreshCw, SearchIcon, EllipsisVertical, CloudDownload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FechamentoMotoristaFilters, FechamentoStatus } from './types';
import { MonthYearSelector } from '@/components/ui/month-year-selector';

const STATUS: Array<{ label: string; value: FechamentoStatus | 'TODOS' }> = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Aberto', value: 'ABERTO' },
  { label: 'Pendente', value: 'PENDENTE' },
  { label: 'Fechado', value: 'FECHADO' },
  { label: 'Reaberto', value: 'REABERTO' },
];

export default function FechamentoFilters({
  value,
  onChange,
  onRefresh,
  onSincronizar,
  competencia,
  isFetching,
}: {
  value: FechamentoMotoristaFilters;
  onChange: (next: FechamentoMotoristaFilters) => void;
  onRefresh: () => void;
  onSincronizar?: (competencia: string) => Promise<void>;
  competencia?: string;
  isFetching?: boolean;
}): React.ReactNode {
  const [sincronizando, setSincronizando] = useState(false);
  const competenciaDate = useMemo(() => {
    if (!value.competencia || !/^\d{4}-\d{2}$/.test(value.competencia)) return undefined;
    const [year, month] = value.competencia.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [value.competencia]);

  const handleCompetenciaChange = (date: Date | undefined) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      onChange({ ...value, competencia: `${year}-${month}` });
    } else {
      onChange({ ...value, competencia: undefined });
    }
  };

  return (
    <div className='flex w-full items-center gap-2'>
      {/* Barra de pesquisa ocupa toda a faixa à esquerda dos ícones/botões */}
      <div className='relative h-10 min-w-0 flex-1'>
        <SearchIcon className='text-muted-foreground pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2' />
        <Input
          placeholder='Pesquisar...'
          value={value.search ?? ''}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className='h-full w-full pl-8'
        />
      </div>

      {/* Controles à direita — altura fixa para alinhamento vertical */}
      <div className='ml-auto flex h-10 shrink-0 items-center gap-2'>
        <Button
          tooltip='Sincronizar lista de motoristas e cargas da competência'
          variant='outline'
          size='sm'
          className='h-10 gap-2'
          disabled={!competencia || isFetching || sincronizando}
          onClick={async () => {
            if (!competencia || !onSincronizar) return;
            setSincronizando(true);
            try {
              await onSincronizar(competencia);
            } finally {
              setSincronizando(false);
            }
          }}
        >
          <CloudDownload className={`h-4 w-4 shrink-0 ${sincronizando ? 'animate-pulse' : ''}`} />
          {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
        </Button>

        <Button
          tooltip='Atualizar'
          variant='outline'
          size='icon'
          className='h-10 w-10 shrink-0'
          disabled={isFetching}
          onClick={onRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>

        <MonthYearSelector
          showClearButton
          placeholder='Mês/Ano'
          className='h-10 max-w-32 shrink-0'
          selected={competenciaDate ?? undefined}
          onSelect={handleCompetenciaChange}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='icon' className='h-10 w-10 shrink-0'>
              <EllipsisVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='hover:cursor-pointer'
              disabled={isFetching}
              onClick={onRefresh}
            >
              <RefreshCw className={isFetching ? 'animate-spin mr-2 h-4 w-4' : 'mr-2 h-4 w-4'} />
              Atualizar lista
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='icon' className='h-10 w-10 shrink-0' tooltip='Filtrar'>
              <ListFilter className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS.map((s) => (
              <DropdownMenuItem
                key={s.value}
                className='hover:cursor-pointer'
                onSelect={(e) => {
                  e.preventDefault();
                  onChange({ ...value, status: s.value as FechamentoStatus | 'TODOS' });
                }}
              >
                {(value.status ?? 'TODOS') === s.value ? '✓ ' : ''}{s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
