import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

import type { Stage } from '@/api/schemas';

interface Props {
  stage: Stage;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ stage, count, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div ref={setNodeRef} className={`kb-column${isOver ? ' drop-active' : ''}`}>
      <div className="kb-col-header" style={{ borderTopColor: stage.cor, borderTopWidth: 3, borderTopStyle: 'solid' }}>
        {stage.icone && <span aria-hidden>{stage.icone}</span>}
        <span className="kb-col-title">{stage.label}</span>
        <span className="kb-col-count" aria-label={`${count} leads`}>
          {count}
        </span>
      </div>
      <div className="kb-col-body">{children}</div>
    </div>
  );
}
