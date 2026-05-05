"""Cliente WhatsApp Business (Meta Cloud API). NoOp se sem token."""

from app.integrations.whatsapp.client import WhatsAppClient, get_whatsapp_client

__all__ = ["WhatsAppClient", "get_whatsapp_client"]
