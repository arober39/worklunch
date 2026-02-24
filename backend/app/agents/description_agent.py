import json

import anthropic
from opentelemetry import trace

from app.config import settings
from app.models import SuggestRequest

tracer = trace.get_tracer("worklunch.agents.description")


async def generate_description(request: SuggestRequest, model: str) -> str:
    """Generate an appealing lunch description from sparse input."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    system_prompt = (
        "You are a helpful assistant that writes appealing, concise lunch descriptions "
        "for a lunch-swapping app. Given a title and optional details, write a 2-3 sentence "
        "description that makes the lunch sound appetizing and highlights what makes it special. "
        "Mention any dietary info naturally if provided. Keep it friendly and casual."
    )

    user_content_parts = [f"Lunch title: {request.title}"]
    if request.description:
        user_content_parts.append(f"Current description: {request.description}")
    if request.category:
        user_content_parts.append(f"Category: {request.category}")
    if request.dietary_preferences:
        user_content_parts.append(f"Dietary preferences: {request.dietary_preferences}")
    if request.allergies:
        user_content_parts.append(f"Allergies to note: {request.allergies}")

    user_content = "\n".join(user_content_parts)
    messages = [{"role": "user", "content": user_content}]

    with tracer.start_as_current_span("description_agent.generate") as span:
        span.set_attribute("gen_ai.system", "anthropic")
        span.set_attribute("gen_ai.request.model", model)
        span.set_attribute("gen_ai.request.max_tokens", 256)
        span.set_attribute("gen_ai.request.temperature", 0.7)

        span.add_event(
            "gen_ai.content.prompt",
            {"gen_ai.prompt": json.dumps(messages)},
        )

        response = client.messages.create(
            model=model,
            max_tokens=256,
            temperature=0.7,
            system=system_prompt,
            messages=messages,
        )

        result = response.content[0].text

        span.set_attribute("gen_ai.response.model", response.model)
        span.set_attribute(
            "gen_ai.response.finish_reasons", [response.stop_reason or "end_turn"]
        )
        span.set_attribute("gen_ai.usage.input_tokens", response.usage.input_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", response.usage.output_tokens)

        span.add_event(
            "gen_ai.content.completion",
            {"gen_ai.completion": result},
        )

    return result
