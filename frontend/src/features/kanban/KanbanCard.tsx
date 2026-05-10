import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

import type { Cliente, Lead, Representante } from '@/api/schemas';
import { formatBRL, formatRelative } from '@/lib/formatters';

interface Props {
  lead: Lead;
  cliente?: Cliente;
  rep?: Representante;
}

const PRIO_LABEL: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

function getSlaStatus(slaDeadline: string | null | undefined) {
  if (!slaDeadline) return null;
  const deadline = new Date(slaDeadline);
  const now = new Date();
  const diffH = (deadline.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 0) return { label: `${Math.abs(Math.ceil(diffH / 24))}d atrasado`, cls: 'atrasado' };
  if (diffH < 48) return { label: `${Math.ceil(diffH)}h`, cls: 'urgente' };
  return null;
}

function repInitials(nome: string): string {
  const parts = nome.trim().split(' ');
  const first = parts[0] ?? '';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? '';
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

function fileIconForContentType(mimeOrNome: string): string {
  if (mimeOrNome.includes('image')) return '🖼️';
  if (mimeOrNome.includes('pdf')) return '📄';
  if (mimeOrNome.includes('word') || mimeOrNome.includes('doc')) return '📝';
  if (mimeOrNome.includes('excel') || mimeOrNome.includes('sheet') || mimeOrNome.includes('xls')) return '📊';
  if (mimeOrNome.includes('zip') || mimeOrNome.includes('rar')) return '📦';
  return '📎';
}

export { fileIconForContentType };

export function KanbanCard({ lead, cliente, rep }: Props) {
  const navigate = useNavigate();
  const isOutcome = lead.status === 'ganho' || lead.status === 'perdido';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: isOutcome,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  const titulo = cliente?.nome_fantasia ?? `Cliente ${lead.cliente_id.slice(0, 8)}`;
  const sla = getSlaStatus(lead.sla_deadline);

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`kb-card status-${lead.status}${isDragging ? ' dragging' : ''}`}
      style={style}
      onClick={(e) => {
        if (!isDragging) {
          e.preventDefault();
          navigate(`/kanban/leads/${lead.id}`);
        }
      }}
      aria-label={`Lead ${lead.codigo} — ${titulo}, ${formatBRL(lead.valor)}`}
      {...(!isOutcome ? { ...listeners, ...attributes } : {})}
    >
      {/* Header row */}
      <div className="kb-card-header">
        <span className="kb-card-codigo">#{lead.codigo}</span>
        {sla && <span className={`kb-card-sla ${sla.cls}`}>{sla.label}</span>}
        {lead.status === 'ganho' && <span className="kb-card-outcome ganho">🏆 Ganho</span>}
        {lead.status === 'perdido' && <span className="kb-card-outcome perdido">✗ Perdido</span>}
      </div>

      <h3 className="kb-card-titulo">{titulo}</h3>
      <div className="kb-card-valor">{formatBRL(lead.valor)}</div>

      {lead.projeto && <div className="kb-card-projeto">{lead.projeto}</div>}

      {/* Meta row */}
      <div className="kb-card-meta">
        <div className="kb-card-left">
          <span className={`kb-card-prio ${lead.prioridade}`}>
            {PRIO_LABEL[lead.prioridade] ?? lead.prioridade}
          </span>
          {lead.tags.slice(0, 2).map((t) => (
            <span key={t} className="kb-card-tag">{t}</span>
          ))}
        </div>
      </div>

      {/* Footer row */}
      <div className="kb-card-footer">
        <span className="kb-card-date">{formatRelative(lead.data_ultima_movimentacao)}</span>
        {rep && (
          <span className="kb-card-rep" title={rep.nome}>
            {repInitials(rep.nome)}
          </span>
        )}
      </div>
    </button>
  );
}
