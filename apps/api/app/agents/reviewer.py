"""Reviewer Agent: score generated clip scripts against speaker persona."""

from pathlib import Path

import structlog
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.clients.minimax import MiniMaxClient, MiniMaxError
from app.models.schemas import ClipScript, ReviewResult, Segment, SpeakerPersona

logger = structlog.get_logger()

_PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_PROMPTS_DIR)),
    autoescape=select_autoescape(),
)


class ReviewerAgent:
    """Agent that reviews clip scripts against speaker persona."""

    def __init__(self, client: MiniMaxClient | None = None) -> None:
        self.client = client or MiniMaxClient()

    async def review(
        self,
        script: ClipScript,
        segment: Segment,
        persona: SpeakerPersona | None,
    ) -> ReviewResult:
        """Review a clip script.

        Args:
            script: Generated clip script.
            segment: Source segment for context.
            persona: Speaker style persona.

        Returns:
            ReviewResult model.
        """
        template = _jinja_env.get_template("reviewer.j2")
        user_prompt = template.render(
            script=script,
            segment=segment,
            persona=persona,
        )

        messages = [
            {
                "role": "system",
                "content": (
                    "你是一位严格的短视频内容审校。"
                    "你只输出合法的 JSON，不添加任何解释。"
                ),
            },
            {"role": "user", "content": user_prompt},
        ]

        logger.info("script_review_started", hook=script.hook)

        try:
            result = await self.client.generate(
                messages=messages,
                response_model=ReviewResult,
                temperature=0.3,
            )
        except MiniMaxError:
            raise
        except Exception as e:
            logger.error("script_review_failed", error=str(e))
            raise MiniMaxError(f"Script review failed: {e}") from e

        logger.info(
            "script_review_completed",
            verdict=result.overall_verdict,
            persona_match=result.persona_match_score,
        )
        return result


reviewer_agent = ReviewerAgent()
