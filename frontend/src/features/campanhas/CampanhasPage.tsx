import { useState } from 'react';
import '@/features/clientes/clientes.css';

type Tab = 'campanhas' | 'midia' | 'solicitarmkt' | 'repositorio' | 'comunicados';

const isAdmin = true;

const MOCK_CAMPANHAS = [
  {
    id: '1',
    titulo: 'Campanha Câmaras Frias Premium',
    descricao: 'Incentivo para representantes que atingirem meta de câmaras frias premium no trimestre.',
    dataInicio: '01/01/2026',
    dataFim: '31/03/2026',
    meta: 'R$ 180.000',
    status: 'ativa',
  },
  {
    id: '2',
    titulo: 'Super Sprint — Abril',
    descricao: 'Dobro de pontos para fechamentos acima de R$ 30.000 no mês de abril.',
    dataInicio: '01/04/2026',
    dataFim: '30/04/2026',
    meta: 'R$ 240.000',
    status: 'ativa',
  },
  {
    id: '3',
    titulo: 'Black Friday Friomac 2025',
    descricao: 'Campanha especial de novembro com condições diferenciadas para distribuidores.',
    dataInicio: '01/11/2025',
    dataFim: '30/11/2025',
    meta: 'R$ 320.000',
    status: 'encerrada',
  },
];

const MOCK_MIDIA = [
  {
    id: '1',
    titulo: 'Post Câmara Fria Industrial — Instagram',
    data: '28/04/2026',
    plataforma: 'Instagram',
  },
  {
    id: '2',
    titulo: 'Stories Promoção Maio — WhatsApp',
    data: '30/04/2026',
    plataforma: 'WhatsApp',
  },
  {
    id: '3',
    titulo: 'Vídeo Institucional — YouTube',
    data: '15/04/2026',
    plataforma: 'YouTube',
  },
];

const MOCK_SOLICITACOES = [
  {
    id: '1',
    titulo: 'Arte para WhatsApp — Promoção Maio',
    solicitante: 'Caio Victor',
    data: '25/04/2026',
    observacao: 'Preciso de arte para enviar promoção de câmara fria para a base de clientes.',
    status: 'pendente',
  },
  {
    id: '2',
    titulo: 'Vídeo Institucional — Instagram Reels',
    solicitante: 'Felipe Crescente',
    data: '18/04/2026',
    observacao: 'Vídeo curto mostrando câmara fria premium em funcionamento.',
    status: 'aprovada',
  },
  {
    id: '3',
    titulo: 'Banner para Feira de Negócios',
    solicitante: 'Lauriberto Volpiano',
    data: '10/04/2026',
    observacao: 'Banner 2x1m para estande da Friomac na feira de refrigeração.',
    status: 'recusada',
  },
];

const MOCK_REPOSITORIO = [
  {
    id: '1',
    nome: 'Catalogo_Friomac_2026.pdf',
    categoria: 'Catálogo',
    data: '01/03/2026',
    tamanho: '4.2 MB',
  },
  {
    id: '2',
    nome: 'Tabela_Precos_Abril_2026.xlsx',
    categoria: 'Tabela de Preços',
    data: '01/04/2026',
    tamanho: '840 KB',
  },
  {
    id: '3',
    nome: 'Fotos_Camara_Fria_Premium.zip',
    categoria: 'Fotos',
    data: '15/03/2026',
    tamanho: '18 MB',
  },
  {
    id: '4',
    nome: 'Apresentacao_Comercial_2026.pptx',
    categoria: 'Apresentação',
    data: '05/04/2026',
    tamanho: '6.1 MB',
  },
];

const MOCK_COMUNICADOS = [
  {
    id: '1',
    titulo: 'Reajuste de Preços — Vigor Imediato',
    corpo: 'A partir de 01/05/2026, a nova tabela de preços está em vigor. Todos os orçamentos devem utilizar exclusivamente a versão atualizada disponível no Repositório.',
    data: '30/04/2026',
    autor: 'Alex Piton',
    destinatarios: 'Todos os vendedores',
    urgencia: 'urgente',
    lido: false,
  },
  {
    id: '2',
    titulo: 'Treinamento — Câmara Fria Industrial',
    corpo: 'Haverá treinamento online sobre os novos modelos de câmaras frias industriais na próxima terça-feira, 06/05 às 14h. Participação obrigatória para representantes.',
    data: '28/04/2026',
    autor: 'Matheus Moraes',
    destinatarios: 'Representantes',
    urgencia: 'normal',
    lido: true,
  },
  {
    id: '3',
    titulo: 'Meta de Abril — Resultado Final',
    corpo: 'Fechamos abril com 94% da meta atingida. Parabéns à equipe! Os resultados completos serão apresentados na reunião de segunda-feira.',
    data: '01/05/2026',
    autor: 'Alex Piton',
    destinatarios: 'Todos',
    urgencia: 'normal',
    lido: false,
  },
];

const BADGE_STATUS: Record<string, string> = {
  ativa: 'badge-success',
  encerrada: 'badge-muted',
  pendente: 'badge-warning',
  aprovada: 'badge-success',
  recusada: 'badge-danger',
};

const LABEL_STATUS: Record<string, string> = {
  ativa: 'ativa',
  encerrada: 'encerrada',
  pendente: 'pendente',
  aprovada: 'aprovada',
  recusada: 'recusada',
};

function EmptyState() {
  return (
    <div className="camp-empty" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-3)' }}>
      <div className="camp-empty-icon" style={{ fontSize: '2rem', marginBottom: 12 }}>🎯</div>
      <p>Nenhum item ainda.</p>
    </div>
  );
}

function TabCampanhas() {
  const [lista, setLista] = useState(MOCK_CAMPANHAS);

  return (
    <div>
      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        lista.map((c) => (
          <div
            key={c.id}
            className="camp-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              display: 'flex',
              gap: 16,
              marginBottom: 12,
              alignItems: 'flex-start',
            }}
          >
            <div
              className="camp-card-icon"
              style={{
                width: 46,
                height: 46,
                borderRadius: 'var(--radius)',
                fontSize: '1.4rem',
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              🏆
            </div>
            <div className="camp-card-body" style={{ flex: 1 }}>
              <div
                className="camp-card-title"
                style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: 4 }}
              >
                {c.titulo}
              </div>
              <div className="camp-card-desc" style={{ fontSize: '.84rem', color: 'var(--text-2)', marginBottom: 6 }}>
                {c.descricao}
              </div>
              <div className="camp-card-meta" style={{ fontSize: '.78rem', color: 'var(--text-3)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                📅 {c.dataInicio} → {c.dataFim} · 🎯 {c.meta} ·{' '}
                <span className={`badge ${BADGE_STATUS[c.status] ?? 'badge-muted'}`}>
                  {LABEL_STATUS[c.status] ?? c.status}
                </span>
              </div>
            </div>
            <div className="camp-card-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm">Editar</button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger)' }}
                onClick={() => setLista((prev) => prev.filter((x) => x.id !== c.id))}
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TabMidia() {
  const lista = MOCK_MIDIA;

  return (
    <div>
      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        lista.map((m) => (
          <div
            key={m.id}
            className="camp-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              display: 'flex',
              gap: 16,
              marginBottom: 12,
              alignItems: 'center',
            }}
          >
            <div
              className="camp-card-icon"
              style={{
                width: 46,
                height: 46,
                borderRadius: 'var(--radius)',
                fontSize: '1.4rem',
                background: 'var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              📱
            </div>
            <div className="camp-card-body" style={{ flex: 1 }}>
              <div
                className="camp-card-title"
                style={{ fontSize: '.95rem', fontWeight: 700, marginBottom: 4 }}
              >
                {m.titulo}
              </div>
              <div className="camp-card-meta" style={{ fontSize: '.78rem', color: 'var(--text-3)' }}>
                📅 {m.data} · 📌 {m.plataforma}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TabSolicitarMKT() {
  const [lista, setLista] = useState(MOCK_SOLICITACOES);

  function aprovar(id: string) {
    setLista((prev) => prev.map((s) => s.id === id ? { ...s, status: 'aprovada' } : s));
  }

  function recusar(id: string) {
    setLista((prev) => prev.map((s) => s.id === id ? { ...s, status: 'recusada' } : s));
  }

  return (
    <div>
      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        lista.map((s) => (
          <div
            key={s.id}
            className="solic-card"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              gap: 14,
              marginBottom: 10,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>📄</div>
            <div className="solic-card-info" style={{ flex: 1 }}>
              <div className="solic-card-title" style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: 4 }}>
                {s.titulo}
              </div>
              <div className="solic-card-sub" style={{ fontSize: '.8rem', color: 'var(--text-3)', marginBottom: 2 }}>
                Solicitado por: <strong>{s.solicitante}</strong> · {s.data}
              </div>
              <div className="solic-card-sub" style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>
                {s.observacao}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <span className={`badge ${BADGE_STATUS[s.status] ?? 'badge-muted'}`}>
                {LABEL_STATUS[s.status] ?? s.status}
              </span>
              {isAdmin && s.status === 'pendente' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)' }} onClick={() => aprovar(s.id)}>
                    Aprovar
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => recusar(s.id)}>
                    Recusar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TabRepositorio() {
  const [lista, setLista] = useState(MOCK_REPOSITORIO);

  return (
    <div>
      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        lista.map((f) => (
          <div
            key={f.id}
            className="repo-item"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              display: 'flex',
              gap: 14,
              marginBottom: 8,
              alignItems: 'center',
            }}
          >
            <div className="repo-item-icon" style={{ fontSize: '1.5rem', flexShrink: 0 }}>📄</div>
            <div className="repo-item-info" style={{ flex: 1 }}>
              <div className="repo-item-name" style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 4 }}>
                {f.nome}
              </div>
              <div className="repo-item-meta" style={{ fontSize: '.78rem', color: 'var(--text-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span
                  className="repo-tag"
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: '.7rem',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {f.categoria}
                </span>
                {f.data} · {f.tamanho}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm">⬇ Baixar</button>
              {isAdmin && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => setLista((prev) => prev.filter((x) => x.id !== f.id))}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function TabComunicados() {
  const [lista, setLista] = useState(MOCK_COMUNICADOS);

  function marcarLido(id: string) {
    setLista((prev) => prev.map((c) => c.id === id ? { ...c, lido: true } : c));
  }

  return (
    <div>
      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        lista.map((c) => (
          <div
            key={c.id}
            className={`comunicado-card${c.urgencia === 'urgente' ? ' urgente' : ''}`}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${c.urgencia === 'urgente' ? 'var(--danger)' : 'var(--primary)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              marginBottom: 12,
            }}
          >
            <div
              className="comunicado-header"
              style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}
            >
              <div className="comunicado-title" style={{ fontWeight: 700, fontSize: '.95rem', flex: 1 }}>
                {!c.lido && '🔵 '}
                {c.titulo}
              </div>
              {c.urgencia === 'urgente' && (
                <span className="badge badge-danger">URGENTE</span>
              )}
            </div>
            <div
              className="comunicado-body"
              style={{ fontSize: '.84rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}
            >
              {c.corpo}
            </div>
            <div
              className="comunicado-meta"
              style={{ display: 'flex', gap: 16, fontSize: '.74rem', color: 'var(--text-3)', flexWrap: 'wrap', alignItems: 'center' }}
            >
              <span>📅 {c.data}</span>
              <span>👤 {c.autor}</span>
              <span>👥 {c.destinatarios}</span>
              <span>✓ Lidos: {c.lido ? 1 : 0}</span>
              {!isAdmin && !c.lido && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => marcarLido(c.id)}
                >
                  Marcar como lido
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function CampanhasPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campanhas');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'campanhas',    label: 'Campanhas',     icon: '🏆' },
    { id: 'midia',        label: 'Mídia Social',  icon: '📱' },
    { id: 'solicitarmkt', label: 'Solicitar MKT', icon: '🖨' },
    { id: 'repositorio',  label: 'Repositório',   icon: '📁' },
    { id: 'comunicados',  label: 'Comunicados',   icon: '📣' },
  ];

  return (
    <div className="page-padded">
      <div
        className="camp-section-tabs"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`camp-tab-btn${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              gap: 8,
              padding: '10px 18px',
              border: `1.5px solid ${activeTab === tab.id ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              fontSize: '.84rem',
              fontWeight: 600,
              color: activeTab === tab.id ? '#fff' : 'var(--text-2)',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              cursor: 'pointer',
              alignItems: 'center',
            }}
          >
            <span className="camp-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'campanhas'    && <TabCampanhas />}
      {activeTab === 'midia'        && <TabMidia />}
      {activeTab === 'solicitarmkt' && <TabSolicitarMKT />}
      {activeTab === 'repositorio'  && <TabRepositorio />}
      {activeTab === 'comunicados'  && <TabComunicados />}
    </div>
  );
}
