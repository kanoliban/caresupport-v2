import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { convexRunArgs, extractJsonObject, isE164Phone } from "./run-rob-controlled-activation";

type ControlledContactKey = "jim" | "jennifer";

interface LiveVerificationConfig {
  robPhone: string;
  controlledContactKeys: ControlledContactKey[];
  deploymentName?: string;
  envFile?: string;
  prod?: boolean;
}

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

type CommandRunner = (command: string, args: string[]) => CommandResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptions(argv: string[]): Record<string, string | undefined> {
  const options: Record<string, string | undefined> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const equalIndex = item.indexOf("=");
    if (equalIndex > 0) {
      options[item.slice(2, equalIndex)] = item.slice(equalIndex + 1);
      continue;
    }
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = "true";
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function parseControlledContactKeys(value: string | undefined): ControlledContactKey[] {
  if (!value) return ["jim", "jennifer"];
  const keys = value.split(",").map((key) => key.trim()).filter(Boolean);
  if (keys.length === 0) return ["jim", "jennifer"];
  for (const key of keys) {
    if (key !== "jim" && key !== "jennifer") {
      throw new Error(`Unsupported controlled contact key: ${key}`);
    }
  }
  return keys as ControlledContactKey[];
}

export function parseLiveVerificationConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): LiveVerificationConfig {
  const options = parseOptions(argv);
  const robPhone = options["rob-phone"] || env.ROB_PHONE;
  const deploymentName = options["deployment-name"] || env.CONVEX_DEPLOYMENT_NAME;
  const prodValue = options.prod || env.CONVEX_PROD;
  const prod = prodValue === "true" || prodValue === "1";
  if (!robPhone) {
    throw new Error("Missing required activation input: ROB_PHONE or --rob-phone");
  }
  if (!isE164Phone(robPhone)) {
    throw new Error("Rob phone must be E.164 format, for example +16515559000");
  }
  if (prod && deploymentName) {
    throw new Error(
      "Use either --prod/CONVEX_PROD or --deployment-name/CONVEX_DEPLOYMENT_NAME, not both",
    );
  }

  return {
    robPhone,
    controlledContactKeys: parseControlledContactKeys(
      options["contact-keys"] || env.CONTROLLED_CONTACT_KEYS,
    ),
    deploymentName,
    envFile: options["env-file"] || env.CONVEX_ENV_FILE,
    prod: prod || undefined,
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function reportBlockers(value: unknown): string {
  return isRecord(value) ? stringArray(value.blockers).join(", ") : "unknown";
}

export function assertLiveControlledReport(
  report: unknown,
  expectedContactKeys: ControlledContactKey[] = ["jim", "jennifer"],
): void {
  if (!isRecord(report)) {
    throw new Error("Controlled-loop report was not an object");
  }
  if (report.passed !== true) {
    throw new Error(
      `Controlled-loop report did not pass. Blockers: ${reportBlockers(report)}`,
    );
  }
  const warnings = stringArray(report.warnings);
  const liveReplyWarnings = warnings.filter((warning) =>
    warning.startsWith("live_reply_audit_missing:"),
  );
  if (liveReplyWarnings.length > 0) {
    throw new Error(
      `Live reply audits are missing: ${liveReplyWarnings.join(", ")}`,
    );
  }
  const robStatusMessageIds = stringArray(report.robStatusMessageIds);
  if (robStatusMessageIds.length === 0) {
    throw new Error("Fresh Rob status message evidence is missing");
  }
  if (!Array.isArray(report.contacts)) {
    throw new Error("Controlled-loop report did not include contacts");
  }

  for (const key of expectedContactKeys) {
    const contact = report.contacts.find(
      (item) => isRecord(item) && item.key === key,
    );
    if (!isRecord(contact)) {
      throw new Error(`Controlled contact report missing: ${key}`);
    }
    if (contact.passed !== true) {
      throw new Error(`Controlled contact did not pass: ${key}`);
    }
    if (typeof contact.latestSentOutreachAttemptId !== "string") {
      throw new Error(`Sent outreach evidence missing for ${key}`);
    }
    if (typeof contact.outboundMessageId !== "string") {
      throw new Error(`Outbound message evidence missing for ${key}`);
    }
    if (typeof contact.inboundReplyMessageId !== "string") {
      throw new Error(`Inbound reply evidence missing for ${key}`);
    }
    if (contact.followUpClockClearedOrDeferred !== true) {
      throw new Error(`Follow-up clock is not cleared or deferred for ${key}`);
    }
    if (!isRecord(contact.audit)) {
      throw new Error(`Audit summary missing for ${key}`);
    }
    const audit = contact.audit;
    const auditFields = [
      "outreachRequested",
      "outreachApproved",
      "outreachSent",
      "liveReplyReceived",
      "statusSentToRob",
    ];
    const missingAuditFields = auditFields.filter(
      (field) => audit[field] !== true,
    );
    if (missingAuditFields.length > 0) {
      throw new Error(
        `Audit evidence missing for ${key}: ${missingAuditFields.join(", ")}`,
      );
    }
  }
}

function defaultRunner(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf-8",
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runReport(config: LiveVerificationConfig, runner: CommandRunner): unknown {
  const args = convexRunArgs(
    "admin:getRobControlledLoopReport",
    {
      robPhone: config.robPhone,
      controlledContactKeys: config.controlledContactKeys,
    },
    config,
  );
  const result = runner("npx", args);
  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (output.includes("deployment is paused")) {
      throw new Error(
        "Convex deployment is paused. Resume it in the Convex dashboard before verifying Rob activation.",
      );
    }
    throw new Error(`Convex command failed: npx ${args.join(" ")}\n${output}`);
  }
  return extractJsonObject(result.stdout);
}

export function verifyRobControlledLiveActivation(
  config: LiveVerificationConfig,
  runner: CommandRunner = defaultRunner,
): void {
  console.log("Verifying Rob controlled live activation report...");
  const report = runReport(config, runner);
  assertLiveControlledReport(report, config.controlledContactKeys);
  console.log("Rob controlled live activation verified.");
  console.log(`Contacts verified: ${config.controlledContactKeys.join(", ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    verifyRobControlledLiveActivation(
      parseLiveVerificationConfig(process.argv.slice(2)),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
