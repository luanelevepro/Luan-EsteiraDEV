import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FechamentoResumoResponse } from './types';

function formatCurrencyBR(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export default function FechamentoSummaryCards({ resumo }: { resumo?: FechamentoResumoResponse }) {
  const r = resumo ?? { total_motoristas: 0, total_fechados: 0, total_pendentes: 0, total_liquido: 0 };

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
      <Card>
        <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Motoristas</CardTitle></CardHeader>
        <CardContent><div className='text-2xl font-semibold'>{r.total_motoristas}</div></CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Fechados</CardTitle></CardHeader>
        <CardContent><div className='text-2xl font-semibold'>{r.total_fechados}</div></CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Pendentes</CardTitle></CardHeader>
        <CardContent><div className='text-2xl font-semibold'>{r.total_pendentes}</div></CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-2'><CardTitle className='text-sm font-medium'>Total líquido</CardTitle></CardHeader>
        <CardContent><div className='text-2xl font-semibold'>{formatCurrencyBR(r.total_liquido)}</div></CardContent>
      </Card>
    </div>
  );
}
