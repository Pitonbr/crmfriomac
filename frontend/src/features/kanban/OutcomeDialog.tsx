import { useState } from 'react';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import { useConcluirLead, useUpdateLead } from '@/hooks/queries/useLeads';
import type { Lead } from '@/api/schemas';
import { formatBRL } from '@/lib/formatters';

const MOTIVOS_PERDA = [
  'Preço muito alto',
  'Concorrência',
  'Cliente sem verba',
  'Cliente desistiu',
  'Produto inadequado',
  'Sem resposta',
  'Outro',
];

interface Props {
  lead: Lead;
  initialTab?: 'ganho' | 'perdido';
  onClose: () => void;
  onSuccess: () => void;
}

export function OutcomeDialog({ lead, initialTab = 'ganho', onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'ganho' | 'perdido'>(initialTab);
  const concluir = useConcluirLead();
  const updateLead = useUpdateLead();

  // Ganho fields
  const [valorFinal, setValorFinal] = useState(String(lead.valor));
  const [formaPgto, setFormaPgto] = useState(lead.forma_pagamento ?? '');
  const [valorEntrada, setValorEntrada] = useState(
    lead.valor_entrada != null ? String(lead.valor_entrada) : '',
  );
  const [prazoEntrega, setPrazoEntrega] = useState('');

  // Perdido fields
  const [motivoSelecionado, setMotivoSelecionado] = useState('');
  const [detalhePerda, setDetalhePerda] = useState(lead.motivo_perda ?? '');

  const handleGanho = async () => {
    try {
      const updatePayload: Record<string, unknown> = {};
      const vf = parseFloat(valorFinal.replace(/[^\d,.]/, '').replace(',', '.'));
      if (!Number.isNaN(vf) && vf !== lead.valor) updatePayload.valor = vf;
      if (formaPgto) updatePayload.forma_pagamento = formaPgto;
      if (valorEntrada) {
        const ve = parseFloat(valorEntrada.replace(/[^\d,.]/, '').replace(',', '.'));
        if (!Number.isNaN(ve)) updatePayload.valor_entrada = ve;
      }

      if (Object.keys(updatePayload).length > 0) {
        await updateLead.mutateAsync({ leadId: lead.id, payload: updatePayload });
      }

      await concluir.mutateAsync({ leadId: lead.id, resultado: 'ganho' });
      toast.success('🏆 Venda concretizada! Parabéns!');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao concluir');
    }
  };

  const handlePerdido = async () => {
    const motivo = motivoSelecionado || detalhePerda.trim();
    if (!motivo) {
      toast.warning('Informe o motivo da perda');
      return;
    }
    try {
      await concluir.mutateAsync({
        leadId: lead.id,
        resultado: 'perdido',
        motivo_perda: `${motivoSelecionado}${detalhePerda ? ` — ${detalhePerda}` : ''}`.trim(),
      });
      toast.warning('Lead marcado como perdido');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao concluir');
    }
  };

  const isPending = concluir.isPending || updateLead.isPending;

  return (
    <Dialog
      open
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Decisão Final"
      description={`Lead #${lead.codigo} — ${formatBRL(lead.valor)}`}
      width={520}
    >
      {/* Tabs */}
      <div className="od-tabs">
        <button
          type="button"
          className={`od-tab ganho${tab === 'ganho' ? ' active' : ''}`}
          onClick={() => setTab('ganho')}
        >
          🏆 Ganho
        </button>
        <button
          type="button"
          className={`od-tab perdido${tab === 'perdido' ? ' active' : ''}`}
          onClick={() => setTab('perdido')}
        >
          ✗ Perdido
        </button>
      </div>

      {tab === 'ganho' && (
        <div className="od-form">
          <p style={{ fontSize: '.82rem', color: 'var(--text-2)' }}>
            Confirme os dados da venda antes de concretizar.
          </p>
          <div className="od-grid-2">
            <div className="od-field">
              <label>Valor Final (R$)</label>
              <input
                type="text"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
              />
            </div>
            <div className="od-field">
              <label>Forma de Pagamento</label>
              <select value={formaPgto} onChange={(e) => setFormaPgto(e.target.value)}>
                <option value="">Selecionar...</option>
                <option>À vista</option>
                <option>Boleto</option>
                <option>Parcelado</option>
                <option>Financiamento</option>
                <option>Outro</option>
              </select>
            </div>
          </div>
          <div className="od-grid-2">
            <div className="od-field">
              <label>Valor de Entrada (R$)</label>
              <input
                type="text"
                placeholder="Opcional"
                value={valorEntrada}
                onChange={(e) => setValorEntrada(e.target.value)}
              />
            </div>
            <div className="od-field">
              <label>Prazo de Entrega</label>
              <input
                type="text"
                placeholder="Ex: 30 dias"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
              />
            </div>
          </div>
          <div className="od-submit-row">
            <button type="button" className="od-btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="od-btn-ganho"
              disabled={isPending}
              onClick={() => void handleGanho()}
            >
              {isPending ? 'Salvando...' : '🏆 Confirmar Venda'}
            </button>
          </div>
        </div>
      )}

      {tab === 'perdido' && (
        <div className="od-form">
          <div className="od-field">
            <label>Motivo da Perda</label>
            <div className="od-motivos">
              {MOTIVOS_PERDA.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`od-motivo${motivoSelecionado === m ? ' selected' : ''}`}
                  onClick={() => setMotivoSelecionado(motivoSelecionado === m ? '' : m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="od-field">
            <label>Detalhes (opcional)</label>
            <textarea
              rows={3}
              placeholder="Descreva o que aconteceu..."
              value={detalhePerda}
              onChange={(e) => setDetalhePerda(e.target.value)}
            />
          </div>
          <div className="od-submit-row">
            <button type="button" className="od-btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="od-btn-perdido"
              disabled={isPending}
              onClick={() => void handlePerdido()}
            >
              {isPending ? 'Salvando...' : '✗ Marcar como Perdido'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
