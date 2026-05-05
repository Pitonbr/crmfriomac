"""Cliente de object storage (MinIO/S3-compatível)."""

from app.integrations.storage.minio_client import (
    StorageError,
    delete_object,
    download_object,
    ensure_bucket,
    upload_object,
)

__all__ = [
    "StorageError",
    "delete_object",
    "download_object",
    "ensure_bucket",
    "upload_object",
]
