#!/usr/bin/env node
/**
 * CLI entry point for the refactored coding agent.
 * Uses main.ts with AgentSession and new mode modules.
 *
 * Test with: npx tsx src/cli-new.ts [args...]
 */
process.title = "pi";

import { shutdownOtel } from "@mariozechner/pi-ai";
import { main } from "./main.js";

// Ensure OpenTelemetry is properly shutdown on exit
async function cleanup() {
	await shutdownOtel();
}

// Use beforeExit for async cleanup during normal termination
process.on("beforeExit", async () => {
	await cleanup();
});

process.on("SIGINT", async () => {
	await cleanup();
	process.exit(130);
});

process.on("SIGTERM", async () => {
	await cleanup();
	process.exit(143);
});

main(process.argv.slice(2)).catch((error) => {
	console.error("Fatal error:", error);
	cleanup()
		.catch(() => {
			// Ignore errors during cleanup
		})
		.finally(() => {
			process.exit(1);
		});
});
