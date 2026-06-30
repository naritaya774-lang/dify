import json
import unittest
from contextlib import asynccontextmanager
from typing import cast
from unittest.mock import patch

import httpx
import pytest

from dify_agent.layers.dify_plugin.tool_client import (
    DifyPluginDaemonToolClient,
    DifyPluginToolClientError,
    DifyPluginToolInvokeMessage,
)


def _make_client(http_client: httpx.AsyncClient) -> DifyPluginDaemonToolClient:
    return DifyPluginDaemonToolClient(
        plugin_daemon_url="http://plugin-daemon",
        plugin_daemon_api_key="daemon-secret",
        tenant_id="tenant-1",
        plugin_id="langgenius/tools",
        user_id=None,
        http_client=http_client,
    )


def _text_stream_response(*texts: str) -> httpx.Response:
    lines = "".join(
        f"data: {json.dumps({'code': 0, 'message': '', 'data': {'type': 'text', 'message': {'text': t}, 'meta': None}})}\n\n"
        for t in texts
    )
    return httpx.Response(
        status_code=200,
        headers={"content-type": "text/event-stream"},
        content=lines.encode("utf-8"),
    )


@asynccontextmanager
async def _mock_stream_handler(handler: httpx.MockTransport):
    """Patch httpx.AsyncClient.stream with a mock transport handler."""

    @asynccontextmanager
    async def _patched_stream(
        client: httpx.AsyncClient,
        method: str,
        url: str,
        **kwargs: object,
    ):
        request = client.build_request(
            method,
            url,
            headers=cast(dict[str, str] | None, kwargs.get("headers")),
            json=kwargs.get("json"),
        )
        yield handler.handle_request(request)

    with patch.object(httpx.AsyncClient, "stream", new=_patched_stream):
        yield


class DifyPluginDaemonToolClientConnectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_connect_error_raises_tool_client_error(self) -> None:
        """ConnectError from the daemon is wrapped in DifyPluginToolClientError."""

        @asynccontextmanager
        async def _raise_connect_error(
            _client: httpx.AsyncClient, *args: object, **kwargs: object
        ):
            raise httpx.ConnectError("Connection refused")
            yield  # pragma: no cover

        with patch.object(httpx.AsyncClient, "stream", new=_raise_connect_error):
            client = _make_client(httpx.AsyncClient())
            with pytest.raises(DifyPluginToolClientError) as exc_info:
                await client.invoke(
                    provider="search",
                    tool_name="web_search",
                    credential_type="api-key",
                    credentials={"api_key": "secret"},
                    tool_parameters={"query": "hello"},
                )

        err = exc_info.value
        self.assertEqual(err.error_type, "InvokeConnectionError")
        self.assertIn("plugin-daemon", str(err))

    async def test_connect_timeout_raises_tool_client_error(self) -> None:
        """ConnectTimeout from the daemon is wrapped in DifyPluginToolClientError."""

        @asynccontextmanager
        async def _raise_connect_timeout(
            _client: httpx.AsyncClient, *args: object, **kwargs: object
        ):
            raise httpx.ConnectTimeout("Connection timed out")
            yield  # pragma: no cover

        with patch.object(httpx.AsyncClient, "stream", new=_raise_connect_timeout):
            client = _make_client(httpx.AsyncClient())
            with pytest.raises(DifyPluginToolClientError) as exc_info:
                await client.invoke(
                    provider="search",
                    tool_name="web_search",
                    credential_type="api-key",
                    credentials={"api_key": "secret"},
                    tool_parameters={"query": "hello"},
                )

        err = exc_info.value
        self.assertEqual(err.error_type, "InvokeConnectionError")

    async def test_successful_invoke_returns_messages(self) -> None:
        """Successful daemon response is parsed and returned as a message list."""

        def handler(request: httpx.Request) -> httpx.Response:
            return _text_stream_response("result text")

        async with _mock_stream_handler(httpx.MockTransport(handler)):
            client = _make_client(httpx.AsyncClient())
            messages = await client.invoke(
                provider="search",
                tool_name="web_search",
                credential_type="api-key",
                credentials={"api_key": "secret"},
                tool_parameters={"query": "hello"},
            )

        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].type, DifyPluginToolInvokeMessage.MessageType.TEXT)
        assert isinstance(messages[0].message, DifyPluginToolInvokeMessage.TextMessage)
        self.assertEqual(messages[0].message.text, "result text")

    async def test_connect_error_preserves_original_cause(self) -> None:
        """The original ConnectError is chained as __cause__ for debugging."""

        original = httpx.ConnectError("Connection refused")

        @asynccontextmanager
        async def _raise(_client: httpx.AsyncClient, *args: object, **kwargs: object):
            raise original
            yield  # pragma: no cover

        with patch.object(httpx.AsyncClient, "stream", new=_raise):
            client = _make_client(httpx.AsyncClient())
            with pytest.raises(DifyPluginToolClientError) as exc_info:
                await client.invoke(
                    provider="search",
                    tool_name="web_search",
                    credential_type="api-key",
                    credentials={"api_key": "secret"},
                    tool_parameters={"query": "hello"},
                )

        self.assertIs(exc_info.value.__cause__, original)
