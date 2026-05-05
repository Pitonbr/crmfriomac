"""Sender de email transacional.

Estratégia:
- Se EMAIL_BACKEND=smtp e SMTP_HOST setado → SmtpSender (real).
- Se EMAIL_BACKEND=sendgrid e SENDGRID_API_KEY setado → SendgridSender (real).
- Caso contrário → NoopSender (loga e descarta — útil em dev).

Sempre rodar via worker arq, nunca bloquear o request.
"""

from __future__ import annotations

import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage

import structlog

from app.config import settings

log = structlog.get_logger()


class EmailSender(ABC):
    @abstractmethod
    async def send(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> None: ...


class NoopSender(EmailSender):
    """Fake sender — loga e descarta. Default em dev sem SMTP configurado."""

    async def send(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> None:
        log.warning(
            "email.noop_send",
            to=to,
            subject=subject,
            body_preview=body_text[:120],
            reason="EMAIL_BACKEND não configurado — mensagem descartada",
        )


class SmtpSender(EmailSender):
    async def send(
        self,
        *,
        to: str,
        subject: str,
        body_text: str,
        body_html: str | None = None,
    ) -> None:
        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body_text)
        if body_html:
            msg.add_alternative(body_html, subtype="html")

        # smtplib é síncrono — em produção, usar aiosmtplib. Aqui usamos to_thread.
        import asyncio

        def _send() -> None:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                server.starttls()
                if settings.smtp_user:
                    server.login(
                        settings.smtp_user, settings.smtp_password.get_secret_value()
                    )
                server.send_message(msg)

        try:
            await asyncio.to_thread(_send)
            log.info("email.sent", to=to, subject=subject, backend="smtp")
        except Exception as e:
            log.error("email.send_failed", to=to, error=str(e))
            raise


def get_email_sender() -> EmailSender:
    """Factory baseada em EMAIL_BACKEND e credenciais disponíveis."""
    if settings.email_backend == "smtp" and settings.smtp_host:
        return SmtpSender()
    # SendGrid impl fica para Sprint 6 (precisa lib oficial sendgrid)
    return NoopSender()
