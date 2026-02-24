from opentelemetry import trace

from app.agents.description_agent import generate_description
from app.agents.match_agent import find_matches
from app.models import MatchedPost, SuggestRequest

tracer = trace.get_tracer("worklunch.orchestrator")


async def run(
    request: SuggestRequest, model: str
) -> tuple[str, list[MatchedPost]]:
    """Orchestrate description generation and match finding."""
    with tracer.start_as_current_span("orchestrator.run") as span:
        span.set_attribute("orchestrator.model", model)
        span.set_attribute("orchestrator.title", request.title)
        span.set_attribute("orchestrator.active_posts_count", len(request.active_posts))

        # Step 1: Generate description
        description = await generate_description(request, model)

        # Step 2: Find matches using the generated description
        matched_posts = await find_matches(
            title=request.title,
            description=description,
            category=request.category,
            dietary_preferences=request.dietary_preferences,
            active_posts=request.active_posts,
            model=model,
        )

        span.set_attribute("orchestrator.matches_found", len(matched_posts))

    return description, matched_posts
