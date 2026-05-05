import { useCurrentUser } from '@/hooks/useAuth';
import { useStages } from '@/hooks/queries/useStages';

import '@/features/clientes/clientes.css';

export function ConfigPage() {
  const { data: user } = useCurrentUser();
  const { data: stages } = useStages();

  return (
    <div className="page-padded">
      <div className="page-toolbar">
        <h1>Configurações</h1>
      </div>

      <section className="table-wrap" style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 8, fontSize: '.95rem' }}>Perfil corrente</h3>
        <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: '.875rem' }}>
          <dt style={{ color: 'var(--text-3)' }}>Nome</dt>
          <dd>{user?.nome}</dd>
          <dt style={{ color: 'var(--text-3)' }}>Email</dt>
          <dd>{user?.email}</dd>
          <dt style={{ color: 'var(--text-3)' }}>Papel</dt>
          <dd>{user?.role}</dd>
          <dt style={{ color: 'var(--text-3)' }}>Tenant ID</dt>
          <dd><code>{user?.tenant_id}</code></dd>
        </dl>
      </section>

      <section className="table-wrap">
        <h3 style={{ padding: '16px 20px 0', fontSize: '.95rem' }}>Estágios do funil</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Slug</th>
              <th>Label</th>
              <th>SLA (h)</th>
              <th>Probabilidade</th>
              <th>Cor</th>
            </tr>
          </thead>
          <tbody>
            {(stages ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.ordem}</td>
                <td><code>{s.slug}</code></td>
                <td>{s.icone} {s.label}</td>
                <td>{s.sla_horas}</td>
                <td>{s.prob_pct}%</td>
                <td>
                  <span style={{ display: 'inline-block', width: 16, height: 16, background: s.cor, borderRadius: 3, marginRight: 6, verticalAlign: 'middle' }} />
                  <code>{s.cor}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-wrap" style={{ padding: 20 }}>
        <h3 style={{ marginBottom: 8, fontSize: '.95rem' }}>Painel administrativo</h3>
        <p style={{ fontSize: '.875rem', color: 'var(--text-2)', marginBottom: 12 }}>
          Acesso a CRUD direto de todas as tabelas (somente master).
        </p>
        <a
          href="/admin"
          target="_blank"
          rel="noopener"
          className="btn btn-primary"
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            background: 'var(--primary)',
            color: 'white',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '.875rem',
          }}
        >
          Abrir SQLAdmin →
        </a>
      </section>
    </div>
  );
}
