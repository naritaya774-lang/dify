"""Fujitsu OpenAI-compatible LLM layer.

This layer creates a Pydantic AI ``OpenAIChatModel`` configured to call the
Fujitsu server's OpenAI-compatible endpoint. It does not use the Dify plugin
daemon; instead it connects directly using the ``openai`` SDK client with a
custom base URL and the per-customer API key.

The layer does not own HTTP clients or connection pools. Callers pass a shared
``httpx.AsyncClient`` into ``get_model()`` for each invocation so connection
reuse and lifecycle are managed at the application boundary.
"""

from __future__ import annotations

import httpx
from dataclasses import dataclass
from typing import ClassVar

from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from typing_extensions import Self, override

from agenton.layers import NoLayerDeps, PlainLayer

from .configs import FUJITSU_LLM_LAYER_TYPE_ID, FujitsuLLMLayerConfig


@dataclass(slots=True)
class FujitsuLLMLayer(PlainLayer[NoLayerDeps, FujitsuLLMLayerConfig]):
    """Layer that creates a Fujitsu OpenAI-compatible Pydantic AI model.

    Invariants:
    - The layer is stateless; ``get_model`` creates a new ``OpenAIChatModel``
      on every call.
    - The ``http_client`` passed to ``get_model`` must be open; callers own its
      lifecycle.
    - No plugin daemon is involved. Requests go directly to the Fujitsu server.
    """

    type_id: ClassVar[str] = FUJITSU_LLM_LAYER_TYPE_ID

    config: FujitsuLLMLayerConfig

    @classmethod
    @override
    def from_config(cls, config: FujitsuLLMLayerConfig) -> Self:
        """Create the layer from validated config."""
        return cls(config=config)

    def get_model(self, *, http_client: httpx.AsyncClient) -> OpenAIChatModel:
        """Return a Pydantic AI model wired to the Fujitsu endpoint.

        Args:
            http_client: An open shared ``httpx.AsyncClient``. The caller owns
                the client lifecycle; this layer does not close it.

        Returns:
            ``OpenAIChatModel`` configured with the Fujitsu base URL, API key,
            and model name from this layer's config.

        Raises:
            RuntimeError: if ``http_client`` is already closed.
        """
        if http_client.is_closed:
            raise RuntimeError("FujitsuLLMLayer.get_model() requires an open shared HTTP client.")

        provider = OpenAIProvider(
            base_url=self.config.endpoint_url,
            api_key=self.config.api_key,
            http_client=http_client,
        )
        return OpenAIChatModel(
            model_name=self.config.model,
            provider=provider,
            settings=self.config.model_settings,
        )


__all__ = ["FujitsuLLMLayer"]
