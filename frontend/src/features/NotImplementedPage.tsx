interface Props {
  titulo: string;
  sprint: string;
}

export function NotImplementedPage({ titulo, sprint }: Props) {
  return (
    <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
      <h2 style={{ marginBottom: 8 }}>{titulo}</h2>
      <p style={{ color: 'var(--text-2)' }}>Implementação prevista para o {sprint}.</p>
    </div>
  );
}
