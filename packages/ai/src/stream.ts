import "./providers/register-builtins.js";
import "./utils/http-proxy.js";

import type { Span } from "@opentelemetry/api";
import { getApiProvider } from "./api-registry.js";
import { withSpan, setSpanAttributes } from "./otel/index.js";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEventStream,
	Context,
	Model,
	ProviderStreamOptions,
	SimpleStreamOptions,
	StreamOptions,
} from "./types.js";

export { getEnvApiKey } from "./env-api-keys.js";

function resolveApiProvider(api: Api) {
	const provider = getApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

/**
 * Set common span attributes for LLM operations
 */
function setLlmSpanAttributes(
	span: Span | null,
	model: Model<Api>,
	context: Context,
	result?: AssistantMessage,
): void {
	if (!span) return;

	span.setAttribute("llm.api", model.api);
	span.setAttribute("llm.model", model.id);
	span.setAttribute("llm.provider", model.provider);
	if (context.systemPrompt) {
		span.setAttribute("llm.system_prompt_length", context.systemPrompt.length);
	}
	span.setAttribute("llm.message_count", context.messages.length);

	if (result?.usage) {
		span.setAttribute("llm.usage.input_tokens", result.usage.input);
		span.setAttribute("llm.usage.output_tokens", result.usage.output);
		span.setAttribute("llm.usage.total_tokens", result.usage.totalTokens);
		if (result.usage.cacheRead) {
			span.setAttribute("llm.usage.cache_read_tokens", result.usage.cacheRead);
		}
		if (result.usage.cacheWrite) {
			span.setAttribute("llm.usage.cache_write_tokens", result.usage.cacheWrite);
		}
	}
}

export function stream<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): AssistantMessageEventStream {
	const provider = resolveApiProvider(model.api);
	const eventStream = provider.stream(model, context, options as StreamOptions);

	// Add OpenTelemetry tracing
	const originalResult = eventStream.result.bind(eventStream);
	eventStream.result = async () => {
		return withSpan(
			"llm.stream",
			async (span) => {
				setLlmSpanAttributes(span, model, context);
				const result = await originalResult();
				setLlmSpanAttributes(span, model, context, result);
				return result;
			},
			{
				"llm.operation": "stream",
			},
		);
	};

	return eventStream;
}

export async function complete<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): Promise<AssistantMessage> {
	return withSpan(
		"llm.complete",
		async (span) => {
			setLlmSpanAttributes(span, model, context);
			const s = stream(model, context, options);
			const result = await s.result();
			setLlmSpanAttributes(span, model, context, result);
			return result;
		},
		{
			"llm.operation": "complete",
		},
	);
}

export function streamSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const provider = resolveApiProvider(model.api);
	const eventStream = provider.streamSimple(model, context, options);

	// Add OpenTelemetry tracing
	const originalResult = eventStream.result.bind(eventStream);
	eventStream.result = async () => {
		return withSpan(
			"llm.stream_simple",
			async (span) => {
				setLlmSpanAttributes(span, model, context);
				const result = await originalResult();
				setLlmSpanAttributes(span, model, context, result);
				return result;
			},
			{
				"llm.operation": "stream_simple",
			},
		);
	};

	return eventStream;
}

export async function completeSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): Promise<AssistantMessage> {
	return withSpan(
		"llm.complete_simple",
		async (span) => {
			setLlmSpanAttributes(span, model, context);
			const s = streamSimple(model, context, options);
			const result = await s.result();
			setLlmSpanAttributes(span, model, context, result);
			return result;
		},
		{
			"llm.operation": "complete_simple",
		},
	);
}
