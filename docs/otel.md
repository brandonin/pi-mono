# OpenTelemetry (OTEL) Configuration Guide

This guide explains how to configure OpenTelemetry tracing for the pi coding agent and AI package.

## Overview

Pi now supports OpenTelemetry (OTEL) tracing for all LLM API calls, similar to how it's implemented in Claude CLI, Codex CLI, and Gemini CLI. This allows you to:

- Send traces to any OTLP-compatible collector (Jaeger, Tempo, Honeycomb, etc.)
- Track LLM usage, token consumption, and performance
- Debug issues with LLM API calls
- Monitor costs and latency across different providers
- Export data via HTTP/JSON with custom authorization headers

## Quick Start

Enable OpenTelemetry by setting environment variables before running `pi`:

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
pi
```

## Environment Variables

### Required Variables

- **OTEL_ENABLED**: Set to `true` to enable OpenTelemetry tracing
- **OTEL_EXPORTER_OTLP_ENDPOINT**: URL of your OTLP collector endpoint

### Optional Variables

- **OTEL_EXPORTER_OTLP_HEADERS**: Custom headers in format `key1=value1,key2=value2`
- **OTEL_SERVICE_NAME**: Service name for traces (default: `pi-ai`)
- **OTEL_SERVICE_VERSION**: Service version (default: `unknown`)

## Common Setups

### Local Jaeger (Simplest)

Run Jaeger in a Docker container:

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Configure pi:

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=my-pi-agent
pi
```

View traces at http://localhost:16686

### Honeycomb.io

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS="x-honeycomb-team=YOUR_API_KEY"
export OTEL_SERVICE_NAME=pi-agent
pi
```

### Grafana Cloud / Tempo

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://tempo-prod-us-central-0.grafana.net/tempo/api/push
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Basic YOUR_BASE64_CREDENTIALS"
export OTEL_SERVICE_NAME=pi-agent
pi
```

### New Relic

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net/v1/traces
export OTEL_EXPORTER_OTLP_HEADERS="api-key=YOUR_LICENSE_KEY"
export OTEL_SERVICE_NAME=pi-agent
pi
```

### Datadog

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com/api/v2/otlp
export OTEL_EXPORTER_OTLP_HEADERS="DD-API-KEY=YOUR_API_KEY"
export OTEL_SERVICE_NAME=pi-agent
pi
```

### Lightstep

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=https://ingest.lightstep.com:443/traces/otlp/v0.9
export OTEL_EXPORTER_OTLP_HEADERS="lightstep-access-token=YOUR_ACCESS_TOKEN"
export OTEL_SERVICE_NAME=pi-agent
pi
```

### AWS X-Ray (via OTEL Collector)

First, run the OTEL Collector configured for X-Ray, then:

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=pi-agent
pi
```

### Google Cloud Trace (via OTEL Collector)

First, run the OTEL Collector configured for Cloud Trace, then:

```bash
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=pi-agent
pi
```

## Trace Attributes

Each LLM API call generates a span with the following attributes:

### Operation Attributes
- `llm.operation`: Type of operation (`stream`, `complete`, `stream_simple`, `complete_simple`)
- `llm.api`: API type (e.g., `anthropic`, `openai`, `google-gemini`)
- `llm.model`: Model identifier (e.g., `claude-3-5-sonnet-20241022`)
- `llm.provider`: Provider name (e.g., `anthropic`, `openai-codex`)

### Context Attributes
- `llm.system_prompt_length`: Length of the system prompt
- `llm.message_count`: Number of messages in the context

### Usage Attributes (populated after completion)
- `llm.usage.input_tokens`: Number of input tokens consumed
- `llm.usage.output_tokens`: Number of output tokens generated
- `llm.usage.total_tokens`: Total token count
- `llm.usage.cache_read_tokens`: Tokens read from cache (when applicable)
- `llm.usage.cache_write_tokens`: Tokens written to cache (when applicable)

## Shell Configuration

Add to your `~/.bashrc` or `~/.zshrc` for persistent configuration:

```bash
# OpenTelemetry configuration for pi
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=pi-agent
```

Or create a dedicated configuration file:

```bash
# ~/.pi/otel.env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=pi-agent
```

Load it before using pi:

```bash
source ~/.pi/otel.env
pi
```

## Per-Project Configuration

For project-specific telemetry, use a `.env` file:

```bash
# .env in your project directory
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_SERVICE_NAME=my-project-pi
```

Load with:

```bash
export $(cat .env | xargs)
pi
```

## Troubleshooting

### Traces Not Appearing

1. **Verify OTEL is enabled:**
   ```bash
   echo $OTEL_ENABLED
   # Should output: true
   ```

2. **Check endpoint accessibility:**
   ```bash
   curl -v $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. **Look for initialization message:**
   When pi starts with OTEL enabled, you should see:
   ```
   [otel] OpenTelemetry initialized: http://...
   ```

4. **Check for errors:**
   If initialization fails, you'll see:
   ```
   [otel] Failed to initialize OpenTelemetry: ...
   ```

### Authorization Failures

Ensure your headers are properly formatted:

```bash
# Single header
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer YOUR_TOKEN"

# Multiple headers (comma-separated)
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer TOKEN,X-Custom=value"
```

### Network Issues

If your collector is behind a proxy or firewall:

1. Ensure the endpoint URL is accessible
2. Check for any proxy settings that might interfere
3. Verify SSL/TLS certificates if using HTTPS

### Missing Spans

If spans aren't being exported:

1. Wait a few seconds - spans are batched for efficiency
2. Check that your collector is running and accepting data
3. Verify the endpoint URL is correct (should end with `/v1/traces`)

## Performance Impact

OpenTelemetry has minimal performance impact:

- When **disabled**: Zero overhead
- When **enabled**: 
  - Negligible CPU overhead for span creation
  - Spans are batched and sent asynchronously
  - Network calls don't block LLM operations

## Security Considerations

1. **Protect API Keys**: Never commit authorization tokens to version control
2. **Use Environment Variables**: Store sensitive data in environment variables or secret management systems
3. **Secure Transport**: Use HTTPS endpoints in production
4. **Review Data**: Traces may contain prompts and responses - ensure compliance with data policies

## Advanced Usage

### Programmatic Configuration

For custom applications using the SDK:

```typescript
import { initializeOtel } from "@mariozechner/pi-ai";

initializeOtel({
  enabled: true,
  endpoint: "https://your-collector.example.com/v1/traces",
  headers: {
    "Authorization": "Bearer your-token",
    "X-Environment": "production"
  },
  serviceName: "my-custom-agent",
  serviceVersion: "1.0.0"
});
```

### Custom Spans

Add custom instrumentation:

```typescript
import { withSpan, setSpanAttributes } from "@mariozechner/pi-ai";

await withSpan("custom-operation", async (span) => {
  setSpanAttributes({
    "custom.attribute": "value",
    "user.id": "123"
  });
  
  // Your code here
}, {
  "operation.type": "custom"
});
```

## Supported Collectors

This implementation works with any OTLP-compatible collector:

- ✅ Jaeger
- ✅ Grafana Tempo
- ✅ Honeycomb
- ✅ Lightstep
- ✅ New Relic
- ✅ Datadog
- ✅ Elastic APM
- ✅ AWS X-Ray (via collector)
- ✅ Google Cloud Trace (via collector)
- ✅ Azure Monitor
- ✅ OpenTelemetry Collector

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/)
- [Jaeger Getting Started](https://www.jaegertracing.io/docs/latest/getting-started/)
- [Pi Documentation](../README.md)

## Examples

See the [ai/src/otel/README.md](../packages/ai/src/otel/README.md) for more implementation details.
