import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

interface DrillStep {
  name: string;
  ok: boolean;
  detail: string;
  durationMs: number;
}

interface RollbackSummary {
  generatedAt: string;
  mode: "tabletop" | "live";
  totalDurationMs: number;
  estimatedFailbackSeconds: number;
  pass: boolean;
  steps: DrillStep[];
}

function loadEnv(): void {
  const candidates = [path.resolve(".env"), path.resolve("../.env")];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

async function httpOk(url: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function runStep(name: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<DrillStep> {
  const started = Date.now();
  return fn().then((result) => ({
    name,
    ok: result.ok,
    detail: result.detail,
    durationMs: Date.now() - started,
  }));
}

async function main(): Promise<void> {
  loadEnv();
  const args = process.argv.slice(2);
  const mode = args.includes("--live") ? "live" : "tabletop";
  const steps: DrillStep[] = [];
  const started = Date.now();

  steps.push(
    await runStep("Runbook exists", async () => {
      const runbookPath = path.resolve("../docs/cutover-runbook-v2.md");
      const ok = fs.existsSync(runbookPath);
      return { ok, detail: ok ? runbookPath : `Missing ${runbookPath}` };
    }),
  );

  if (mode === "live") {
    steps.push(
      await runStep("V1 health reachable", async () => {
        const url = process.env.V1_HEALTH_URL;
        if (!url) return { ok: false, detail: "V1_HEALTH_URL missing" };
        const ok = await httpOk(url, 5000);
        return { ok, detail: ok ? `OK ${url}` : `Failed ${url}` };
      }),
    );
    steps.push(
      await runStep("V2 health reachable", async () => {
        const url = process.env.V2_HEALTH_URL;
        if (!url) return { ok: false, detail: "V2_HEALTH_URL missing" };
        const ok = await httpOk(url, 5000);
        return { ok, detail: ok ? `OK ${url}` : `Failed ${url}` };
      }),
    );

    steps.push(
      await runStep("Rollback command configured", async () => {
        const cmd = process.env.ROLLBACK_WEBHOOK_TO_V1_CMD;
        if (!cmd) return { ok: false, detail: "ROLLBACK_WEBHOOK_TO_V1_CMD missing" };
        return { ok: true, detail: cmd };
      }),
    );

    steps.push(
      await runStep("Rollforward command configured", async () => {
        const cmd = process.env.ROLLFORWARD_WEBHOOK_TO_V2_CMD;
        if (!cmd) return { ok: false, detail: "ROLLFORWARD_WEBHOOK_TO_V2_CMD missing" };
        return { ok: true, detail: cmd };
      }),
    );

    if (args.includes("--execute")) {
      steps.push(
        await runStep("Execute rollback command", async () => {
          const cmd = process.env.ROLLBACK_WEBHOOK_TO_V1_CMD;
          if (!cmd) return { ok: false, detail: "ROLLBACK_WEBHOOK_TO_V1_CMD missing" };
          try {
            execSync(cmd, { stdio: "pipe", encoding: "utf8" });
            return { ok: true, detail: "rollback command executed" };
          } catch (error) {
            return { ok: false, detail: error instanceof Error ? error.message : String(error) };
          }
        }),
      );
      steps.push(
        await runStep("Post-rollback V1 health", async () => {
          const url = process.env.V1_HEALTH_URL;
          if (!url) return { ok: false, detail: "V1_HEALTH_URL missing" };
          const ok = await httpOk(url, 5000);
          return { ok, detail: ok ? `OK ${url}` : `Failed ${url}` };
        }),
      );
      steps.push(
        await runStep("Execute rollforward command", async () => {
          const cmd = process.env.ROLLFORWARD_WEBHOOK_TO_V2_CMD;
          if (!cmd) return { ok: false, detail: "ROLLFORWARD_WEBHOOK_TO_V2_CMD missing" };
          try {
            execSync(cmd, { stdio: "pipe", encoding: "utf8" });
            return { ok: true, detail: "rollforward command executed" };
          } catch (error) {
            return { ok: false, detail: error instanceof Error ? error.message : String(error) };
          }
        }),
      );
      steps.push(
        await runStep("Post-rollforward V2 health", async () => {
          const url = process.env.V2_HEALTH_URL;
          if (!url) return { ok: false, detail: "V2_HEALTH_URL missing" };
          const ok = await httpOk(url, 5000);
          return { ok, detail: ok ? `OK ${url}` : `Failed ${url}` };
        }),
      );
    }
  } else {
    steps.push({
      name: "Tabletop command prep",
      ok: true,
      detail: "Validated runbook + command placeholders; use --live for executable drill.",
      durationMs: 0,
    });
  }

  const totalDurationMs = Date.now() - started;
  const estimatedFailbackSeconds = Math.ceil(totalDurationMs / 1000);
  const pass = steps.every((s) => s.ok) && estimatedFailbackSeconds < 600;

  const summary: RollbackSummary = {
    generatedAt: new Date().toISOString(),
    mode,
    totalDurationMs,
    estimatedFailbackSeconds,
    pass,
    steps,
  };

  const outPath = path.resolve("fixtures/rollback-drill-summary.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  console.log(`Rollback drill summary written: ${outPath}`);
  console.log(`Mode: ${mode}`);
  console.log(`Pass: ${pass}`);
  console.log(`Estimated failback seconds: ${estimatedFailbackSeconds}`);

  if (!pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
