"""Client-safe DTOs for Fujitsu OpenAI-compatible LLM layer.

This module contains only the public config schema and the stable layer type
identifier. The runtime implementation (LLM client creation, HTTP lifecycle)
lives in ``llm_layer.py`` so callers can build run requests without importing
server-only dependencies such as ``pydantic_ai`` or ``openai``.

The Fujitsu server exposes an OpenAI-compatible REST API
(``/v1/chat/completions``). Callers supply the endpoint URL and API key; model
selection is part of the same config to keep the layer self-contained.
"""

from __future__ import annotations

from typing import ClassVar, Final

from pydantic import ConfigDict, Field, field_validator
from pydantic_ai.settings import ModelSettings

from agenton.layers import LayerConfig


FUJITSU_LLM_LAYER_TYPE_ID: Final[str] = "fujitsu.llm"


class FujitsuLLMLayerConfig(LayerConfig):
    """Config for a Fujitsu OpenAI-compatible LLM endpoint.

    ``endpoint_url`` must point to the base URL of the Fujitsu server, e.g.
    ``https://llm.example.fujitsu.com/v1``. The ``openai`` client appends the
    ``/chat/completions`` path automatically.

    ``api_key`` is issued per customer by Fujitsu. It is transmitted in the
    ``Authorization: Bearer <api_key>`` header for every request.

    ``model`` is the model identifier string accepted by the Fujitsu server, e.g.
    ``takane`` or ``takane-enterprise``.

    ``model_settings`` carries optional inference parameters such as
    ``temperature`` and ``max_tokens``; pass ``None`` to use server defaults.
    """

    endpoint_url: str = Field(
        description="Base URL of the Fujitsu OpenAI-compatible API endpoint (e.g. https://llm.example.fujitsu.com/v1)"
    )
    api_key: str = Field(description="API key issued by Fujitsu for this customer")
    model: str = Field(description="Model identifier accepted by the Fujitsu server (e.g. 'takane')")
    model_settings: ModelSettings | None = Field(default=None, description="Optional inference parameters")

    model_config: ClassVar[ConfigDict] = ConfigDict(extra="forbid", arbitrary_types_allowed=True)

    @field_validator("endpoint_url", mode="before")
    @classmethod
    def strip_trailing_slash(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("endpoint_url must be a string")
        return value.rstrip("/")

    @field_validator("api_key", mode="before")
    @classmethod
    def reject_empty_api_key(cls, value: object) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("api_key must be a non-empty string")
        return value

    @field_validator("model", mode="before")
    @classmethod
    def reject_empty_model(cls, value: object) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError("model must be a non-empty string")
        return value


__all__ = [
    "FUJITSU_LLM_LAYER_TYPE_ID",
    "FujitsuLLMLayerConfig",
]
