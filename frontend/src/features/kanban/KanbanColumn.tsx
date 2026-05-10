import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

import type { Stage } from '@/api/schemas';
import { formatBRL } from '@/lib/formatters';

interface Props {
  stage?: Stage;
  /** For non-stage columns (ganho/perdido) */
  customId?: string;
  customLabel?: string;
  customIcon?: string;
  customCor?: string;
  customClass?: string;
  count: number;
  totalValor?: number;
  children: ReactNode;
  droppable?: boolean;
}

export function KanbanColumn({
  stage,
  customId,
  customLabel,
  customIcon,
  customCor,
  customClass,
  count,
  totalValor,
  children,
  droppable = true,
}: Props) {
  const id = stage?.id ?? customId ?? 'none';
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !droppable });

  const label = stage?.label ?? customLabel ?? '';
  const icon = stage?.icone ?? customIcon ?? '';
  const cor = stage?.cor ?? customCor ?? '';

  return (
    <div
      ref={droppable ? setNodeRef : undefined}
      className={`kb-column${customClass ? ` ${customClass}` : ''}${isOver && droppable ? ' drop-active' : ''}`}
    >
      <div
        className="kb-col-header"
        style={{ borderTopColor: cor, borderTopWidth: 3, borderTopStyle: 'solid' }}
      >
        {icon && <span aria-hidden>{icon}</span>}
        <span className="kb-col-title">{label}</span>
        <span className="kb-col-count" aria-label={`${count} leads`}>
          {count}
        </span>
        {totalValor !== undefined && totalValor > 0 && (
          <span className="kb-col-total">{formatBRL(totalValor)}</span>
        )}
      </div>
      <div className="kb-col-body">{children}</div>
    </div>
  );
}
