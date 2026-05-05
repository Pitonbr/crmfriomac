"""Parser do `legacy/js/data.js` — extrai USERS, REPS_BASE, LEADS_BASE como dicts Python.

O formato JS é regular o suficiente para parsing via regex + transformações
controladas. Tolerante a campos com acentos, aspas simples e trailing commas.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


def _extract_array(source: str, name: str) -> str:
    """Extrai o conteúdo do array nomeado (ex.: 'USERS', 'LEADS_BASE')."""
    pattern = re.compile(
        rf"const\s+{name}\s*=\s*\[(.*?)\];",
        re.DOTALL,
    )
    match = pattern.search(source)
    if not match:
        raise ValueError(f"array {name} não encontrado em data.js")
    return match.group(1)


def _split_objects(body: str) -> list[str]:
    """Divide o body do array em objetos `{...}` individuais (top-level)."""
    objects: list[str] = []
    depth = 0
    in_string: str | None = None  # ' | " | None
    start = -1
    for i, ch in enumerate(body):
        if in_string:
            if ch == "\\":
                continue
            if ch == in_string:
                in_string = None
            continue
        if ch in ('"', "'"):
            in_string = ch
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                objects.append(body[start : i + 1])
                start = -1
    return objects


def _js_object_to_json(obj_src: str) -> str:
    """Converte um objeto JS literal para JSON válido (best-effort)."""
    src = obj_src

    # 1. Aspas em chaves: identificar `chave:` (com possíveis espaços) e cercar com aspas
    #    Cobre nome:, dataAbertura:, etc.
    src = re.sub(
        r"([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:",
        r'\1"\2":',
        src,
    )

    # 2. Aspas simples → duplas, mas preservando aspas duplas existentes.
    #    Estratégia: trocar aspas simples não-escapadas por duplas, e escapar
    #    aspas duplas internas como \"
    out_chars: list[str] = []
    in_single = False
    in_double = False
    i = 0
    while i < len(src):
        ch = src[i]
        if in_single:
            if ch == "\\":
                out_chars.append(ch)
                if i + 1 < len(src):
                    out_chars.append(src[i + 1])
                    i += 2
                    continue
            if ch == "'":
                out_chars.append('"')
                in_single = False
            elif ch == '"':
                out_chars.append('\\"')
            else:
                out_chars.append(ch)
        elif in_double:
            out_chars.append(ch)
            if ch == "\\" and i + 1 < len(src):
                out_chars.append(src[i + 1])
                i += 2
                continue
            if ch == '"':
                in_double = False
        else:
            if ch == "'":
                out_chars.append('"')
                in_single = True
            elif ch == '"':
                out_chars.append(ch)
                in_double = True
            else:
                out_chars.append(ch)
        i += 1
    src = "".join(out_chars)

    # 3. Remover trailing commas (`,]` ou `,}`)
    src = re.sub(r",\s*([\]}])", r"\1", src)

    return src


def parse_array(source: str, name: str) -> list[dict[str, Any]]:
    """Extrai e parseia um array nomeado para list[dict]."""
    body = _extract_array(source, name)
    parsed: list[dict[str, Any]] = []
    for raw in _split_objects(body):
        json_src = _js_object_to_json(raw)
        parsed.append(json.loads(json_src))
    return parsed


def load_legacy_data(legacy_dir: Path) -> dict[str, list[dict[str, Any]]]:
    """Carrega USERS, REPS_BASE, LEADS_BASE de legacy/js/data.js."""
    data_js = legacy_dir / "js" / "data.js"
    source = data_js.read_text(encoding="utf-8")
    return {
        "users": parse_array(source, "USERS"),
        "reps": parse_array(source, "REPS_BASE"),
        "leads": parse_array(source, "LEADS_BASE"),
    }
