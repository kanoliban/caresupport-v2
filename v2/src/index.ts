import { buildServer } from "./server.js";
import { assertServerConfig, config } from "./config.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  assertServerConfig();
  const app = buildServer();
  app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        claudeModel: config.claudeModel,
        claudeMaxTokens: config.claudeMaxTokens,
        claudeRequestTimeoutMs: config.claudeRequestTimeoutMs,
        useAgentSdk: process.env.CARESUPPORT_USE_AGENT_SDK !== "0",
        agentSdkTimeoutMs: Number(process.env.CARESUPPORT_AGENT_SDK_TIMEOUT_MS ?? "30000"),
        linqReadReceiptDelayMs: config.linqReadReceiptDelayMs,
        linqRequestTimeoutMs: config.linqRequestTimeoutMs,
        linqTypingStartDelayMs: config.linqTypingStartDelayMs,
        linqTypingHeartbeatMs: config.linqTypingHeartbeatMs,
        linqInterBubbleDelayMs: config.linqInterBubbleDelayMs,
        naturalResponseDelayEnabled: config.naturalResponseDelayEnabled,
        responseDelayMinMs: config.responseDelayMinMs,
        responseDelayMaxMs: config.responseDelayMaxMs,
        responseDelayPerCharMs: config.responseDelayPerCharMs,
        responseDelayJitterMs: config.responseDelayJitterMs,
      },
      "CareSupport V2 server listening",
    );
  });
}

main().catch((error) => {
  logger.error({ error }, "CareSupport V2 failed to start");
  process.exit(1);
});
