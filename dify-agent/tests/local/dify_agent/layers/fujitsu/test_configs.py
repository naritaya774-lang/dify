import pytest
from pydantic import ValidationError

import dify_agent.layers.fujitsu as fujitsu_exports
from dify_agent.layers.fujitsu import (
    FUJITSU_LLM_LAYER_TYPE_ID,
    FujitsuLLMLayerConfig,
)


def test_fujitsu_package_exports_client_safe_config_symbols_only() -> None:
    assert fujitsu_exports.__all__ == [
        "FUJITSU_LLM_LAYER_TYPE_ID",
        "FujitsuLLMLayerConfig",
    ]
    assert FUJITSU_LLM_LAYER_TYPE_ID == "fujitsu.llm"
    assert not hasattr(fujitsu_exports, "FujitsuLLMLayer")


def test_fujitsu_llm_config_accepts_required_fields() -> None:
    config = FujitsuLLMLayerConfig(
        endpoint_url="https://llm.example.fujitsu.com/v1",
        api_key="test-api-key",
        model="takane",
    )
    assert config.endpoint_url == "https://llm.example.fujitsu.com/v1"
    assert config.api_key == "test-api-key"
    assert config.model == "takane"
    assert config.model_settings is None


def test_fujitsu_llm_config_accepts_model_settings() -> None:
    config = FujitsuLLMLayerConfig(
        endpoint_url="https://llm.example.fujitsu.com/v1",
        api_key="test-api-key",
        model="takane",
        model_settings={"temperature": 0.7, "max_tokens": 1024},
    )
    assert config.model_settings == {"temperature": 0.7, "max_tokens": 1024}


def test_fujitsu_llm_config_strips_trailing_slash_from_endpoint_url() -> None:
    config = FujitsuLLMLayerConfig(
        endpoint_url="https://llm.example.fujitsu.com/v1/",
        api_key="test-api-key",
        model="takane",
    )
    assert config.endpoint_url == "https://llm.example.fujitsu.com/v1"


def test_fujitsu_llm_config_rejects_empty_api_key() -> None:
    with pytest.raises(ValidationError):
        FujitsuLLMLayerConfig(
            endpoint_url="https://llm.example.fujitsu.com/v1",
            api_key="",
            model="takane",
        )


def test_fujitsu_llm_config_rejects_whitespace_only_api_key() -> None:
    with pytest.raises(ValidationError):
        FujitsuLLMLayerConfig(
            endpoint_url="https://llm.example.fujitsu.com/v1",
            api_key="   ",
            model="takane",
        )


def test_fujitsu_llm_config_rejects_empty_model() -> None:
    with pytest.raises(ValidationError):
        FujitsuLLMLayerConfig(
            endpoint_url="https://llm.example.fujitsu.com/v1",
            api_key="test-api-key",
            model="",
        )


def test_fujitsu_llm_config_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        FujitsuLLMLayerConfig.model_validate(
            {
                "endpoint_url": "https://llm.example.fujitsu.com/v1",
                "api_key": "test-api-key",
                "model": "takane",
                "unknown_field": "not_allowed",
            }
        )
