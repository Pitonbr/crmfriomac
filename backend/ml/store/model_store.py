"""Persistência e versionamento de modelos ML.

Armazena modelos treinados em disco (via joblib) e mantém metadados
em um arquivo JSON de controle. O diretório base é configurável via
variável de ambiente ML_MODELS_PATH (default: /app/ml-models).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib

log = logging.getLogger(__name__)

_DEFAULT_PATH = Path(os.environ.get("ML_MODELS_PATH", "/app/ml-models"))
_META_FILE    = "metadata.json"
_MODEL_FILE   = "model_current.joblib"


class ModelStore:
    """Gerencia persistência e recuperação de modelos treinados."""

    def __init__(self, base_path: Path | None = None) -> None:
        self.base_path = base_path or _DEFAULT_PATH
        self.base_path.mkdir(parents=True, exist_ok=True)

    # ── Salvar ───────────────────────────────────────────────────
    def save(self, model: object, metadata: dict) -> None:
        """Salva modelo + metadados. Mantém 3 versões anteriores."""
        model_path = self.base_path / _MODEL_FILE
        # Rotaciona versões anteriores
        for i in range(2, 0, -1):
            old = self.base_path / f"model_v{i}.joblib"
            new = self.base_path / f"model_v{i+1}.joblib"
            if old.exists():
                old.rename(new)
        if model_path.exists():
            model_path.rename(self.base_path / "model_v1.joblib")

        joblib.dump(model, model_path, compress=3)
        log.info("model_store.saved", path=str(model_path))

        meta = {
            **metadata,
            "saved_at": datetime.now(tz=timezone.utc).isoformat(),
            "model_file": str(model_path),
        }
        (self.base_path / _META_FILE).write_text(json.dumps(meta, indent=2))

    # ── Carregar ─────────────────────────────────────────────────
    def load(self) -> object | None:
        """Carrega o modelo atual. Retorna None se não existe."""
        path = self.base_path / _MODEL_FILE
        if not path.exists():
            log.info("model_store.not_found", path=str(path))
            return None
        try:
            model = joblib.load(path)
            log.info("model_store.loaded", path=str(path))
            return model
        except Exception as e:
            log.error("model_store.load_error", error=str(e))
            return None

    # ── Metadados ────────────────────────────────────────────────
    def get_metadata(self) -> dict:
        """Retorna metadados do modelo atual (ou dict vazio)."""
        path = self.base_path / _META_FILE
        if not path.exists():
            return {"status": "no_model", "n_samples": 0}
        return json.loads(path.read_text())

    def has_model(self) -> bool:
        return (self.base_path / _MODEL_FILE).exists()
