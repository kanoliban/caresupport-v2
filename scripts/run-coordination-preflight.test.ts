import { describe, expect, it } from "vitest";
import {
  assertReadiness,
  buildReadinessPayload,
  convexRunArgs,
  extractJsonObject,
  isE164Phone,
  parsePreflightConfig,
  runCoordinationPreflight,
} from "./run-coordination-preflight";

describe("run coordination preflight script helpers", () => {
  it("parses coordinator-centered inputs from environment", () => {
    const config = parsePreflightConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      COORDINATOR_CHAT_ID: "chat-coordinator",
      CONTROLLED_CONTACT_NAMES: "Angela, Maya",
      COORDINATION_EVENT_TITLE: "Wednesday coverage check",
    });

    expect(config).toEqual({
      coordinatorPhone: "+16515559000",
      coordinatorChatId: "chat-coordinator",
      controlledContactNames: ["Angela", "Maya"],
      coordinationEventTitle: "Wednesday coverage check",
      deploymentName: undefined,
      envFile: undefined,
      prod: undefined,
    });
  });

  it("rejects missing, old Rob-only, or non-E.164 coordinator inputs", () => {
    expect(() => parsePreflightConfig([], {})).toThrow("COORDINATOR_PHONE");
    expect(() =>
      parsePreflightConfig([], {
        ROB_PHONE: "+16515559000",
        ROB_CHAT_ID: "chat-rob",
      }),
    ).toThrow("COORDINATOR_PHONE");
    expect(() =>
      parsePreflightConfig([], {
        COORDINATOR_PHONE: "6515559000",
      }),
    ).toThrow("Coordinator phone must be E.164");
    expect(isE164Phone("+16515559901")).toBe(true);
    expect(isE164Phone("16515559901")).toBe(false);
  });

  it("builds readiness payload without seed or fixture data", () => {
    const config = parsePreflightConfig([
      "--coordinator-phone",
      "+16515559000",
      "--coordinator-chat-id",
      "chat-coordinator",
      "--contact-names",
      "Angela,Maya",
      "--event-title",
      "Wednesday coverage check",
      "--deployment-name",
      "dev:care-test",
    ]);

    expect(buildReadinessPayload(config)).toEqual({
      coordinatorPhone: "+16515559000",
      coordinatorChatId: "chat-coordinator",
      controlledContactNames: ["Angela", "Maya"],
      coordinationEventTitle: "Wednesday coverage check",
    });
    expect(convexRunArgs("admin:getCoordinationReadiness", {
      coordinatorPhone: "+16515559000",
    }, config)).toEqual([
      "convex",
      "run",
      "admin:getCoordinationReadiness",
      "{\"coordinatorPhone\":\"+16515559000\"}",
      "--deployment-name",
      "dev:care-test",
    ]);
  });

  it("targets production explicitly and rejects ambiguous deployment options", () => {
    const config = parsePreflightConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      CONVEX_PROD: "true",
    });

    expect(config.prod).toBe(true);
    expect(convexRunArgs("admin:tableCounts", undefined, config)).toEqual([
      "convex",
      "run",
      "admin:tableCounts",
      "--prod",
    ]);
    expect(() =>
      parsePreflightConfig([
        "--coordinator-phone",
        "+16515559000",
        "--prod",
        "--deployment-name",
        "dev:care-test",
      ]),
    ).toThrow("Use either --prod");
  });

  it("extracts Convex JSON from plain or noisy stdout", () => {
    expect(extractJsonObject('{"passed":true}')).toEqual({ passed: true });
    expect(extractJsonObject('logs\n{\n  "readyForControlledOutreach": true\n}\n'))
      .toEqual({ readyForControlledOutreach: true });
  });

  it("asserts readiness explicitly", () => {
    expect(() =>
      assertReadiness({
        readyForControlledOutreach: false,
        blockers: ["coordinator_user_missing"],
      }),
    ).toThrow("coordinator_user_missing");
    expect(() => assertReadiness({ readyForControlledOutreach: true })).not.toThrow();
  });

  it("stops immediately when the deployment is paused", () => {
    const config = parsePreflightConfig([], {
      COORDINATOR_PHONE: "+16515559000",
    });
    const calls: string[] = [];

    expect(() =>
      runCoordinationPreflight(config, (command, args) => {
        calls.push([command, ...args].join(" "));
        return {
          status: 1,
          stdout: "",
          stderr: "Cannot run functions while this deployment is paused.",
        };
      }),
    ).toThrow("Convex deployment is paused");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("admin:tableCounts");
  });

  it("runs only read-only preflight commands and never seeds", () => {
    const config = parsePreflightConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      CONTROLLED_CONTACT_NAMES: "Angela,Maya",
    });
    const functions: string[] = [];

    runCoordinationPreflight(config, (_command, args) => {
      functions.push(args[2]);
      if (args[2] === "admin:getCoordinationReadiness") {
        return {
          status: 0,
          stdout: JSON.stringify({ readyForControlledOutreach: true, blockers: [] }),
          stderr: "",
        };
      }
      return {
        status: 0,
        stdout: JSON.stringify({ ok: true }),
        stderr: "",
      };
    });

    expect(functions).toEqual([
      "admin:tableCounts",
      "admin:getCoordinationReadiness",
    ]);
    expect(functions.some((name) => name.toLowerCase().includes("seed"))).toBe(false);
  });
});
