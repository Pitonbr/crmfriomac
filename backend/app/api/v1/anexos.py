"""Endpoints de upload/download de Anexos (MinIO)."""

from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps.auth import CurrentUserDep, get_current_user
from app.deps.db import get_session
from app.integrations.storage import (
    StorageError,
    delete_object,
    download_object,
    upload_object,
)
from app.models.anexo import Anexo
from app.repositories.leads import LeadRepository
from app.repositories.representantes import RepresentanteRepository
from app.schemas.anexo import AnexoOut

router = APIRouter(prefix="/anexos", tags=["anexos"], dependencies=[Depends(get_current_user)])

MAX_BYTES = 25 * 1024 * 1024  # 25 MB


@router.get("/lead/{lead_id}", response_model=list[AnexoOut])
async def list_anexos_lead(
    lead_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AnexoOut]:
    if (await LeadRepository(session).get_by_id(lead_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lead não encontrado")
    stmt = select(Anexo).where(Anexo.lead_id == lead_id).order_by(Anexo.criado_em.desc())
    items = (await session.execute(stmt)).scalars().all()
    return [AnexoOut.model_validate(a) for a in items]


@router.post(
    "/lead/{lead_id}",
    response_model=AnexoOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_anexo_lead(
    lead_id: UUID,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
    file: Annotated[UploadFile, File(...)],
) -> AnexoOut:
    if (await LeadRepository(session).get_by_id(lead_id)) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lead não encontrado")

    body = await file.read()
    if len(body) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="arquivo vazio")
    if len(body) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"arquivo excede {MAX_BYTES} bytes",
        )

    anexo_id = uuid4()
    storage_key = f"tenant/{user.tenant_id}/lead/{lead_id}/{anexo_id}/{file.filename}"

    try:
        await upload_object(
            key=storage_key,
            data=body,
            content_type=file.content_type or "application/octet-stream",
            length=len(body),
        )
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"falha de storage: {e}"
        ) from e

    anexo = Anexo(
        id=anexo_id,
        tenant_id=user.tenant_id,
        lead_id=lead_id,
        nome_arquivo=file.filename or "arquivo",
        content_type=file.content_type or "application/octet-stream",
        tamanho_bytes=len(body),
        storage_key=storage_key,
        autor_id=user.id,
        autor_nome=user.nome,
    )
    session.add(anexo)
    await session.flush()
    return AnexoOut.model_validate(anexo)


@router.get("/{anexo_id}/download")
async def download_anexo(
    anexo_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StreamingResponse:
    anexo = await session.get(Anexo, anexo_id)
    if anexo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    try:
        body = await download_object(anexo.storage_key)
    except StorageError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail=f"falha de storage: {e}"
        ) from e

    from io import BytesIO

    return StreamingResponse(
        BytesIO(body),
        media_type=anexo.content_type,
        headers={"Content-Disposition": f'attachment; filename="{anexo.nome_arquivo}"'},
    )


@router.delete("/{anexo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_anexo(
    anexo_id: UUID,
    _user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    anexo = await session.get(Anexo, anexo_id)
    if anexo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    try:
        await delete_object(anexo.storage_key)
    except StorageError:
        # Best-effort: deleta no DB mesmo se MinIO falhou (job de cleanup limpa órfãos)
        pass

    await session.delete(anexo)
    await session.flush()
