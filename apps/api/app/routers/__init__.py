"""Routers package."""

from app.routers.assets import router as assets
from app.routers.assets import speaker_assets_router as speaker_assets
from app.routers.clips import router as clips
from app.routers.projects import router as projects
from app.routers.speakers import router as speakers

__all__ = ["assets", "clips", "projects", "speakers", "speaker_assets"]
