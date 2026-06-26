"""Derivative router for direct editing."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import DBDep
from app.models.schemas import DerivativeResponse, DerivativeUpdate
from app.models.tables import Derivative

router = APIRouter()


@router.put("/{derivative_id}", response_model=DerivativeResponse)
async def update_derivative(
    derivative_id: UUID,
    data: DerivativeUpdate,
    db: DBDep,
) -> Derivative:
    """Directly edit a derivative's content or status."""
    result = await db.execute(select(Derivative).where(Derivative.id == derivative_id))
    derivative = result.scalar_one_or_none()
    if not derivative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Derivative not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(derivative, field, value)

    derivative.updated_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(derivative)
    return derivative
