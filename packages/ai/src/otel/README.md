# OpenTelemetry Integration

This module provides OpenTelemetry (OTEL) tracing for LLM API calls in the pi-ai package.

## Features

- **OTLP HTTP JSON Export**: Send traces to any OTLP-compatible collector via HTTP/JSON
- **Custom Headers**: Support for authorization headers and custom metadata
- **LLM-specific Attributes**: Automatic tracking of model, provider, tokens, and usage
- **Environment Variable Configuration**: Easy setup via standard OTEL environment variables
- **Zero Overhead When Disabled**: No performance impact when tracing is not enabled

## Configuration

### Environment Variables

The following standard OpenTelemetry environment variables are supported:

```bash
# Enable/disable OpenTelemetry
export OTEL_ENABLED=true

# OTLP endpoint URL (required when enabled)
export OTEL_EXPORTER_OTLP_ENDPOINT=https://your-collector.example.com/v1/traces

# Custom headers (including authorization)
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token,X-Custom-Header=value"

# Service identification
export OTEL_SERVICE_NAME=pi-ai
export OTEL_SERVICE_VERSION=1.0.0
```

### Programmatic Configuration

```typescript
import { initializeOtel } from "@mariozechner/pi-ai";

initializeOtel({
  enabled: true,
  endpoint: "https://your-collector.example.com/v1/traces",
  headers: {
    "Authorization": "Bearer your-token",
    "X-Custom-Header": "value"
  },
  serviceName: "pi-ai",
  serviceVersion: "1.0.0"
});
```

## Usage Examples

### Basic Setup

```bash
# Set up OTEL for Jaeger
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=my-pi-agent

# Run your application
pi
```

### With Authorization

```bash
# Set up OTEL with API key
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=your-api-key"
export OTEL_SERVICE_NAME=pi-ai

# Run your application
pi
```

### Multiple Headers

```bash
# Set up OTEL with multiple custom headers
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer token123,X-Environment=production,X-Team=engineering"
export OTEL_SERVICE_NAME=pi-ai

# Run your application
pi
```

## Trace Attributes

Each LLM API call generates a span with the following attributes:

### Basic Attributes
- `llm.operation`: Operation type (`stream`, `complete`, `stream_simple`, `complete_simple`)
- `llm.api`: API type (e.g., `anthropic`, `openai`, `google-gemini`)
- `llm.model`: Model ID (e.g., `claude-3-5-sonnet-20241022`)
- `llm.provider`: Provider name
- `llm.system_prompt_length`: Length of system prompt
- `llm.message_count`: Number of messages in context

### Usage Attributes (when available)
- `llm.usage.input_tokens`: Input token count
- `llm.usage.output_tokens`: Output token count
- `llm.usage.total_tokens`: Total token count
- `llm.usage.cache_read_tokens`: Cache read token count
- `llm.usage.cache_write_tokens`: Cache write token count

## Supported Collectors

This implementation uses OTLP HTTP/JSON and works with any OpenTelemetry-compatible collector:

- **Jaeger**: Open-source distributed tracing
- **Tempo**: Grafana's tracing backend
- **Honeycomb**: Observability platform
- **Lightstep**: Performance monitoring
- **Elastic APM**: Application performance monitoring
- **New Relic**: Full-stack observability
- **Datadog**: Monitoring and analytics
- **AWS X-Ray**: Distributed tracing for AWS
- **Google Cloud Trace**: Distributed tracing for GCP
- **Azure Monitor**: Application insights

## Shutdown

OpenTelemetry is automatically shut down when the process exits. For manual shutdown:

```typescript
import { shutdownOtel } from "@mariozechner/pi-ai";

await shutdownOtel();
```

## Troubleshooting

### Traces Not Appearing

1. Verify OTEL is enabled:
   ```bash
   export OTEL_ENABLED=true
   ```

2. Check endpoint is correct:
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. Verify headers are formatted correctly:
   ```bash
   echo $OTEL_EXPORTER_OTLP_HEADERS
   ```

4. Look for OTEL initialization message in console:
   ```
   [otel] OpenTelemetry initialized: https://...
   ```

### Authorization Issues

Ensure your authorization header is properly formatted:
```bash
# For Bearer tokens
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer your-token"

# For API keys
export OTEL_EXPORTER_OTLP_HEADERS="X-API-Key=your-key"
```

## Similar Implementations

This implementation is similar to OpenTelemetry support in:
- **Claude CLI** (`claude` command-line tool)
- **OpenAI Codex CLI** (ChatGPT CLI tool)
- **Google Gemini CLI** (`gemini` command-line tool)

All support OTLP HTTP export with custom headers for authorization.
