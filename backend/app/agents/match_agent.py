import json

import anthropic
from opentelemetry import trace

from app.config import settings
from app.models import ActivePost, MatchedPost

tracer = trace.get_tracer("worklunch.agents.match")


async def find_matches(
    title: str,
    description: str,
    category: str | None,
    dietary_preferences: str | None,
    active_posts: list[ActivePost],
    model: str,
) -> list[MatchedPost]:
    """Suggest 2-3 active posts the user might want to swap with."""
    if not active_posts:
        return []

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = (
        "You are a lunch-matching assistant. Given a user's lunch post and a list of "
        "active posts from other users, suggest 2-3 posts that would make good swaps. "
        "Consider complementary flavors, dietary compatibility, and variety. "
        "Respond with valid JSON only — an array of objects with keys: "
        '"post_id", "title", "reason". Keep reasons to one short sentence.'
    )

    posts_text = "\n".join(
        f"- ID: {p.id}, Title: {p.title}, Description: {p.description}, "
        f"Category: {p.category}, By: {p.user_name}"
        for p in active_posts
    )

    user_parts = [
        f"My lunch: {title}",
        f"Description: {description}",
    ]
    if category:
        user_parts.append(f"Category: {category}")
    if dietary_preferences:
        user_parts.append(f"My dietary preferences: {dietary_preferences}")
    user_parts.append(f"\nAvailable posts to match with:\n{posts_text}")

    user_content = "\n".join(user_parts)
    messages = [{"role": "user", "content": user_content}]

    with tracer.start_as_current_span("match_agent.find") as span:
        span.set_attribute("gen_ai.system", "anthropic")
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.max_tokens", 512)
        span.set_attribute("gen_ai.request.temperature", 0.3)

        span.add_event(
            "gen_ai.content.prompt",
            {"gen_ai.prompt": json.dumps(messages)},
        )

        response = client.messages.create(
            model=model,
            max_tokens=512,
            temperature=0.3,
            system=system_prompt,
            messages=messages,
        )

        raw = response.content[0].text

        span.set_attribute("gen_ai.response.model", response.model)
        span.set_attribute(
            "gen_ai.response.finish_reasons", [response.stop_reason or "end_turn"]
        )
        span.set_attribute("gen_ai.usage.input_tokens", response.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", response.usage.output_tokens)

        span.add_event(
            "gen_ai.content.completion",
            {"gen_ai.completion": raw},
        )

    # Parse the JSON response
    try:
        # Strip markdown code fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        matches_data = json.loads(cleaned)
        return [MatchedPost(**m) for m in matches_data[:3]]
    except (json.JSONDecodeError, KeyError, TypeError):
        return []
