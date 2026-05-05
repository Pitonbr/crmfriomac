interface Props {
  size?: number;
  label?: string;
}

export function Spinner({ size = 20, label = 'Carregando' }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: '2px solid var(--border-2)',
        borderTopColor: 'var(--primary)',
        borderRadius: '50%',
        animation: 'spinner-rotate 0.8s linear infinite',
      }}
    >
      <style>{`@keyframes spinner-rotate { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
