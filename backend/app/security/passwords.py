"""Hash e verificação de senhas com Argon2id (recomendado OWASP)."""

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Parâmetros recomendados (OWASP 2024+) — equilíbrio segurança vs custo CPU
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=64 * 1024,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(plain: str) -> str:
    """Gera hash Argon2id da senha em texto puro.

    O salt é gerado automaticamente e embutido no resultado.
    """
    return _hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verifica senha contra o hash. False se mismatch ou hash inválido.

    Não levanta exceção (silencia VerifyMismatchError) para fluxo de login limpo.
    """
    try:
        return _hasher.verify(hashed, plain)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def needs_rehash(hashed: str) -> bool:
    """True se os parâmetros do hash estão desatualizados (algoritmo evoluiu).

    Use após verify bem-sucedido para fazer upgrade transparente.
    """
    return _hasher.check_needs_rehash(hashed)
