/**
 * OpenTelemetry module exports
 */

export {
	initializeOtel,
	shutdownOtel,
	isOtelEnabled,
	getTracer,
	withSpan,
	withSpanSync,
	setSpanAttributes,
	addSpanEvent,
	type OtelConfig,
} from "./config.js";
