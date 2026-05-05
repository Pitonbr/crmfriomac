import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

import type { Cliente } from '@/api/schemas';
import { Spinner } from '@/components/ui/Spinner';
import { useClientes } from '@/hooks/queries/useClientes';
import { useLeads } from '@/hooks/queries/useLeads';
import { useStages } from '@/hooks/queries/useStages';
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime';

import { KanbanBoard } from './KanbanBoard';
import './styles.css';

export function KanbanPage() {
  useLeadsRealtime();

  const [busca, setBusca] = useState('');
  const stages = useStages();
  const leads = useLeads();
  const clientes = useClientes();

  const clientesById = useMemo(() => {
    const m = new Map<string, Cliente>();
    (clientes.data ?? []).forEach((c) => m.set(c.id, c));
    return m;
  }, [clientes.data]);

  const filteredLeads = useMemo(() => {
    if (!busca.trim()) return leads.data ?? [];
    const q = busca.toLowerCase();
    return (leads.data ?? []).filter((l) => {
      const cli = clientesById.get(l.cliente_id);
      return (
        l.codigo.toLowerCase().includes(q) ||
        (l.projeto?.toLowerCase().includes(q) ?? false) ||
        (cli?.nome_fantasia.toLowerCase().includes(q) ?? false)
      );
    });
  }, [busca, leads.data, clientesById]);

  if (stages.isPending || leads.isPending || clientes.isPending) {
    return (
      <div className="kb-loading">
        <Spinner label="Carregando funil de vendas" />
      </div>
    );
  }

  if (stages.isError || leads.isError) {
    return (
      <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--danger)' }}>
          Erro ao carregar dados. Verifique conexão e tente novamente.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="kb-toolbar">
        <h1>Gestão de Leads</h1>
        <input
          type="search"
          placeholder="Buscar por código, projeto, cliente..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Busca de leads"
        />
        <span style={{ fontSize: '.8rem', color: 'var(--text-2)' }}>
          {filteredLeads.length} de {(leads.data ?? []).length} leads
        </span>
      </div>

      <KanbanBoard
        stages={stages.data ?? []}
        leads={filteredLeads}
        clientes={clientesById}
      />

      {/* Modal route renderiza aqui quando rota /kanban/leads/:id ativa */}
      <Outlet />
    </>
  );
}
