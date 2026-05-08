import { useState } from 'react';

import '@/features/clientes/clientes.css';

type Tab = 'campanhas' | 'solicitacoes' | 'repositorio' | 'comunicados';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'campanhas',    label: 'Campanhas',         icon: '🎯' },
  { id: 'solicitacoes', label: 'Solicitações MKT',  icon: '📋' },
  { id: 'repositorio',  label: 'Repositório MKT',   icon: '📁' },
  { id: 'comunicados',  label: 'Comunicados',        icon: '📢' },
];

// ── Dados mock enquanto o backend de campanhas é implementado ──────────
const MOCK_CAMPANHAS = [
  { id: '1', titulo: 'Google Ads — Câmaras Frias', status: 'ativa', inicio: '2026-01-01', orcamento: 6500, leads: 62 },
  { id: '2', titulo: 'Instagram — Equipamentos Inox', status: 'ativa', inicio: '2026-02-01', orcamento: 3000, leads: 28 },
  { id: '3', titulo: 'Facebook Leads Ads', status: 'pausada', inicio: '2026-03-01', orcamento: 2000, leads: 15 },
];

const MOCK_SOLICITACOES = [
  { id: '1', tipo: 'Arte para WhatsApp', solicitante: 'Caio Victor', data: '2026-04-10', status: 'pendente', descricao: 'Preciso de arte para enviar promoção de câmara fria p/ base de clientes.' },
  { id: '2', tipo: 'Vídeo Institucional', solicitante: 'Felipe Crescente', data: '2026-04-15', status: 'em_andamento', descricao: 'Vídeo curto para Instagram mostrando câmara fria em funcionamento.' },
  { id: '3', tipo: 'Apresentação Comercial', solicitante: 'Lauriberto Volpiano', data: '2026-04-20', status: 'concluida', descricao: 'Apresentação PDF atualizada com novos modelos 2026.' },
];

const MOCK_REPOSITORIO = [
  { id: '1', nome: 'Catálogo Friomac 2026.pdf', tipo: 'PDF', tamanho: '4.2 MB', data: '2026-03-01' },
  { id: '2', nome: 'Tabela de Preços Março.xlsx', tipo: 'Excel', tamanho: '840 KB', data: '2026-03-15' },
  { id: '3', nome: 'Fotos Câmara Fria Premium.zip', tipo: 'ZIP', tamanho: '18 MB', data: '2026-04-01' },
  { id: '4', nome: 'Apresentação Comercial 2026.pptx', tipo: 'PowerPoint', tamanho: '6.1 MB', data: '2026-04-05' },
];

const MOCK_COMUNICADOS = [
  {
    id: '1', urgencia: 'alta', titulo: 'Nova Tabela de Preços em Vigor',
    corpo: 'A partir de 01/04/2026 a nova tabela de preços está em vigor. Todos os orçamentos devem usar a versão atualizada disponível no repositório.',
    autor: 'Matheus Moraes', data: '2026-03-28', destinatarios: 'Todos os vendedores',
  },
  {
    id: '2', urgencia: 'media', titulo: 'Treinamento Produto — Câmara Fria Industrial',
    corpo: 'Haverá treinamento online sobre os novos modelos de câmaras frias industriais na próxima terça-feira, 15/04 às 14h. Participação obrigatória para representantes.',
    autor: 'Alex Piton', data: '2026-04-10', destinatarios: 'Representantes',
  },
  {
    id: '3', urgencia: 'baixa', titulo: 'Meta de Abril — Acompanhamento',
    corpo: 'Estamos a 68% da meta de abril. Faltam 12 dias para o final do mês. Foco nos leads em Follow Up e Orçamento Enviado.',
    autor: 'Alex Piton', data: '2026-04-18', destinatarios: 'Todos',
  },
];

const STATUS_BADGE: Record<string, string> = {
  ativa: 'badge-success', pausada: 'badge-warning', encerrada: 'badge-muted',
  pendente: 'badge-warning', em_andamento: 'badge-info', concluida: 'badge-success',
};

const URGENCIA_COLOR: Record<string, string> = {
  alta: 'var(--danger)', media: 'var(--warning)', baixa: 'var(--info)',
};

const TIPO_ICON: Record<string, string> = {
  PDF: '📄', Excel: '📊', ZIP: '📦', PowerPoint: '📊', Imagem: '🖼', Video: '🎬',
};

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

// ── Tab: Campanhas ─────────────────────────────────────────────────
function TabCampanhas() {
  return (
    <div>
      <div className="page-toolbar" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Campanhas Ativas</h2>
        <button className="btn btn-primary btn-sm" disabled title="Em breve">+ Nova Campanha</button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {MOCK_CAMPANHAS.map((c) => (
          <div key={c.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 20px',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.titulo}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-3)' }}>
                Início: {c.inicio} · Orçamento: {formatBRL(c.orcamento)}/mês · {c.leads} leads gerados
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${STATUS_BADGE[c.status] ?? 'badge-muted'}`}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Solicitações MKT ──────────────────────────────────────────
function TabSolicitacoes() {
  return (
    <div>
      <div className="page-toolbar" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Solicitações de Material</h2>
        <button className="btn btn-primary btn-sm" disabled title="Em breve">+ Nova Solicitação</button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {MOCK_SOLICITACOES.map((s) => (
          <div key={s.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 700 }}>{s.tipo}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '.8rem', marginLeft: 8 }}>
                  por {s.solicitante} · {s.data}
                </span>
              </div>
              <span className={`badge ${STATUS_BADGE[s.status] ?? 'badge-muted'}`}>{s.status}</span>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-2)', margin: 0 }}>{s.descricao}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Repositório MKT ───────────────────────────────────────────
function TabRepositorio() {
  return (
    <div>
      <div className="page-toolbar" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Repositório de Materiais</h2>
        <button className="btn btn-primary btn-sm" disabled title="Em breve">Upload arquivo</button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Tipo</th>
              <th>Tamanho</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_REPOSITORIO.map((f) => (
              <tr key={f.id}>
                <td>
                  <span style={{ marginRight: 8 }}>{TIPO_ICON[f.tipo] ?? '📄'}</span>
                  <strong>{f.nome}</strong>
                </td>
                <td><span className="badge badge-muted">{f.tipo}</span></td>
                <td style={{ color: 'var(--text-3)', fontSize: '.82rem' }}>{f.tamanho}</td>
                <td style={{ fontSize: '.82rem' }}>{f.data}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" disabled>Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Comunicados ───────────────────────────────────────────────
function TabComunicados() {
  return (
    <div>
      <div className="page-toolbar" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Comunicados</h2>
        <button className="btn btn-primary btn-sm" disabled title="Em breve">+ Novo Comunicado</button>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {MOCK_COMUNICADOS.map((c) => (
          <div key={c.id}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${URGENCIA_COLOR[c.urgencia] ?? 'var(--border)'}`,
              borderRadius: 'var(--radius)', padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{c.titulo}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: 2 }}>
                  {c.autor} · {c.data} · Para: {c.destinatarios}
                </div>
              </div>
              <span style={{
                fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase',
                color: URGENCIA_COLOR[c.urgencia], opacity: .8,
              }}>
                {c.urgencia}
              </span>
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-2)', margin: 0 }}>{c.corpo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export function CampanhasPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campanhas');

  return (
    <div className="page-padded">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: '.875rem', fontWeight: 600,
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-3)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2, transition: 'all .15s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'campanhas'    && <TabCampanhas />}
      {activeTab === 'solicitacoes' && <TabSolicitacoes />}
      {activeTab === 'repositorio'  && <TabRepositorio />}
      {activeTab === 'comunicados'  && <TabComunicados />}
    </div>
  );
}
