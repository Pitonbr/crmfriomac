"""Wrapper do MinIO Python SDK — operações async via run_in_executor.

O SDK oficial é síncrono; usamos `to_thread` para não bloquear o event loop.
"""

from __future__ import annotations

import asyncio
from io import BytesIO
from typing import BinaryIO

import structlog
from minio import Minio
from minio.error import S3Error

from app.config import settings

log = structlog.get_logger()


class StorageError(Exception):
    pass


def _client() -> Minio:
    """Cria/retorna cliente Minio. Cached implícito no Python module-level."""
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password.get_secret_value(),
        secure=settings.minio_use_ssl,
    )


async def ensure_bucket(name: str | None = None) -> None:
    """Cria o bucket se não existir. Chamar no startup."""
    bucket = name or settings.minio_bucket

    def _ensure() -> None:
        c = _client()
        if not c.bucket_exists(bucket):
            c.make_bucket(bucket)
            log.info("minio.bucket_created", bucket=bucket)

    try:
        await asyncio.to_thread(_ensure)
    except S3Error as e:
        raise StorageError(f"erro ao garantir bucket {bucket!r}: {e}") from e


async def upload_object(
    *, key: str, data: bytes | BinaryIO, content_type: str, length: int
) -> None:
    """Faz upload de um objeto no bucket configurado."""
    bucket = settings.minio_bucket
    body = data if isinstance(data, BytesIO) else BytesIO(data) if isinstance(data, bytes) else data

    def _upload() -> None:
        c = _client()
        c.put_object(
            bucket_name=bucket,
            object_name=key,
            data=body,
            length=length,
            content_type=content_type,
        )

    try:
        await asyncio.to_thread(_upload)
    except S3Error as e:
        raise StorageError(f"erro ao subir {key!r}: {e}") from e


async def download_object(key: str) -> bytes:
    bucket = settings.minio_bucket

    def _get() -> bytes:
        c = _client()
        resp = c.get_object(bucket, key)
        try:
            return resp.read()
        finally:
            resp.close()
            resp.release_conn()

    try:
        return await asyncio.to_thread(_get)
    except S3Error as e:
        raise StorageError(f"erro ao baixar {key!r}: {e}") from e


async def delete_object(key: str) -> None:
    bucket = settings.minio_bucket

    def _del() -> None:
        c = _client()
        c.remove_object(bucket, key)

    try:
        await asyncio.to_thread(_del)
    except S3Error as e:
        raise StorageError(f"erro ao deletar {key!r}: {e}") from e
