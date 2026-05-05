"""Painel SQLAdmin embarcado em `/admin`.

Auth via cookie HttpOnly do app principal — só master entra. Restante 401.
"""

from fastapi import FastAPI, Request
from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.responses import RedirectResponse

from app.db.session import engine
from app.models import (
    Anexo,
    Cliente,
    Comissao,
    Entrega,
    Lead,
    Observacao,
    Orcamento,
    Representante,
    Stage,
    Tenant,
    User,
    UserRole,
)
from app.repositories.auth import UserRepository
from app.security.cookies import ACCESS_COOKIE
from app.security.tokens import TokenError, decode_token


# ── Auth backend ────────────────────────────────────────────────────
class AdminAuth(AuthenticationBackend):
    """Reaproveita o cookie de access do app principal. Só master."""

    async def login(self, request: Request) -> bool:
        # Login real é feito em /api/v1/auth/login. Aqui apenas redireciona.
        return True

    async def logout(self, request: Request) -> bool:
        return True

    async def authenticate(self, request: Request) -> bool | RedirectResponse:
        token = request.cookies.get(ACCESS_COOKIE)
        if not token:
            return RedirectResponse("/login", status_code=302)

        try:
            payload = decode_token(token, expected_type="access")
        except TokenError:
            return RedirectResponse("/login", status_code=302)

        if payload.role != UserRole.MASTER.value:
            return RedirectResponse("/", status_code=302)

        # Verifica se user ainda existe e está ativo
        from app.db.session import SessionLocal

        async with SessionLocal() as session:
            repo = UserRepository(session)
            user = await repo.get_by_id(payload.sub)
            if user is None or not user.ativo:
                return RedirectResponse("/login", status_code=302)
        return True


# ── ModelViews ─────────────────────────────────────────────────────
class TenantView(ModelView, model=Tenant):
    name = "Tenant"
    name_plural = "Tenants"
    icon = "fa-solid fa-building"
    column_list = ["id", "nome", "slug", "ativo", "criado_em"]
    column_searchable_list = ["slug", "nome"]


class UserView(ModelView, model=User):
    name = "Usuário"
    name_plural = "Usuários"
    icon = "fa-solid fa-user"
    column_list = ["nome", "email", "role", "ativo", "tenant_id", "criado_em"]
    column_searchable_list = ["email", "nome"]
    column_sortable_list = ["criado_em", "email", "role"]
    form_excluded_columns = ["senha_hash"]


class StageView(ModelView, model=Stage):
    name = "Stage"
    name_plural = "Stages"
    icon = "fa-solid fa-list-ol"
    column_list = ["ordem", "label", "slug", "sla_horas", "prob_pct", "ativo"]
    column_default_sort = ("ordem", False)


class ClienteView(ModelView, model=Cliente):
    name = "Cliente"
    name_plural = "Clientes"
    icon = "fa-solid fa-handshake"
    column_list = ["nome_fantasia", "cnpj", "telefone", "email", "cidade", "estado", "ativo"]
    column_searchable_list = ["nome_fantasia", "razao_social", "cnpj"]


class RepresentanteView(ModelView, model=Representante):
    name = "Representante"
    name_plural = "Representantes"
    icon = "fa-solid fa-users"
    column_list = ["nome", "canal", "comissao_pct", "cidade", "estado", "ativo"]
    column_searchable_list = ["nome"]


class LeadView(ModelView, model=Lead):
    name = "Lead"
    name_plural = "Leads"
    icon = "fa-solid fa-bullseye"
    column_list = [
        "codigo",
        "cliente_id",
        "stage_id",
        "valor",
        "prioridade",
        "status",
        "data_abertura",
    ]
    column_searchable_list = ["codigo", "projeto"]
    column_sortable_list = ["data_abertura", "valor"]


class ObservacaoView(ModelView, model=Observacao):
    name = "Observação"
    name_plural = "Observações"
    icon = "fa-solid fa-comment"
    column_list = ["lead_id", "autor_nome", "tipo", "criado_em"]
    column_default_sort = ("criado_em", True)


class AnexoView(ModelView, model=Anexo):
    name = "Anexo"
    name_plural = "Anexos"
    icon = "fa-solid fa-paperclip"
    column_list = ["nome_arquivo", "content_type", "tamanho_bytes", "lead_id", "criado_em"]


class OrcamentoView(ModelView, model=Orcamento):
    name = "Orçamento"
    name_plural = "Orçamentos"
    icon = "fa-solid fa-file-invoice"
    column_list = ["numero", "lead_id", "valor_total", "status", "validade_ate"]


class ComissaoView(ModelView, model=Comissao):
    name = "Comissão"
    name_plural = "Comissões"
    icon = "fa-solid fa-percent"
    column_list = ["representante_id", "lead_id", "valor_comissao", "percentual", "status"]


class EntregaView(ModelView, model=Entrega):
    name = "Entrega"
    name_plural = "Entregas"
    icon = "fa-solid fa-truck"
    column_list = ["lead_id", "prazo_estimado", "prazo_real", "status"]
    column_default_sort = ("prazo_estimado", False)


def setup_admin(app: FastAPI, secret_key: str) -> Admin:
    """Cria o painel /admin e registra todas as ModelViews."""
    admin = Admin(
        app=app,
        engine=engine,
        title="Friomac CRM — Admin",
        authentication_backend=AdminAuth(secret_key=secret_key),
        base_url="/admin",
    )
    admin.add_view(TenantView)
    admin.add_view(UserView)
    admin.add_view(StageView)
    admin.add_view(ClienteView)
    admin.add_view(RepresentanteView)
    admin.add_view(LeadView)
    admin.add_view(ObservacaoView)
    admin.add_view(AnexoView)
    admin.add_view(OrcamentoView)
    admin.add_view(ComissaoView)
    admin.add_view(EntregaView)
    return admin
