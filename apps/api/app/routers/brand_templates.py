"""Brand template router: CRUD for video/brand templates."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DBDep
from app.models.schemas import (
    BrandTemplateCreate,
    BrandTemplateResponse,
    BrandTemplateUpdate,
)
from app.models.tables import BrandTemplate

router = APIRouter()


@router.post("", response_model=BrandTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_brand_template(
    data: BrandTemplateCreate, db: DBDep
) -> BrandTemplate:
    """Create a brand template."""
    template = BrandTemplate(**data.model_dump())
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("", response_model=list[BrandTemplateResponse])
async def list_brand_templates(db: DBDep) -> list[BrandTemplate]:
    """List brand templates, newest first."""
    result = await db.execute(
        select(BrandTemplate).order_by(BrandTemplate.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{template_id}", response_model=BrandTemplateResponse)
async def get_brand_template(template_id: UUID, db: DBDep) -> BrandTemplate:
    """Get a brand template by ID."""
    template = await db.get(BrandTemplate, template_id)
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand template not found",
        )
    return template


@router.put("/{template_id}", response_model=BrandTemplateResponse)
async def update_brand_template(
    template_id: UUID, data: BrandTemplateUpdate, db: DBDep
) -> BrandTemplate:
    """Update a brand template."""
    template = await db.get(BrandTemplate, template_id)
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand template not found",
        )

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(template, key, value)

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand_template(template_id: UUID, db: DBDep) -> None:
    """Delete a brand template."""
    template = await db.get(BrandTemplate, template_id)
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand template not found",
        )
    await db.delete(template)
    await db.commit()
