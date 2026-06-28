"""Text extraction from uploaded files."""

from pathlib import Path

import structlog

from app.config import settings

logger = structlog.get_logger()

FilePath = str | Path


def extract_text(file_path: FilePath) -> str | None:
    """Extract text from a file based on its extension.

    Supported formats: .txt, .md, .markdown, .pdf

    Args:
        file_path: Absolute path or path relative to settings.upload_dir.
    """
    path = Path(file_path)
    if not path.is_absolute():
        path = settings.upload_dir / path

    suffix = path.suffix.lower()

    try:
        if suffix in {".txt", ".md", ".markdown"}:
            return _extract_plaintext(path)
        if suffix == ".pdf":
            return _extract_pdf(path)
        logger.warning("unsupported_file_format", path=str(path), suffix=suffix)
        return None
    except Exception as e:
        logger.error("text_extraction_failed", path=str(path), error=str(e))
        return None


def _extract_plaintext(file_path: Path) -> str | None:
    """Extract text from a plain text file."""
    # Try utf-8 first, fallback to common encodings
    encodings = ["utf-8", "utf-8-sig", "gbk", "gb2312", "latin-1"]
    for encoding in encodings:
        try:
            with file_path.open("r", encoding=encoding) as f:
                return f.read()
        except UnicodeDecodeError:
            continue
    return None


def _extract_pdf(file_path: Path) -> str | None:
    """Extract text from a PDF file."""
    try:
        from pypdf import PdfReader
    except ImportError as e:
        logger.error("pypdf_not_installed", error=str(e))
        return None

    reader = PdfReader(str(file_path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages) if pages else None


def render_pdf_pages(
    file_path: FilePath,
    out_dir: Path,
    *,
    max_pages: int = 20,
    target_width: int = 1080,
) -> list[Path]:
    """Render PDF pages to PNGs in ``out_dir``; return the written page paths.

    Used to turn a slide deck into backing visuals for a "stills" clip. Capped at
    ``max_pages`` (logged when truncated — no silent cap). Empty list on any error
    or if PyMuPDF is unavailable; the caller falls back to text-only slides.
    """
    path = Path(file_path)
    if not path.is_absolute():
        path = settings.upload_dir / path
    if path.suffix.lower() != ".pdf":
        return []

    try:
        import pymupdf  # PyMuPDF; renders pages without system deps
    except ImportError as e:
        logger.error("pymupdf_not_installed", error=str(e))
        return []

    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        written: list[Path] = []
        with pymupdf.open(str(path)) as doc:
            total = doc.page_count
            if total > max_pages:
                logger.warning(
                    "pdf_pages_truncated", path=str(path), total=total, kept=max_pages
                )
            for i in range(min(total, max_pages)):
                page = doc.load_page(i)
                zoom = target_width / page.rect.width if page.rect.width else 1.0
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
                dest = out_dir / f"page-{i + 1:03d}.png"
                pixmap.save(str(dest))
                written.append(dest)
        return written
    except Exception as e:
        logger.error("pdf_render_failed", path=str(path), error=str(e))
        return []
