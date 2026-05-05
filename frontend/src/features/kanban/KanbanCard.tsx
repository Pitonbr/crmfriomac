import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';

import type { Cliente, Lead } from '@/api/schemas';
import { formatBRL } from '@/lib/formatters';

interface Props {
  lead: Lead;
  cliente?: Cliente;
}

const PRIO_LABEL: Record<string, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export function KanbanCard({ lead, cliente }: Props) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
  };

  const titulo = cliente?.nome_fantasia ?? `Cliente ${lead.cliente_id.slice(0, 8)}`;

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`kb-card${isDragging ? ' dragging' : ''}`}
      style={style}
      onClick={(e) => {
        // Só navega se não estiver arrastando
        if (!isDragging) {
          e.preventDefault();
          navigate(`/kanban/leads/${lead.id}`);
        }
      }}
      aria-label={`Lead ${lead.codigo} — ${titulo}, ${formatBRL(lead.valor)}`}
      {...listeners}
      {...attributes}
    >
      <div className="kb-card-codigo">#{lead.codigo}</div>
      <h3 className="kb-card-titulo">{titulo}</h3>
      <div className="kb-card-valor">{formatBRL(lead.valor)}</div>
      {lead.projeto && (
        <div style={{ fontSize: '.75rem', color: 'var(--text-3)' }}>{lead.projeto}</div>
      )}
      <span className={`kb-card-prio ${lead.prioridade}`}>
        {PRIO_LABEL[lead.prioridade] ?? lead.prioridade}
      </span>
      {lead.tags.length > 0 && (
        <div className="kb-card-meta">
          {lead.tags.slice(0, 3).map((t) => (
            <span key={t} className="kb-card-tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
