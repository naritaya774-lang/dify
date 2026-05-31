import httpx
import pytest

from dify_agent.layers.fujitsu import FUJITSU_LLM_LAYER_TYPE_ID, FujitsuLLMLayerConfig
from dify_agent.layers.fujitsu.llm_layer import FujitsuLLMLayer


def _make_config(**overrides: object) -> FujitsuLLMLayerConfig:
    defaults: dict[str, object] = {
        "endpoint_url": "https://llm.example.fujitsu.com/v1",
        "api_key": "test-api-key",
        "model": "takane",
    }
    defaults.update(overrides)
    return FujitsuLLMLayerConfig.model_validate(defaults)


@pytest.fixture
def open_http_client():
    client = httpx.AsyncClient()
    yield client
    # No need to close synchronously; the test just checks structural properties.


def test_fujitsu_llm_layer_type_id() -> None:
    assert FujitsuLLMLayer.type_id == FUJITSU_LLM_LAYER_TYPE_ID


def test_fujitsu_llm_layer_from_config_creates_layer() -> None:
    config = _make_config()
    layer = FujitsuLLMLayer.from_config(config)
    assert layer.config is config


def test_fujitsu_llm_layer_get_model_raises_on_closed_client() -> None:
    config = _make_config()
    layer = FujitsuLLMLayer.from_config(config)

    # Use a real client, then close it before passing it.
    import asyncio

    closed_client = httpx.AsyncClient()
    asyncio.run(closed_client.aclose())

    with pytest.raises(RuntimeError, match="open shared HTTP client"):
        layer.get_model(http_client=closed_client)


def test_fujitsu_llm_layer_get_model_returns_openai_chat_model(open_http_client: httpx.AsyncClient) -> None:
    from pydantic_ai.models.openai import OpenAIChatModel

    config = _make_config()
    layer = FujitsuLLMLayer.from_config(config)

    model = layer.get_model(http_client=open_http_client)

    assert isinstance(model, OpenAIChatModel)
    assert model.model_name == "takane"


def test_fujitsu_llm_layer_get_model_passes_model_settings(open_http_client: httpx.AsyncClient) -> None:
    from pydantic_ai.models.openai import OpenAIChatModel

    config = _make_config(model_settings={"temperature": 0.5})
    layer = FujitsuLLMLayer.from_config(config)

    model = layer.get_model(http_client=open_http_client)

    assert isinstance(model, OpenAIChatModel)
    assert model.settings is not None
    assert model.settings.get("temperature") == 0.5
