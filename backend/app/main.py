from contextlib import asynccontextmanager

import ldclient
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.config import settings
from app.routers.suggest import router as suggest_router


def setup_otel() -> None:
    """Configure OpenTelemetry with OTLP gRPC exporter."""
    provider = TracerProvider()
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_ENDPOINT, insecure=True)
        )
    )
    trace.set_tracer_provider(provider)


def setup_launchdarkly() -> None:
    """Initialize LaunchDarkly server SDK."""
    config = ldclient.Config(settings.LD_SDK_KEY)
    ldclient.set_config(config)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_otel()
    setup_launchdarkly()
    yield
    ldclient.get().close()
    provider = trace.get_tracer_provider()
    if hasattr(provider, "shutdown"):
        provider.shutdown()


app = FastAPI(title="WorkLunch AI Backend", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI with OTel
FastAPIInstrumentor.instrument_app(app)

# Routes
app.include_router(suggest_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
