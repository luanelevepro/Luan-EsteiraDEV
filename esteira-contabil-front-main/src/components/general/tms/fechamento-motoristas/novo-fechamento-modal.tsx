import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { MonthYearSelector } from '@/components/ui/month-year-selector';

type MotoristaOption = {
  id: string;
  nome: string;
  documento?: string | null;
};

export default function NovoFechamentoModal({
  open,
  onOpenChange,
  motoristas,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  motoristas: MotoristaOption[];
  onCreate: (motoristaId: string, competencia: string) => Promise<void>;
}) {
  const [motoristaId, setMotoristaId] = useState('');
  const [competenciaDate, setCompetenciaDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  // Corrige bug do Radix: ao fechar Dialog, pointer-events/overflow podem ficar bloqueando cliques
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
      document.documentElement.style.pointerEvents = '';
      document.documentElement.style.overflow = '';
      document.querySelectorAll('[data-slot="dialog-overlay"], [data-slot="dialog-portal"], [data-slot="select-content"]').forEach((el) => {
        (el as HTMLElement).style.pointerEvents = 'none';
      });
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motoristaId || !competenciaDate) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const year = competenciaDate.getFullYear();
      const month = String(competenciaDate.getMonth() + 1).padStart(2, '0');
      const competencia = `${year}-${month}`;
      
      await onCreate(motoristaId, competencia);
      toast.success('Fechamento criado com sucesso');
      setMotoristaId('');
      setCompetenciaDate(undefined);
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao criar fechamento';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Novo Fechamento</DialogTitle>
          <DialogDescription>Crie um novo fechamento para um motorista e competência.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='motorista'>Motorista</Label>
              <select
                id='motorista'
                value={motoristaId}
                onChange={(e) => setMotoristaId(e.target.value)}
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                required
              >
                <option value=''>Selecione um motorista</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} {m.documento ? `(${m.documento})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='competencia'>Competência</Label>
              <MonthYearSelector
                showClearButton
                placeholder='Mês/Ano'
                className='w-full'
                selected={competenciaDate}
                onSelect={setCompetenciaDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
