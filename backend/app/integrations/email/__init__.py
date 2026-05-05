"""Email transacional — backend SMTP ou SendGrid (via env)."""

from app.integrations.email.sender import EmailSender, get_email_sender

__all__ = ["EmailSender", "get_email_sender"]
