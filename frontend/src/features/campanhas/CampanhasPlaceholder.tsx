import '@/features/clientes/clientes.css';

export function CampanhasPlaceholder() {
  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Campanhas & Mídias</h1>
      </div>
      <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
        <h2 style={{ marginBottom: 8 }}>Em construção</h2>
        <p style={{ color: 'var(--text-2)' }}>
          Implementação prevista para o Sprint 5 (junto com integrações de email e WhatsApp Business).
        </p>
      </div>
    </div>
  );
}
