"""Client-safe exports for the Fujitsu OpenAI-compatible LLM layer.

Only the public config schema and the stable layer type identifier are exported
here. The runtime implementation (``FujitsuLLMLayer``) lives in
``llm_layer.py`` and requires server-side dependencies (``openai``,
``pydantic_ai``). Import it directly when running the server.
"""

from dify_agent.layers.fujitsu.configs import (
    FUJITSU_LLM_LAYER_TYPE_ID,
    FujitsuLLMLayerConfig,
)

__all__ = [
    "FUJITSU_LLM_LAYER_TYPE_ID",
    "FujitsuLLMLayerConfig",
]
