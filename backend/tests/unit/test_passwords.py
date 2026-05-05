"""Testes do hash de senha (Argon2id)."""

from app.security.passwords import hash_password, needs_rehash, verify_password


def test_hash_is_argon2id() -> None:
    h = hash_password("supersecret")
    assert h.startswith("$argon2id$")


def test_verify_correct_password() -> None:
    h = hash_password("supersecret")
    assert verify_password("supersecret", h) is True


def test_verify_wrong_password() -> None:
    h = hash_password("supersecret")
    assert verify_password("wrong", h) is False


def test_verify_handles_invalid_hash() -> None:
    assert verify_password("anything", "not-a-valid-hash") is False


def test_each_hash_is_unique_due_to_salt() -> None:
    a = hash_password("samepass")
    b = hash_password("samepass")
    assert a != b


def test_needs_rehash_false_for_current() -> None:
    h = hash_password("x")
    assert needs_rehash(h) is False
