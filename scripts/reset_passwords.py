"""Reset administrativo de todas as senhas para uma senha provisória.

Marca senha_provisoria=true em todos os users — frontend obriga troca
no primeiro acesso.

Uso:
    docker compose run --rm backend python -m scripts.reset_passwords Senha123!
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select, update

from app.db.session import SessionLocal
from app.models.user import User
from app.security.passwords import hash_password


async def main(nova_senha: str) -> int:
    if not nova_senha:
        print("[reset] forneça a senha nova como argumento.")
        return 1

    hashed = hash_password(nova_senha)

    async with SessionLocal() as session:
        # Lista users primeiro (apenas para log)
        users = (await session.execute(select(User))).scalars().all()
        if not users:
            print("[reset] nenhum user encontrado.")
            return 0

        # Update em massa
        await session.execute(
            update(User).values(senha_hash=hashed, senha_provisoria=True)
        )
        await session.commit()

        print(f"[reset] {len(users)} usuários atualizados:")
        for u in users:
            print(f"  • {u.email:32s}  senha_provisoria=true  role={u.role}")
        print(f"\n[reset] Nova senha provisória: {nova_senha}")
        print("[reset] Todos serão obrigados a trocar no próximo login.")

    return 0


if __name__ == "__main__":
    senha = sys.argv[1] if len(sys.argv) > 1 else ""
    sys.exit(asyncio.run(main(senha)))
