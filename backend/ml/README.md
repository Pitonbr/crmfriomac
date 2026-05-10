# Friomac CRM — Módulo de Machine Learning

## Visão Geral

Este módulo implementa o **algoritmo de probabilidade de fechamento** e o **sistema de previsão de receita** do Friomac CRM. A arquitetura foi projetada para evoluir de um modelo baseado em regras para um sistema de aprendizado de máquina completo, que **aprende continuamente com os dados históricos** e melhora sua precisão com o tempo.

---

## Arquitetura

```
ml/
├── features/
│   └── extractor.py          # Engenharia de atributos (feature engineering)
├── models/
│   ├── base.py               # Contrato/interface base para todos os modelos
│   ├── rules.py              # Modelo de regras (baseline interpretável)
│   └── gradient_boost.py     # Modelo GBM calibrado (aprendizado de máquina)
├── training/
│   ├── collector.py          # Coleta dados de treinamento do banco
│   ├── trainer.py            # Pipeline de treinamento + cross-validation
│   └── evaluator.py          # Métricas de avaliação e monitoramento
├── prediction/
│   └── predictor.py          # Interface unificada: regras + ML com ensemble
├── forecasting/
│   └── revenue_forecaster.py # Previsão de receita por período
├── store/
│   └── model_store.py        # Persistência e versionamento de modelos
└── docs/
    ├── ALGORITHM.md           # Documentação detalhada do algoritmo
    ├── FEATURES.md            # Dicionário de atributos
    └── TRAINING.md            # Guia de treinamento
```

---

## Fluxo do Sistema

```
Lead Ativo
    │
    ▼
[Feature Extractor]
    │ 17 atributos estruturados
    │ 6 atributos de observações/keywords
    │ 4 atributos de atividade temporal
    │
    ▼
[Predictor (Ensemble)]
    │
    ├─→ [Rules Model] ──── (sempre disponível, baseline)
    │       Pesos por stage + keywords + tempo + projeto
    │
    └─→ [GBM Model] ──── (disponível após 30+ leads fechados)
            GradientBoostingClassifier calibrado com
            CalibratedClassifierCV (isotonic regression)
    │
    ▼
[Confidence Weighting]
    prob_final = α × P(ML) + (1-α) × P(Rules)
    onde α = min(1.0, (n_samples - 30) / 200)
    │
    ▼
Probabilidade Final [0–95%]
    │
    ▼
[Revenue Forecaster]
    E[receita] = Σ P(fechar) × valor_lead
    Breakdown: 30d / 90d / 12m
```

---

## Atributos Utilizados (Features)

### Estruturais do Lead
| Atributo | Tipo | Descrição |
|---|---|---|
| `stage_prob_pct` | float | Probabilidade base do estágio (0-100) |
| `stage_ordem` | int | Posição no funil (1-10) |
| `valor_log` | float | log(valor + 1) — normalizado |
| `dias_aberto` | int | Dias desde abertura do lead |
| `dias_sem_movimento` | int | Dias desde última movimentação |
| `prioridade_score` | int | alta=3, media=2, baixa=1 |

### Status de Projeto
| Atributo | Tipo | Descrição |
|---|---|---|
| `projeto_2d_enviado` | bool | Projeto 2D foi enviado |
| `projeto_3d_enviado` | bool | Projeto 3D foi enviado |
| `ambos_projetos` | bool | Ambos 2D e 3D enviados |
| `tem_contato_recente` | bool | Contato nos últimos 14 dias |
| `dias_desde_contato` | int | Dias desde último contato (999 se nunca) |

### Comercial
| Atributo | Tipo | Descrição |
|---|---|---|
| `tem_entrada` | bool | Valor de entrada definido |
| `tem_forma_pagamento` | bool | Forma de pagamento definida |
| `canal_representante` | bool | Canal = Representante externo |

### Palavras-chave (NLP Léxico)
| Atributo | Tipo | Descrição |
|---|---|---|
| `kw_alta_intencao` | bool | "vamos fechar", "interesse imediato"... |
| `kw_negociacao_ativa` | bool | "desconto", "condições especiais"... |
| `kw_projeto_aprovado` | bool | "aprovamos", "aprovei o orçamento"... |
| `kw_urgencia` | bool | "urgente", "obra pronta"... |
| `kw_negativo` | bool | "cancelar", "muito caro"... |
| `kw_score_total` | float | Soma ponderada de todos os sinais |

### Atividade
| Atributo | Tipo | Descrição |
|---|---|---|
| `qtd_observacoes` | int | Total de observações registradas |
| `obs_ultimos_30d` | int | Observações nos últimos 30 dias |
| `tem_obs_recente` | bool | Atividade nos últimos 7 dias |

**Total: 25 atributos**

---

## Modelo de Machine Learning

### Algoritmo: Gradient Boosting Classifier

```python
GradientBoostingClassifier(
    n_estimators=200,      # 200 árvores de decisão
    max_depth=4,            # Profundidade máxima (evita overfitting)
    learning_rate=0.05,     # Taxa de aprendizado conservadora
    min_samples_leaf=5,     # Mínimo 5 exemplos por folha
    subsample=0.8,          # Amostragem para reduzir variância
    random_state=42,        # Reprodutibilidade
)
```

**Por que Gradient Boosting?**
- Excelente desempenho em dados tabulares (estruturados)
- Resistente a outliers em comparação com regressão linear
- Feature importance nativa (explainability)
- Não exige normalização de atributos
- Lida bem com dados mistos (contínuos + binários)

### Calibração de Probabilidade

As probabilidades do GBM são calibradas com **Isotonic Regression** para garantir que probabilidades previstas reflitam frequências reais:

```
Se o modelo prevê 70% para um conjunto de leads,
~70% desses leads devem realmente fechar.
```

Sem calibração, GBMs tendem a superestimar ou subestimar probabilidades extremas.

### Ensemble com Modelo de Regras

```
α = min(1.0, max(0, (n_amostras - 30) / 200))

P_final = α × P_ML + (1-α) × P_regras

Exemplos:
  30 amostras → α=0.0 → usa 100% regras
  80 amostras → α=0.25 → 25% ML + 75% regras
  130 amostras → α=0.5  → 50% ML + 50% regras
  230+ amostras → α=1.0 → usa 100% ML
```

Isso garante uma **transição suave e sem alucinações** entre o modelo baseado em conhecimento de negócio e o modelo que aprende com dados.

---

## Prevenção de Alucinações

### Definição
Uma "alucinação" neste contexto seria uma probabilidade alta (ex: 85%) para um lead que não tem sinais reais de fechamento, ou probabilidade incorretamente calibrada.

### Medidas Implementadas

1. **Mínimo de amostras**: modelo ML não é ativado antes de 30 leads fechados
2. **Calibração isotônica**: garante que P(70%) = 70% de frequência real
3. **Cap de 95%**: nenhum lead recebe probabilidade > 95% (nunca 100%)
4. **Ensemble gradual**: aumenta peso do ML progressivamente conforme confiança
5. **Cross-validation**: evita overfitting (k-fold com k=5)
6. **Feature importance monitoring**: alerta quando features mudam de importância
7. **Drift detection**: detecta quando a distribuição de dados mudou

---

## Previsão de Receita

### Método
Para cada lead ativo com probabilidade calculada:

```
E[receita_lead] = P(fechar) × valor_lead
```

Distribuição temporal baseada em dias históricos até fechamento por stage:

```
dias_médios_fechamento = média(ganho_em - data_abertura) por stage
```

### Output
```json
{
  "total_esperado_30d": 450000.00,
  "total_esperado_90d": 1200000.00,
  "total_esperado_12m": 4800000.00,
  "confianca_previsao": "media",
  "n_leads_considerados": 47,
  "breakdown_por_probabilidade": {
    "90_95": {"qtd": 3, "valor_esperado": 180000},
    "70_90": {"qtd": 12, "valor_esperado": 520000},
    "60_70": {"qtd": 32, "valor_esperado": 500000}
  }
}
```

---

## Como o Sistema Aprende

1. **Dados de treinamento**: leads com outcome definitivo (GANHO ou PERDIDO)
2. **Trigger de retraining**: a cada 10 novos leads fechados
3. **Holdout set**: 20% dos dados reservados para validação
4. **Métricas monitoradas**: AUC-ROC, Brier Score, F1, calibração
5. **Retenção de modelo anterior**: novo modelo só substitui o atual se AUC melhorar

### Ciclo de Aprendizado

```
Novos Leads Fechados
        │
        ▼ (acumula até threshold)
[Data Collector] → extrai features + label (ganho=1, perdido=0)
        │
        ▼
[Trainer] → treina GBM com cross-validation
        │
        ▼
[Evaluator] → compara com modelo atual
        │
        ├─ melhorou? → salva novo modelo
        └─ piorou?  → mantém modelo atual (log warning)
        │
        ▼
[Predictor] → próximas predições usam modelo atualizado
```

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/ml/train` | Treina/retreina o modelo manualmente (master) |
| `GET` | `/api/v1/ml/status` | Status do modelo: data treino, métricas, n amostras |
| `GET` | `/api/v1/ml/feature-importance` | Importância de cada atributo |
| `GET` | `/api/v1/kpis/probabilidade-fechamento` | Leads com 60-95% de prob (dashboard) |
| `GET` | `/api/v1/kpis/forecast` | Previsão de receita 30d/90d/12m |

---

## Roadmap de Evolução

### V1 (atual)
- Modelo de regras calibrado + GBM baseline
- Ensemble gradual por confiança
- Revenue forecasting simples

### V2 (próximos 100 leads fechados)
- LightGBM (mais rápido, melhor para dados maiores)
- SHAP values para explicabilidade por lead
- Segmentação por canal (canal próprio vs representante)

### V3 (>500 leads)
- Embeddings de texto das observações (sentence transformers)
- Predição de tempo até fechamento (survival analysis)
- Detecção de sazonalidade

### V4 (>1000 leads)
- Deep learning tabular (TabNet)
- Reinforcement learning para recomendação de próxima ação
- Modelos por segmento de cliente

---

## Métricas de Qualidade

| Métrica | Descrição | Meta |
|---|---|---|
| AUC-ROC | Capacidade discriminativa (0.5=aleatório, 1.0=perfeito) | > 0.75 |
| Brier Score | Calibração de probabilidade (0=perfeito, 1=pior) | < 0.20 |
| F1 Score | Equilíbrio precisão-recall | > 0.70 |
| Log Loss | Penaliza probabilidades confiantes erradas | < 0.45 |

---

## Instalação e Uso

```bash
# Instalar dependências ML
cd backend
pip install scikit-learn numpy joblib

# Treinar modelo inicial (requer leads fechados no banco)
docker compose exec backend python -m ml.training.trainer

# Ver status do modelo
curl http://localhost:8001/api/v1/ml/status

# Forçar retreinamento (autenticado como master)
curl -X POST http://localhost:8001/api/v1/ml/train \
  -H "Authorization: Bearer ..."
```
