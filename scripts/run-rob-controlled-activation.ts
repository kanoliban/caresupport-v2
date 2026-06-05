import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

interface ContactOverrideInput {
  key: "jim" | "jennifer";
  phone: string;
  linqChatId?: string;
}

interface ActivationConfig {
  robPhone: string;
  robChatId: string;
  contactOverrides: [ContactOverrideInput, ContactOverrideInput];
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

export function isE164Phone(value: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(value.trim());
}

export function parseActivationConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): ActivationConfig {
  const options = parseOptions(argv);
  const robPhone = stringOption(options, env, "rob-phone", "ROB_PHONE");
  const robChatId = stringOption(options, env, "rob-chat-id", "ROB_CHAT_ID");
  const jimPhone = stringOption(options, env, "jim-phone", "JIM_TEST_PHONE");
  const jimChatId = stringOption(options, env, "jim-chat-id", "JIM_TEST_LINQ_CHAT_ID");
  const jenniferPhone = stringOption(
    options,
    env,
    "jennifer-phone",
    "JENNIFER_TEST_PHONE",
  );
  const jenniferChatId = stringOption(
    options,
    env,
    "jennifer-chat-id",
    "JENNIFER_TEST_LINQ_CHAT_ID",
  );
  const deploymentName = stringOption(
    options,
    env,
    "deployment-name",
    "CONVEX_DEPLOYMENT_NAME",
  );
  const envFile = stringOption(options, env, "env-file", "CONVEX_ENV_FILE");
  const prod = booleanOption(options, env, "prod", "CONVEX_PROD");

  const missing: string[] = [];
  if (!robPhone) missing.push("ROB_PHONE or --rob-phone");
  if (!robChatId) missing.push("ROB_CHAT_ID or --rob-chat-id");
  if (!jimPhone) missing.push("JIM_TEST_PHONE or --jim-phone");
  if (!jenniferPhone) missing.push("JENNIFER_TEST_PHONE or --jennifer-phone");
  if (missing.length > 0) {
    throw new Error(`Missing required activation inputs: ${missing.join(", ")}`);
  }
  if (!robPhone || !robChatId || !jimPhone || !jenniferPhone) {
    throw new Error("Missing required activation inputs after validation");
  }
  if (!isE164Phone(robPhone)) {
    throw new Error("Rob phone must be E.164 format, for example +16515559000");
  }
  if (!isE164Phone(jimPhone)) {
    throw new Error("Jim test phone must be E.164 format");
  }
  if (!isE164Phone(jenniferPhone)) {
    throw new Error("Jennifer test phone must be E.164 format");
  }
  if (prod && deploymentName) {
    throw new Error(
      "Use either --prod/CONVEX_PROD or --deployment-name/CONVEX_DEPLOYMENT_NAME, not both",
    );
  }

  return {
    robPhone,
    robChatId,
    contactOverrides: [
      { key: "jim", phone: jimPhone, linqChatId: jimChatId || undefined },
      {
        key: "jennifer",
        phone: jenniferPhone,
        linqChatId: jenniferChatId || undefined,
      },
    ],
    deploymentName,
    envFile,
    prod: prod || undefined,
  };
}

export function buildSeedPayload(config: ActivationConfig): Record<string, unknown> {
  return {
    robPhone: config.robPhone,
    robChatId: config.robChatId,
    useTestContactPhones: false,
    contactOverrides: config.contactOverrides,
  };
}

export function convexRunArgs(
  functionName: string,
  payload: Record<string, unknown> | undefined,
  config: Pick<ActivationConfig, "deploymentName" | "envFile" | "prod">,
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

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
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
    throw new Error(`Readiness did not pass. Blockers: ${blockers}`);
  }
}

export function assertDryRun(value: unknown): void {
  if (!isRecord(value) || value.ran !== true || !Array.isArray(value.simulated)) {
    throw new Error("Dry run did not execute successfully");
  }
  const notConfirmed = value.simulated.filter(
    (item) => isRecord(item) && item.replyStatus !== "confirmed",
  );
  if (notConfirmed.length > 0) {
    throw new Error("Dry run did not confirm all controlled contacts");
  }
}

export function assertReportPassed(value: unknown): void {
  if (!isRecord(value) || value.passed !== true) {
    const blockers = isRecord(value) && Array.isArray(value.blockers)
      ? value.blockers.join(", ")
      : "unknown";
    throw new Error(`Controlled-loop report did not pass. Blockers: ${blockers}`);
  }
}

export function assertReset(value: unknown): void {
  if (!isRecord(value) || value.reset !== true) {
    const reason = isRecord(value) && typeof value.reason === "string"
      ? value.reason
      : "unknown";
    throw new Error(`Dry-run reset failed. Reason: ${reason}`);
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
  config: ActivationConfig,
  runner: CommandRunner,
): unknown {
  const args = convexRunArgs(functionName, payload, config);
  const result = runner("npx", args);
  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (output.includes("deployment is paused")) {
      throw new Error(
        "Convex deployment is paused. Resume it in the Convex dashboard before running Rob activation.",
      );
    }
    throw new Error(`Convex command failed: npx ${args.join(" ")}\n${output}`);
  }
  return extractJsonObject(result.stdout);
}

export function runControlledActivationPreflight(
  config: ActivationConfig,
  runner: CommandRunner = defaultRunner,
): void {
  console.log("Checking Convex deployment...");
  runConvexJson("admin:tableCounts", undefined, config, runner);

  console.log("Seeding Rob controlled fixture with approved test numbers...");
  runConvexJson("admin:seedRobMultiplayerFixture", buildSeedPayload(config), config, runner);

  console.log("Checking controlled outreach readiness...");
  assertReadiness(
    runConvexJson(
      "admin:getRobMultiplayerReadiness",
      { robPhone: config.robPhone },
      config,
      runner,
    ),
  );

  console.log("Running no-Linq controlled dry run...");
  assertDryRun(
    runConvexJson(
      "admin:runRobControlledLoopDryRun",
      { robPhone: config.robPhone },
      config,
      runner,
    ),
  );

  console.log("Verifying dry-run graph evidence...");
  assertReportPassed(
    runConvexJson(
      "admin:getRobControlledLoopReport",
      { robPhone: config.robPhone },
      config,
      runner,
    ),
  );

  console.log("Resetting dry-run state before live test-number outreach...");
  assertReset(
    runConvexJson(
      "admin:resetRobControlledLoopAfterDryRun",
      { robPhone: config.robPhone },
      config,
      runner,
    ),
  );

  console.log("Checking readiness after reset...");
  assertReadiness(
    runConvexJson(
      "admin:getRobMultiplayerReadiness",
      { robPhone: config.robPhone },
      config,
      runner,
    ),
  );

  console.log("\nRob controlled activation preflight passed.");
  console.log("Next live step, from Rob's coordinator thread:");
  console.log("CareSupport, confirm Jim and Jennifer's schedule for the controlled Rob test.");
  console.log("\nAfter the test-number replies arrive, run:");
  console.log(
    `npx ${convexRunArgs(
      "admin:getRobControlledLoopReport",
      { robPhone: config.robPhone },
      config,
    ).map((arg) => arg.includes("{") ? shellQuote(arg) : arg).join(" ")}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    runControlledActivationPreflight(parseActivationConfig(process.argv.slice(2)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
