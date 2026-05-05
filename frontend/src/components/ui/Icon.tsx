import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  /** Acessibilidade: SE o ícone carrega significado, defina label. Senão, deixe undefined → aria-hidden. */
  label?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/** Wrapper sobre Lucide forçando ARIA correto: aria-label se label, aria-hidden se decorativo. */
export function Icon({ icon: Icon, label, size = 18, className, strokeWidth = 2 }: Props) {
  if (label) {
    return (
      <Icon
        size={size}
        className={className}
        strokeWidth={strokeWidth}
        role="img"
        aria-label={label}
      />
    );
  }
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
