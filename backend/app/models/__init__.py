"""SQLAlchemy models — re-exporta tudo para Alembic detectar."""

from app.models.anexo import Anexo
from app.models.auth import AuthLoginAttempt, AuthRefreshToken
from app.models.cliente import Cliente
from app.models.comissao import Comissao, ComissaoStatus
from app.models.entrega import Entrega, EntregaStatus
from app.models.lead import Lead, LeadPrioridade, LeadStatus
from app.models.notificacao import Notificacao, NotificacaoTipo
from app.models.observacao import Observacao, ObservacaoTipo
from app.models.orcamento import Orcamento, OrcamentoStatus
from app.models.representante import CanalRepresentante, Representante
from app.models.stage import Stage
from app.models.tenant import Tenant
from app.models.user import User, UserRole

__all__ = [
    "Anexo",
    "AuthLoginAttempt",
    "AuthRefreshToken",
    "CanalRepresentante",
    "Cliente",
    "Comissao",
    "ComissaoStatus",
    "Entrega",
    "EntregaStatus",
    "Lead",
    "LeadPrioridade",
    "LeadStatus",
    "Notificacao",
    "NotificacaoTipo",
    "Observacao",
    "ObservacaoTipo",
    "Orcamento",
    "OrcamentoStatus",
    "Representante",
    "Stage",
    "Tenant",
    "User",
    "UserRole",
]
