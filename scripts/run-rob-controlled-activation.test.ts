import { describe, expect, it } from "vitest";
import {
  assertDryRun,
  assertReadiness,
  assertReportPassed,
  assertReset,
  buildSeedPayload,
  convexRunArgs,
  extractJsonObject,
  isE164Phone,
  parseActivationConfig,
  runControlledActivationPreflight,
} from "./run-rob-controlled-activation";

describe("run Rob controlled activation script helpers", () => {
  it("parses required activation inputs from environment", () => {
    const config = parseActivationConfig([], {
      ROB_PHONE: "+16515559000",
      ROB_CHAT_ID: "chat-rob",
      JIM_TEST_PHONE: "+16515559901",
      JENNIFER_TEST_PHONE: "+16515559902",
      JIM_TEST_LINQ_CHAT_ID: "chat-jim",
      JENNIFER_TEST_LINQ_CHAT_ID: "chat-jennifer",
    });

    expect(config).toEqual({
      robPhone: "+16515559000",
      robChatId: "chat-rob",
      contactOverrides: [
        { key: "jim", phone: "+16515559901", linqChatId: "chat-jim" },
        {
          key: "jennifer",
          phone: "+16515559902",
          linqChatId: "chat-jennifer",
        },
      ],
      deploymentName: undefined,
      envFile: undefined,
    });
  });

  it("rejects missing or non-E.164 phone inputs before touching Convex", () => {
    expect(() => parseActivationConfig([], {})).toThrow(
      "Missing required activation inputs",
    );
    expect(() =>
      parseActivationConfig([], {
        ROB_PHONE: "6515559000",
        ROB_CHAT_ID: "chat-rob",
        JIM_TEST_PHONE: "+16515559901",
        JENNIFER_TEST_PHONE: "+16515559902",
      }),
    ).toThrow("Rob phone must be E.164");
    expect(isE164Phone("+16515559901")).toBe(true);
    expect(isE164Phone("16515559901")).toBe(false);
  });

  it("builds the exact fixture payload with approved test contacts", () => {
    const config = parseActivationConfig([
      "--rob-phone",
      "+16515559000",
      "--rob-chat-id",
      "chat-rob",
      "--jim-phone",
      "+16515559901",
      "--jennifer-phone",
      "+16515559902",
      "--deployment-name",
      "dev:care-test",
    ]);

    expect(buildSeedPayload(config)).toEqual({
      robPhone: "+16515559000",
      robChatId: "chat-rob",
      useTestContactPhones: false,
      contactOverrides: [
        { key: "jim", phone: "+16515559901", linqChatId: undefined },
        { key: "jennifer", phone: "+16515559902", linqChatId: undefined },
      ],
    });
    expect(convexRunArgs("admin:getRobMultiplayerReadiness", {
      robPhone: "+16515559000",
    }, config)).toEqual([
      "convex",
      "run",
      "admin:getRobMultiplayerReadiness",
      "{\"robPhone\":\"+16515559000\"}",
      "--deployment-name",
      "dev:care-test",
    ]);
  });

  it("extracts Convex JSON from plain or noisy stdout", () => {
    expect(extractJsonObject('{"passed":true}')).toEqual({ passed: true });
    expect(extractJsonObject('logs\n{\n  "readyForControlledOutreach": true\n}\n'))
      .toEqual({ readyForControlledOutreach: true });
  });

  it("asserts activation gate outputs explicitly", () => {
    expect(() =>
      assertReadiness({
        readyForControlledOutreach: false,
        blockers: ["rob_chat_id_missing"],
      }),
    ).toThrow("rob_chat_id_missing");
    expect(() => assertReadiness({ readyForControlledOutreach: true })).not.toThrow();
    expect(() => assertDryRun({
      ran: true,
      simulated: [{ replyStatus: "confirmed" }],
    })).not.toThrow();
    expect(() => assertReportPassed({ passed: true })).not.toThrow();
    expect(() => assertReset({ reset: true })).not.toThrow();
  });

  it("stops immediately when the deployment is paused", () => {
    const config = parseActivationConfig([], {
      ROB_PHONE: "+16515559000",
      ROB_CHAT_ID: "chat-rob",
      JIM_TEST_PHONE: "+16515559901",
      JENNIFER_TEST_PHONE: "+16515559902",
    });
    const calls: string[] = [];

    expect(() =>
      runControlledActivationPreflight(config, (command, args) => {
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

  it("runs the safe preflight sequence without live messaging commands", () => {
    const config = parseActivationConfig([], {
      ROB_PHONE: "+16515559000",
      ROB_CHAT_ID: "chat-rob",
      JIM_TEST_PHONE: "+16515559901",
      JENNIFER_TEST_PHONE: "+16515559902",
    });
    const functions: string[] = [];

    runControlledActivationPreflight(config, (_command, args) => {
      functions.push(args[2]);
      if (args[2] === "admin:getRobMultiplayerReadiness") {
        return {
          status: 0,
          stdout: JSON.stringify({ readyForControlledOutreach: true, blockers: [] }),
          stderr: "",
        };
      }
      if (args[2] === "admin:runRobControlledLoopDryRun") {
        return {
          status: 0,
          stdout: JSON.stringify({
            ran: true,
            simulated: [
              { replyStatus: "confirmed" },
              { replyStatus: "confirmed" },
            ],
          }),
          stderr: "",
        };
      }
      if (args[2] === "admin:getRobControlledLoopReport") {
        return {
          status: 0,
          stdout: JSON.stringify({ passed: true, blockers: [] }),
          stderr: "",
        };
      }
      if (args[2] === "admin:resetRobControlledLoopAfterDryRun") {
        return {
          status: 0,
          stdout: JSON.stringify({ reset: true }),
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
      "admin:seedRobMultiplayerFixture",
      "admin:getRobMultiplayerReadiness",
      "admin:runRobControlledLoopDryRun",
      "admin:getRobControlledLoopReport",
      "admin:resetRobControlledLoopAfterDryRun",
      "admin:getRobMultiplayerReadiness",
    ]);
    expect(functions).not.toContain("outreachExecution:executeApproved");
  });
});
