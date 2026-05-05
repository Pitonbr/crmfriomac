"""Seed inicial — importa dados do `legacy/js/data.js` para o PostgreSQL.

Sprint 1: STUB. Apenas valida que o módulo é importável.
Sprint 3: implementação completa que:
    1. Lê e parseia `legacy/js/data.js` (regex + json5).
    2. Cria tenant default (slug definido em settings.tenant_default_slug).
    3. Cria stages padrão por tenant.
    4. Cria users (gera senhas Argon2 aleatórias e exibe UMA vez no stdout).
    5. Cria representantes (15), clientes (deduplicados), leads (65).
    6. Idempotente via ON CONFLICT.

Uso (Sprint 3+):
    docker compose run --rm backend python -m scripts.seed_from_legacy
"""

from __future__ import annotations

import sys


def main() -> int:
    print("[seed_from_legacy] Sprint 1 stub — implementação completa virá no Sprint 3.")
    print("[seed_from_legacy] Quando implementado, lerá legacy/js/data.js e popula o banco.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
