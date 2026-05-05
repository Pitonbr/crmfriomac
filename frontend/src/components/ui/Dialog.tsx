/**
 * Wrapper sobre Radix Dialog — resolve ARIA + focus trap + ESC + portal de uma só vez.
 * Mantém aparência consistente com .modal-overlay/.modal do CSS legado.
 */
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { Icon } from './Icon';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Largura do modal (default 600). */
  width?: number | string;
}

export function Dialog({ open, onOpenChange, title, description, children, width = 720 }: Props) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className="modal-overlay"
          style={{ display: 'flex', opacity: 1, visibility: 'visible' }}
        />
        <RadixDialog.Content
          className="modal"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10000,
            width,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <RadixDialog.Title
                style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-1)' }}
              >
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description
                  style={{ fontSize: '.85rem', color: 'var(--text-2)', marginTop: 2 }}
                >
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Fechar"
              style={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                color: 'var(--text-2)',
              }}
            >
              <Icon icon={X} label="Fechar" size={20} />
            </RadixDialog.Close>
          </header>

          <div style={{ padding: 24 }}>{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
