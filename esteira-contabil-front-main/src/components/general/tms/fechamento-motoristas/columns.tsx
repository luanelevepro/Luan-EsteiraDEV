import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FechamentoMotoristaListItem, FechamentoStatus } from './types';

function statusVariant(s: FechamentoStatus): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  if (s === 'ABERTO') return 'info';
  if (s === 'FECHADO') return 'success';
  if (s === 'PENDENTE') return 'warning';
  if (s === 'REABERTO') return 'danger';
  return 'default';
}

function formatCurrencyBR(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function getFechamentoColumns(opts: { onOpenDetail: (row: FechamentoMotoristaListItem) => void }): ColumnDef<FechamentoMotoristaListItem>[] {
  return [
    {
      accessorKey: 'motorista_nome',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Motorista' />,
    },
    {
      accessorKey: 'competencia',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Competência' />,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      cell: ({ row }) => (
        <Badge className='cursor-default' variant={statusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'total_viagens',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Viagens' />,
    },
    {
      accessorKey: 'total_cargas',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Cargas' />,
    },
    {
      accessorKey: 'total_adiantamentos',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Adiantamentos' />,
      cell: ({ row }) => formatCurrencyBR(row.original.total_adiantamentos),
    },
    {
      accessorKey: 'total_liquido',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Líquido' />,
      cell: ({ row }) => <span className='font-semibold'>{formatCurrencyBR(row.original.total_liquido)}</span>,
    },
    {
      id: 'actions',
      header: () => null,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => opts.onOpenDetail(row.original)}>Ver detalhes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
