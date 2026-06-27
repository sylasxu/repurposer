"""File streaming endpoints (Range-capable).

Serves stored uploads (source videos) and rendered outputs (MP4/SRT) with HTTP
Range support so the browser can play/seek. These are the *local* implementation
behind ``storage.stream_url()`` / ``storage.output_url()``; swapping to object
storage means returning presigned URLs from those seams, leaving these endpoints
and all callers unchanged (see docs/VIDEO_EDITOR.md §5).

Starlette's :class:`FileResponse` handles ``Range`` requests natively (206
partial content), which is what video scrubbing needs.
"""

from fastapi import APIRouter, HTTPException, status
from starlette.responses import FileResponse

from app.services.storage import resolve_music_safe, resolve_output_safe, resolve_safe

router = APIRouter()


@router.get("/files/{file_path:path}")
async def stream_upload(file_path: str) -> FileResponse:
    """Stream an uploaded source file by relative path, with Range support."""
    path = resolve_safe(file_path)
    if path is None or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    return FileResponse(path)


@router.get("/music/{mood}")
async def stream_music(mood: str) -> FileResponse:
    """Stream a built-in mood track (e.g. ``calm``), with Range support.

    The mood is extension-less; the resolver finds ``{mood}.<ext>`` under the
    music library so dropping in ``calm.mp3`` just works. 404 until a track for
    that mood is provided.
    """
    path = resolve_music_safe(mood)
    if path is None or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Music track not found",
        )
    return FileResponse(path)
async def stream_output(file_path: str) -> FileResponse:
    """Stream a rendered output (MP4/SRT) by relative path, with Range support."""
    path = resolve_output_safe(file_path)
    if path is None or not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    return FileResponse(path)
