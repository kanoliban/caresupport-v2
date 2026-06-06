import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

interface PreflightConfig {
  coordinatorPhone: string;
  coordinatorChatId?: string;
  controlledContactNames: string[];
  coordinationEventTitle?: string;
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

function stringOption(
  options: Record<string, string | undefined>,
  env: NodeJS.ProcessEnv,
  optionName: string,
  envName: string,
): string | undefined {
  return options[optionName] || env[envName];
}

function booleanOption(
  options: Record<string, string | undefined>,
  env: NodeJS.ProcessEnv,
  optionName: string,
  envName: string,
): boolean {
  const value = options[optionName] || env[envName];
  return value === "true" || value === "1";
}

function listOption(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function isE164Phone(value: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(value.trim());
}

export function parsePreflightConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): PreflightConfig {
  const options = parseOptions(argv);
  const coordinatorPhone = stringOption(
    options,
    env,
    "coordinator-phone",
    "COORDINATOR_PHONE",
  );
  const coordinatorChatId = stringOption(
    options,
    env,
    "coordinator-chat-id",
    "COORDINATOR_CHAT_ID",
  );
  const controlledContactNames = listOption(
    stringOption(options, env, "contact-names", "CONTROLLED_CONTACT_NAMES"),
  );
  const coordinationEventTitle = stringOption(
    options,
    env,
    "event-title",
    "COORDINATION_EVENT_TITLE",
  );
  const deploymentName = stringOption(
    options,
    env,
    "deployment-name",
    "CONVEX_DEPLOYMENT_NAME",
  );
  const envFile = stringOption(options, env, "env-file", "CONVEX_ENV_FILE");
  const prod = booleanOption(options, env, "prod", "CONVEX_PROD");

  if (!coordinatorPhone) {
    throw new Error(
      "Missing required preflight input: COORDINATOR_PHONE or --coordinator-phone",
    );
  }
  if (!isE164Phone(coordinatorPhone)) {
    throw new Error(
      "Coordinator phone must be E.164 format, for example +16515559000",
    );
  }
  if (prod && deploymentName) {
    throw new Error(
      "Use either --prod/CONVEX_PROD or --deployment-name/CONVEX_DEPLOYMENT_NAME, not both",
    );
  }

  return {
    coordinatorPhone,
    coordinatorChatId: coordinatorChatId || undefined,
    controlledContactNames,
    coordinationEventTitle: coordinationEventTitle || undefined,
    deploymentName,
    envFile,
    prod: prod || undefined,
  };
}

export function buildReadinessPayload(
  config: PreflightConfig,
): Record<string, unknown> {
  return {
    coordinatorPhone: config.coordinatorPhone,
    coordinatorChatId: config.coordinatorChatId,
    controlledContactNames: config.controlledContactNames,
    coordinationEventTitle: config.coordinationEventTitle,
  };
}

export function convexRunArgs(
  functionName: string,
  payload: Record<string, unknown> | undefined,
  config: Pick<PreflightConfig, "deploymentName" | "envFile" | "prod">,
): string[] {
  const args = ["convex", "run", functionName];
  if (payload) args.push(JSON.stringify(payload));
  if (config.prod) {
    args.push("--prod");
  }
  if (config.deploymentName) {
    args.push("--deployment-name", config.deploymentName);
  }
  if (config.envFile) {
    args.push("--env-file", config.envFile);
  }
  return args;
}

export function extractJsonObject(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error("Convex command produced no JSON output");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error(`Unable to parse Convex JSON output: ${trimmed}`);
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export function assertReadiness(value: unknown): void {
  if (!isRecord(value) || value.readyForControlledOutreach !== true) {
    const blockers = isRecord(value) && Array.isArray(value.blockers)
      ? value.blockers.join(", ")
      : "unknown";
    throw new Error(`Coordination preflight did not pass. Blockers: ${blockers}`);
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

function runConvexJson(
  functionName: string,
  payload: Record<string, unknown> | undefined,
  config: PreflightConfig,
  runner: CommandRunner,
): unknown {
  const args = convexRunArgs(functionName, payload, config);
  const result = runner("npx", args);
  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (output.includes("deployment is paused")) {
      throw new Error(
        "Convex deployment is paused. Resume it in the Convex dashboard before running coordination preflight.",
      );
    }
    throw new Error(`Convex command failed: npx ${args.join(" ")}\n${output}`);
  }
  return extractJsonObject(result.stdout);
}

export function runCoordinationPreflight(
  config: PreflightConfig,
  runner: CommandRunner = defaultRunner,
): void {
  console.log("Checking Convex deployment...");
  runConvexJson("admin:tableCounts", undefined, config, runner);

  console.log("Checking existing coordinator care graph readiness...");
  assertReadiness(
    runConvexJson(
      "admin:getCoordinationReadiness",
      buildReadinessPayload(config),
      config,
      runner,
    ),
  );

  console.log("\nCoordination preflight passed.");
  console.log("Next live step, from the coordinator thread:");
  console.log("CareSupport, confirm the controlled contact availability for this care coordination test.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    runCoordinationPreflight(parsePreflightConfig(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
