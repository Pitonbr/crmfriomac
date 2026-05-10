import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/Dialog';
import type { Stage } from '@/api/schemas';
import { useCreateCliente } from '@/hooks/queries/useClientes';
import { useCreateLead } from '@/hooks/queries/useLeads';
import { useRepresentantes } from '@/hooks/queries/useRepresentantes';
import { addObservacao } from '@/api/leads';

interface Props {
  stages: Stage[];
  onClose: () => void;
}

export function NewLeadModal({ stages, onClose }: Props) {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const createCliente = useCreateCliente();
  const { data: reps } = useRepresentantes();

  // Novo cliente
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

  const handleSubmit = async () => {
    if (!nomeFantasia.trim()) {
      toast.warning('Informe o nome do cliente');
      return;
    }
    if (!stageId) {
      toast.warning('Selecione uma etapa');
      return;
    }

    try {
      const cliente = await createCliente.mutateAsync({
        nome_fantasia: nomeFantasia.trim(),
        nome_contato: nomeContato || undefined,
        telefone: telefone || undefined,
        email: email || undefined,
        cidade: cidade || undefined,
      });

      const valorNum = valor
        ? parseFloat(valor.replace(/[^\d,.]/, '').replace(',', '.'))
        : 0;

      const lead = await createLead.mutateAsync({
        cliente_id: cliente.id,
        stage_id: stageId,
        projeto: projeto || undefined,
        valor: Number.isNaN(valorNum) ? 0 : valorNum,
        prioridade,
        representante_id: repId || undefined,
        forma_pagamento: formaPgto || undefined,
      });

      if (obsInicial.trim()) {
        try {
          await addObservacao(lead.id, obsInicial.trim());
        } catch {
          // non-critical
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
      description="Preencha os dados para cadastrar um novo cliente e iniciar o lead."
      width={560}
    >
      <div className="nl-form">

        {/* Seção: Dados do Cliente */}
        <div className="nl-section-label">Dados do Novo Cliente</div>

        <div className="nl-grid-2">
          <div className="nl-field" style={{ gridColumn: 'span 2' }}>
            <label>Nome Fantasia / Empresa *</label>
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
            <input
              type="text"
              placeholder="Responsável"
              value={nomeContato}
              onChange={(e) => setNomeContato(e.target.value)}
            />
          </div>
          <div className="nl-field">
            <label>Telefone</label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="nl-field">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="nl-field">
            <label>Cidade</label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </div>
        </div>

        <div className="nl-separator" />

        {/* Seção: Dados do Lead */}
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
              <option value="">— Canal próprio —</option>
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
