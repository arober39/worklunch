import ldclient
from fastapi import APIRouter
from opentelemetry import trace

from app.agents import orchestrator
from app.models import SuggestRequest, SuggestResponse

router = APIRouter()
tracer = trace.get_tracer("worklunch.routers.suggest")

DEFAULT_MODEL = "claude-sonnet-4-20250514"


@router.post("/suggest", response_model=SuggestResponse)
async def suggest(request: SuggestRequest) -> SuggestResponse:
    """Generate an AI-suggested description and find matching posts."""
    with tracer.start_as_current_span("suggest.endpoint") as span:
        # Evaluate the model variant flag
        ld_client = ldclient.get()
        context = ldclient.Context.builder("worklunch-backend").kind("service").build()
        model = ld_client.variation("llm-model-variant", context, DEFAULT_MODEL)

        span.add_event(
            "feature_flag",
            {
                "feature_flag.key": "llm-model-variant",
                "feature_flag.provider.name": "LaunchDarkly",
                "feature_flag.variant": str(model),
            },
        )
        span.set_attribute("gen_ai.request.model", model)

        # Emit feature_flag event for the client-side ai-suggest-enabled flag
        span.add_event(
            "feature_flag",
            {
                "feature_flag.key": "ai-suggest-enabled",
                "feature_flag.provider.name": "LaunchDarkly",
                "feature_flag.variant": str(request.ai_suggest_flag_value),
            },
        )

        description, matched_posts = await orchestrator.run(request, model)

    return SuggestResponse(
        suggested_description=description,
        matched_posts=matched_posts,
    )
