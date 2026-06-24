"""Project router."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.agents.analyzer import analyzer_agent
from app.agents.linkedin import linkedin_agent
from app.agents.quote_card import quote_card_agent
from app.agents.script import script_agent
from app.clients.minimax import MiniMaxError
from app.dependencies import DBDep
from app.models.schemas import (
    AssetType,
    ClipResponse,
    DerivativeType,
    GenerateRequest,
    LinkedInPost,
    ProjectCreate,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
    QuoteCardsResponse,
    SpeakerPersona,
)
from app.models.tables import Asset, Clip, Derivative, Project, Speaker
from app.services.extraction import extract_text
from app.services.storage import delete_file, delete_project_files

router = APIRouter()


async def _extract_project_materials(project_id: UUID, db: DBDep) -> list[str]:
    """Extract text from all analyzable project assets.

    Returns a list of non-empty extracted texts. Raises HTTPException
    if no usable text is found.
    """
    result = await db.execute(
        select(Asset).where(
            Asset.project_id == project_id,
            Asset.type.in_(
                [
                    AssetType.TRANSCRIPT,
                    AssetType.VIDEO,
                    AssetType.AUDIO,
                    AssetType.SLIDES,
                ]
            ),
        )
    )
    assets = list(result.scalars().all())
    if not assets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No analyzable assets found for this project",
        )

    materials: list[str] = []
    for asset in assets:
        if not asset.extracted_text and asset.file_url:
            asset.extracted_text = extract_text(asset.file_url)
            asset.processed_at = datetime.now(UTC)
            db.add(asset)
        if asset.extracted_text:
            materials.append(asset.extracted_text)

    if not materials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract text from any project asset",
        )

    await db.commit()
    return materials


async def _load_project_and_speaker(
    project_id: UUID, db: DBDep
) -> tuple[Project, Speaker]:
    """Load a project with its associated speaker."""
    result = await db.execute(
        select(Project, Speaker)
        .join(Speaker, Project.speaker_id == Speaker.id)
        .where(Project.id == project_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return row._tuple()  # type: ignore[attr-defined]


def _parse_persona(speaker: Speaker) -> SpeakerPersona | None:
    """Parse speaker persona from JSON if present."""
    if speaker.persona:
        return SpeakerPersona.model_validate(speaker.persona)
    return None


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, db: DBDep) -> Project:
    """Create a new project."""
    speaker_result = await db.execute(select(Speaker).where(Speaker.id == data.speaker_id))
    speaker = speaker_result.scalar_one_or_none()
    if not speaker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speaker not found",
        )

    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    db: DBDep,
    speaker_id: UUID | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Project]:
    """List projects."""
    query = select(Project)
    if speaker_id:
        query = query.where(Project.speaker_id == speaker_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: UUID, db: DBDep) -> Project:
    """Get project by ID."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: UUID, data: ProjectUpdate, db: DBDep) -> Project:
    """Update project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: UUID, db: DBDep) -> None:
    """Delete project and all associated assets."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Delete associated assets (files + DB rows)
    result = await db.execute(select(Asset).where(Asset.project_id == project_id))
    assets = list(result.scalars().all())
    for asset in assets:
        delete_file(asset.file_url)
        await db.delete(asset)

    await db.delete(project)
    await db.commit()

    # Remove project upload directory after DB commit
    delete_project_files(project_id)


@router.post("/{project_id}/generate", response_model=dict)
async def generate_content(
    project_id: UUID,
    request: GenerateRequest,
    db: DBDep,
) -> dict:
    """Start content generation for a project.

    Runs Analyzer -> Script agents and persists generated clips.
    """
    project, speaker = await _load_project_and_speaker(project_id, db)
    materials = await _extract_project_materials(project_id, db)

    project.status = ProjectStatus.PROCESSING
    await db.commit()

    try:
        analysis = await analyzer_agent.analyze(
            materials=materials,
            clip_count=request.clip_count,
            event_name=project.event_name,
        )

        persona = _parse_persona(speaker)

        generated_clips: list[Clip] = []
        for segment in analysis.segments[: request.clip_count]:
            script = await script_agent.generate(
                segment=segment,
                persona=persona,
                tone_settings=request.tone_settings,
                target_audience=analysis.target_audience,
            )
            clip = Clip(
                project_id=project_id,
                hook=script.hook,
                script=script.model_dump(),
                title_options=script.title_options,
                music_mood=script.music_mood,
                duration=script.duration_seconds,
                language=project.language,
                source_segment=segment.model_dump(),
            )
            db.add(clip)
            generated_clips.append(clip)

        await db.commit()
        for clip in generated_clips:
            await db.refresh(clip)

        project.status = ProjectStatus.REVIEW
        await db.commit()

    except MiniMaxError as e:
        project.status = ProjectStatus.DRAFT
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e

    return {
        "project_id": str(project_id),
        "status": project.status.value,
        "clip_count": len(generated_clips),
        "clip_ids": [str(clip.id) for clip in generated_clips],
        "message": f"Generated {len(generated_clips)} clips",
    }


@router.get("/{project_id}/clips", response_model=list[ClipResponse])
async def list_project_clips(project_id: UUID, db: DBDep) -> list[Clip]:
    """List generated clips for a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    result = await db.execute(
        select(Clip).where(Clip.project_id == project_id).order_by(Clip.created_at.desc())
    )
    return list(result.scalars().all())


@router.post("/{project_id}/linkedin", response_model=LinkedInPost)
async def generate_linkedin_post(project_id: UUID, db: DBDep) -> LinkedInPost:
    """Generate a LinkedIn post for a project."""
    project, speaker = await _load_project_and_speaker(project_id, db)
    materials = await _extract_project_materials(project_id, db)
    persona = _parse_persona(speaker)

    try:
        post = await linkedin_agent.generate(
            materials=materials,
            persona=persona,
            event_name=project.event_name,
            target_language=request.target_language,
        )
    except MiniMaxError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e

    derivative = Derivative(
        project_id=project_id,
        type=DerivativeType.LINKEDIN_POST,
        content=post.model_dump(),
        language=project.language,
    )
    db.add(derivative)
    await db.commit()
    await db.refresh(derivative)

    return post


@router.post("/{project_id}/quote-cards", response_model=QuoteCardsResponse)
async def generate_quote_cards(
    project_id: UUID,
    count: int = 3,
    db: DBDep = None,  # type: ignore[assignment]
) -> QuoteCardsResponse:
    """Generate quote cards for a project."""
    project, speaker = await _load_project_and_speaker(project_id, db)
    materials = await _extract_project_materials(project_id, db)

    try:
        result = await quote_card_agent.generate(
            materials=materials,
            speaker_name=speaker.name,
            speaker_title=speaker.title,
            event_name=project.event_name,
            count=count,
            target_language=request.target_language,
        )
    except MiniMaxError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        ) from e

    derivative = Derivative(
        project_id=project_id,
        type=DerivativeType.QUOTE_CARD,
        content=result.model_dump(),
        language=project.language,
    )
    db.add(derivative)
    await db.commit()
    await db.refresh(derivative)

    return result
