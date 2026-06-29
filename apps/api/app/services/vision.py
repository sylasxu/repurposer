"""M3 vision: extract textual key-points from an image (slide / photo / chart).

Runs in the worker's asset processor, so it's a *sync* httpx call (the async
MiniMaxClient is for the generation path). M3 is natively multimodal — the same
``/chat/completions`` endpoint accepts an image as a base64 data URL. The
extracted text is stored on ``Asset.extracted_text`` so it joins the analyzer's
``materials`` like any other source — giving the pipeline the image's content.
"""

import base64
import re
from pathlib import Path

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger()

# M3 may emit a <think>...</think> reasoning preamble; strip it from the output.
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)

_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}

_PROMPT = (
    "This image is material from a talk — a slide, photo, chart, or diagram. "
    "Extract what it conveys for repurposing into content: any visible text or "
    "title, the main point, and notable data/visuals. Be concise (2-4 sentences). "
    "Plain text only, no preamble."
)


def describe_image(image_path: Path) -> str | None:
    """Return a concise textual description of an image via M3 vision, or None."""
    if not settings.minimax_api_key:
        return None
    try:
        raw = image_path.read_bytes()
    except OSError as e:
        logger.error("vision_read_failed", path=str(image_path), error=str(e))
        return None

    mime = _MIME.get(image_path.suffix.lower(), "image/png")
    data_url = f"data:{mime};base64,{base64.b64encode(raw).decode()}"
    payload = {
        "model": settings.minimax_model,
        "messages": [
            {
                "role": "system",
                "content": "You extract concise, factual descriptions of images. Plain text only.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        "temperature": 0.2,
    }
    try:
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                f"{settings.minimax_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.minimax_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        cleaned = _THINK_BLOCK.sub("", content or "").strip()
        return cleaned or None
    except Exception as e:  # noqa: BLE001 — vision is best-effort; never block processing
        logger.error("vision_describe_failed", path=str(image_path), error=str(e))
        return None
