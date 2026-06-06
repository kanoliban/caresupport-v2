import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { convexRunArgs, extractJsonObject, isE164Phone } from "./run-coordination-preflight";

interface LiveVerificationConfig {
  coordinatorPhone: string;
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

function listOption(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function parseLiveVerificationConfig(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): LiveVerificationConfig {
  const options = parseOptions(argv);
  const coordinatorPhone = options["coordinator-phone"] || env.COORDINATOR_PHONE;
  const controlledContactNames = listOption(
    options["contact-names"] || env.CONTROLLED_CONTACT_NAMES,
  );
  const coordinationEventTitle =
    options["event-title"] || env.COORDINATION_EVENT_TITLE;
  const deploymentName = options["deployment-name"] || env.CONVEX_DEPLOYMENT_NAME;
  const prodValue = options.prod || env.CONVEX_PROD;
  const prod = prodValue === "true" || prodValue === "1";

  if (!coordinatorPhone) {
    throw new Error(
      "Missing required activation input: COORDINATOR_PHONE or --coordinator-phone",
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
    controlledContactNames,
    coordinationEventTitle: coordinationEventTitle || undefined,
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

function contactMatchesExpected(
  contact: Record<string, unknown>,
  expectedName: string,
): boolean {
  return contact.name === expectedName || contact.key === expectedName;
}

export function assertLiveCoordinationReport(
  report: unknown,
  expectedContactNames: string[] = [],
): void {
  if (!isRecord(report)) {
    throw new Error("Coordination-loop report was not an object");
  }
  if (report.passed !== true) {
    throw new Error(
      `Coordination-loop report did not pass. Blockers: ${reportBlockers(report)}`,
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
  const coordinatorStatusMessageIds = stringArray(report.coordinatorStatusMessageIds);
  if (coordinatorStatusMessageIds.length === 0) {
    throw new Error("Fresh coordinator status message evidence is missing");
  }
  const reportContacts = Array.isArray(report.contacts) ? report.contacts : [];
  if (reportContacts.length === 0) {
    throw new Error("Coordination-loop report did not include contacts");
  }

  const contactsToVerify = expectedContactNames.length > 0
    ? expectedContactNames.map((name) => {
        const contact = reportContacts.find(
          (item) => isRecord(item) && contactMatchesExpected(item, name),
        );
        if (!isRecord(contact)) {
          throw new Error(`Controlled contact report missing: ${name}`);
        }
        return contact;
      })
    : reportContacts.filter(isRecord);

  for (const contact of contactsToVerify) {
    const label = typeof contact.name === "string" ? contact.name : "unknown contact";
    if (contact.passed !== true) {
      throw new Error(`Controlled contact did not pass: ${label}`);
    }
    if (typeof contact.latestSentOutreachAttemptId !== "string") {
      throw new Error(`Sent outreach evidence missing for ${label}`);
    }
    if (typeof contact.outboundMessageId !== "string") {
      throw new Error(`Outbound message evidence missing for ${label}`);
    }
    if (typeof contact.inboundReplyMessageId !== "string") {
      throw new Error(`Inbound reply evidence missing for ${label}`);
    }
    if (contact.followUpClockClearedOrDeferred !== true) {
      throw new Error(`Follow-up clock is not cleared or deferred for ${label}`);
    }
    if (!isRecord(contact.audit)) {
      throw new Error(`Audit summary missing for ${label}`);
    }
    const audit = contact.audit;
    const auditFields = [
      "outreachRequested",
      "outreachApproved",
      "outreachSent",
      "liveReplyReceived",
      "statusSentToCoordinator",
    ];
    const missingAuditFields = auditFields.filter(
      (field) => audit[field] !== true,
    );
    if (missingAuditFields.length > 0) {
      throw new Error(
        `Audit evidence missing for ${label}: ${missingAuditFields.join(", ")}`,
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
    "admin:getCoordinationLoopReport",
    {
      coordinatorPhone: config.coordinatorPhone,
      controlledContactNames: config.controlledContactNames,
      coordinationEventTitle: config.coordinationEventTitle,
    },
    config,
  );
  const result = runner("npx", args);
  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (output.includes("deployment is paused")) {
      throw new Error(
        "Convex deployment is paused. Resume it in the Convex dashboard before verifying coordination activation.",
      );
    }
    throw new Error(`Convex command failed: npx ${args.join(" ")}\n${output}`);
  }
  return extractJsonObject(result.stdout);
}

export function verifyCoordinationLiveActivation(
  config: LiveVerificationConfig,
  runner: CommandRunner = defaultRunner,
): void {
  console.log("Verifying coordination live activation report...");
  const report = runReport(config, runner);
  assertLiveCoordinationReport(report, config.controlledContactNames);
  const contacts = config.controlledContactNames.length > 0
    ? config.controlledContactNames.join(", ")
    : "report-selected contacts";
  console.log("Coordination live activation verified.");
  console.log(`Contacts verified: ${contacts}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    verifyCoordinationLiveActivation(
      parseLiveVerificationConfig(process.argv.slice(2)),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
}
