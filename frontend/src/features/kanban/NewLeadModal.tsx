import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import type { Stage } from '@/api/schemas';
import { useClientes, useCreateCliente } from '@/hooks/queries/useClientes';
import { useCreateLead } from '@/hooks/queries/useLeads';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';

interface Props {
  stages: Stage[];
  onClose: () => void;
}

export function NewLeadModal({ stages, onClose }: Props) {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const createCliente = useCreateCliente();
  const { data: clientes } = useClientes();
  const { data: reps } = useRepresentantes();

  // Cliente state
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [novoCliente, setNovoCliente] = useState(false);

  // New client fields
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [nomeContato, setNomeContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');

  // Lead fields
  const defaultStageId = stages.find((s) => s.ordem === 1)?.id ?? stages[0]?.id ?? '';
  const [stageId, setStageId] = useState(defaultStageId);
  const [projeto, setProjeto] = useState('');
  const [valor, setValor] = useState('');
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta'>('media');
  const [repId, setRepId] = useState('');
  const [formaPgto, setFormaPgto] = useState('');
  const [obsInicial, setObsInicial] = useState('');

  const buscaRef = useRef<HTMLInputElement>(null);

  const clientesFiltrados = (clientes ?? []).filter((c) => {
    if (!clienteBusca.trim()) return false;
    const q = clienteBusca.toLowerCase();
    return (
      c.nome_fantasia.toLowerCase().includes(q) ||
      (c.nome_contato?.toLowerCase().includes(q) ?? false)
    );
  });

  const selectCliente = (c: { id: string; nome_fantasia: string }) => {
    setClienteId(c.id);
    setClienteSelecionado(c.nome_fantasia);
    setClienteBusca(c.nome_fantasia);
    setShowDropdown(false);
    setNovoCliente(false);
  };

  const handleSubmit = async () => {
    let finalClienteId = clienteId;

    // Create new client if needed
    if (novoCliente || !finalClienteId) {
      const name = novoCliente ? nomeFantasia.trim() : clienteBusca.trim();
      if (!name) {
        toast.warning('Informe o nome do cliente');
        return;
      }
      try {
        const created = await createCliente.mutateAsync({
          nome_fantasia: name,
          nome_contato: nomeContato || undefined,
          telefone: telefone || undefined,
          email: email || undefined,
          cidade: cidade || undefined,
        });
        finalClienteId = created.id;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar cliente');
        return;
      }
    }

    if (!finalClienteId) {
      toast.warning('Selecione ou crie um cliente');
      return;
    }

    if (!stageId) {
      toast.warning('Selecione uma etapa');
      return;
    }

    try {
      const lead = await createLead.mutateAsync({
        cliente_id: finalClienteId,
        stage_id: stageId,
        projeto: projeto || undefined,
        valor: valor ? parseFloat(valor.replace(/[^\d,.]/, '').replace(',', '.')) : 0,
        prioridade,
        representante_id: repId || undefined,
        forma_pagamento: formaPgto || undefined,
      });

      // Add initial observation if provided
      if (obsInicial.trim()) {
        try {
          const { addObservacao } = await import('@/api/leads');
          await addObservacao(lead.id, obsInicial.trim());
        } catch {
          // Non-critical
        }
      }

      toast.success(`Lead #${lead.codigo} criado!`);
      onClose();
      navigate(`/kanban/leads/${lead.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar lead');
    }
  };

  const isPending = createLead.isPending || createCliente.isPending;

  return (
    <Dialog
      open
      onOpenChange={(o) => { if (!o) onClose(); }}
      title="Novo Lead"
      description="Preencha os dados para iniciar um novo lead no funil."
      width={560}
    >
      <div className="nl-form">
        {/* Cliente */}
        <div className="nl-section-label">Cliente</div>

        {!novoCliente ? (
          <div className="nl-cli-wrap nl-field">
            <label>Buscar cliente existente</label>
            <input
              ref={buscaRef}
              type="text"
              placeholder="Digite o nome do cliente..."
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value);
                setClienteId(null);
                setClienteSelecionado('');
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              autoComplete="off"
            />
            {showDropdown && clientesFiltrados.length > 0 && (
              <div className="nl-cli-results">
                {clientesFiltrados.slice(0, 8).map((c) => (
                  <div
                    key={c.id}
                    className="nl-cli-option"
                    onMouseDown={() => selectCliente(c)}
                  >
                    <strong>{c.nome_fantasia}</strong>
                    {c.nome_contato && <small>{c.nome_contato}</small>}
                  </div>
                ))}
              </div>
            )}
            {clienteSelecionado && (
              <small style={{ color: 'var(--success)', fontSize: '.75rem', marginTop: 2 }}>
                ✓ {clienteSelecionado} selecionado
              </small>
            )}
          </div>
        ) : (
          <div className="nl-grid-2">
            <div className="nl-field" style={{ gridColumn: 'span 2' }}>
              <label>Nome Fantasia *</label>
              <input
                type="text"
                placeholder="Nome da empresa ou cliente"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                autoFocus
              />
            </div>
            <div className="nl-field">
              <label>Nome do Contato</label>
              <input type="text" placeholder="Responsável" value={nomeContato} onChange={(e) => setNomeContato(e.target.value)} />
            </div>
            <div className="nl-field">
              <label>Telefone</label>
              <input type="text" placeholder="(00) 00000-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="nl-field">
              <label>E-mail</label>
              <input type="email" placeholder="email@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="nl-field">
              <label>Cidade</label>
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
          </div>
        )}

        <button
          type="button"
          className="nl-new-cliente-toggle"
          onClick={() => {
            setNovoCliente((v) => !v);
            setClienteId(null);
            setClienteSelecionado('');
            setClienteBusca('');
          }}
        >
          {novoCliente ? '← Buscar cliente existente' : '+ Criar novo cliente'}
        </button>

        <div className="nl-separator" />

        {/* Lead fields */}
        <div className="nl-section-label">Dados do Lead</div>

        <div className="nl-grid-2">
          <div className="nl-field">
            <label>Projeto / Descrição</label>
            <input
              type="text"
              placeholder="Ex: Câmara fria 20m²"
              value={projeto}
              onChange={(e) => setProjeto(e.target.value)}
            />
          </div>
          <div className="nl-field">
            <label>Valor Estimado (R$)</label>
            <input
              type="text"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>

        <div className="nl-grid-2">
          <div className="nl-field">
            <label>Etapa Inicial</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="nl-field">
            <label>Prioridade</label>
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as 'baixa' | 'media' | 'alta')}
            >
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>

        <div className="nl-grid-2">
          <div className="nl-field">
            <label>Representante</label>
            <select value={repId} onChange={(e) => setRepId(e.target.value)}>
              <option value="">— Nenhum (canal próprio) —</option>
              {(reps ?? []).filter((r) => r.ativo).map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div className="nl-field">
            <label>Forma de Pagamento</label>
            <select value={formaPgto} onChange={(e) => setFormaPgto(e.target.value)}>
              <option value="">Não definido</option>
              <option>À vista</option>
              <option>Boleto</option>
              <option>Parcelado</option>
              <option>Financiamento</option>
              <option>Outro</option>
            </select>
          </div>
        </div>

        <div className="nl-field">
          <label>Observação Inicial (opcional)</label>
          <textarea
            rows={2}
            placeholder="Primeiro contato, contexto do projeto..."
            value={obsInicial}
            onChange={(e) => setObsInicial(e.target.value)}
          />
        </div>

        <div className="nl-submit-row">
          <button type="button" className="nl-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="nl-btn-submit"
            disabled={isPending}
            onClick={() => void handleSubmit()}
          >
            {isPending ? 'Criando...' : '+ Criar Lead'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
