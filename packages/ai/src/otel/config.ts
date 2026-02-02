/**
 * OpenTelemetry configuration module
 * 
 * Configures OpenTelemetry tracing for LLM API calls with support for:
 * - Custom OTLP HTTP endpoints
 * - Authorization headers
 * - JSON export format
 * - Environment variable configuration
 */

import { trace, type Span, type Tracer, SpanStatusCode } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";

export interface OtelConfig {
	/** OTLP endpoint URL (e.g., 'https://collector.example.com/v1/traces') */
	endpoint?: string;
	/** Custom headers (including authorization) */
	headers?: Record<string, string>;
	/** Service name for traces */
	serviceName?: string;
	/** Service version */
	serviceVersion?: string;
	/** Enable/disable OpenTelemetry */
	enabled?: boolean;
}

let tracerProvider: BasicTracerProvider | null = null;
let tracer: Tracer | null = null;
let otelEnabled = false;

/**
 * Initialize OpenTelemetry tracing
 * 
 * Environment variables:
 * - OTEL_ENABLED: Enable/disable OTEL (true/false)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: OTLP endpoint URL
 * - OTEL_EXPORTER_OTLP_HEADERS: Custom headers in format "key1=value1,key2=value2"
 * - OTEL_SERVICE_NAME: Service name (defaults to "pi-ai")
 * - OTEL_SERVICE_VERSION: Service version
 */
export function initializeOtel(config?: OtelConfig): void {
	// Check if already initialized
	if (tracerProvider) {
		return;
	}

	// Determine if OTEL should be enabled
	const envEnabled = process.env.OTEL_ENABLED?.toLowerCase() === "true";
	const configEnabled = config?.enabled ?? false;
	otelEnabled = envEnabled || configEnabled;

	if (!otelEnabled) {
		return;
	}

	// Get configuration from environment or config
	const endpoint =
		config?.endpoint ||
		process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
		process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

	if (!endpoint) {
		console.warn("[otel] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled");
		otelEnabled = false;
		return;
	}

	// Parse headers from environment or config
	const headers: Record<string, string> = { ...config?.headers };
	const envHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS;
	if (envHeaders) {
		for (const pair of envHeaders.split(",")) {
			const [key, ...valueParts] = pair.split("=");
			if (key && valueParts.length > 0) {
				headers[key.trim()] = valueParts.join("=").trim();
			}
		}
	}

	const serviceName = config?.serviceName || process.env.OTEL_SERVICE_NAME || "pi-ai";
	const serviceVersion = config?.serviceVersion || process.env.OTEL_SERVICE_VERSION || "unknown";

	try {
		// Create resource with service information
		const resource = new Resource({
			[ATTR_SERVICE_NAME]: serviceName,
			[ATTR_SERVICE_VERSION]: serviceVersion,
		});

		// Create OTLP exporter with custom headers
		const exporter = new OTLPTraceExporter({
			url: endpoint,
			headers,
		});

		// Create tracer provider
		tracerProvider = new BasicTracerProvider({
			resource,
		});

		// Add batch span processor
		tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));

		// Register the tracer provider
		tracerProvider.register();

		// Get tracer instance
		tracer = trace.getTracer(serviceName, serviceVersion);

		console.log(`[otel] OpenTelemetry initialized: ${endpoint}`);
	} catch (error) {
		console.error("[otel] Failed to initialize OpenTelemetry:", error);
		otelEnabled = false;
	}
}

/**
 * Shutdown OpenTelemetry and flush pending spans
 */
export async function shutdownOtel(): Promise<void> {
	if (tracerProvider) {
		await tracerProvider.shutdown();
		tracerProvider = null;
		tracer = null;
		otelEnabled = false;
	}
}

/**
 * Check if OpenTelemetry is enabled
 */
export function isOtelEnabled(): boolean {
	return otelEnabled;
}

/**
 * Get the tracer instance
 */
export function getTracer(): Tracer | null {
	return tracer;
}

/**
 * Create a span for tracing
 * 
 * @param name - Span name
 * @param fn - Function to execute within the span (receives null when OTEL is disabled)
 * @param attributes - Optional span attributes
 */
export async function withSpan<T>(
	name: string,
	fn: (span: Span | null) => Promise<T>,
	attributes?: Record<string, string | number | boolean>,
): Promise<T> {
	if (!otelEnabled || !tracer) {
		return fn(null);
	}

	return tracer.startActiveSpan(name, { attributes }, async (span) => {
		try {
			const result = await fn(span);
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (error) {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			span.recordException(error instanceof Error ? error : new Error(String(error)));
			throw error;
		} finally {
			span.end();
		}
	});
}

/**
 * Create a span for tracing (synchronous version)
 * 
 * @param name - Span name
 * @param fn - Function to execute within the span (receives null when OTEL is disabled)
 * @param attributes - Optional span attributes
 */
export function withSpanSync<T>(
	name: string,
	fn: (span: Span | null) => T,
	attributes?: Record<string, string | number | boolean>,
): T {
	if (!otelEnabled || !tracer) {
		return fn(null);
	}

	return tracer.startActiveSpan(name, { attributes }, (span) => {
		try {
			const result = fn(span);
			span.setStatus({ code: SpanStatusCode.OK });
			return result;
		} catch (error) {
			span.setStatus({
				code: SpanStatusCode.ERROR,
				message: error instanceof Error ? error.message : String(error),
			});
			span.recordException(error instanceof Error ? error : new Error(String(error)));
			throw error;
		} finally {
			span.end();
		}
	});
}

/**
 * Set attributes on the current span
 */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>): void {
	if (!otelEnabled) {
		return;
	}

	const span = trace.getActiveSpan();
	if (span) {
		for (const [key, value] of Object.entries(attributes)) {
			span.setAttribute(key, value);
		}
	}
}

/**
 * Add an event to the current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
	if (!otelEnabled) {
		return;
	}

	const span = trace.getActiveSpan();
	if (span) {
		span.addEvent(name, attributes);
	}
}
