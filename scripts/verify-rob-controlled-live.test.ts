import { describe, expect, it } from "vitest";
import {
  assertLiveControlledReport,
  parseLiveVerificationConfig,
  verifyRobControlledLiveActivation,
} from "./verify-rob-controlled-live";

function passingContact(key: "jim" | "jennifer") {
  return {
    key,
    passed: true,
    latestSentOutreachAttemptId: `attempt-${key}`,
    outboundMessageId: `outbound-${key}`,
    inboundReplyMessageId: `inbound-${key}`,
    followUpClockClearedOrDeferred: true,
    audit: {
      outreachRequested: true,
      outreachApproved: true,
      outreachSent: true,
      liveReplyReceived: true,
      statusSentToRob: true,
    },
  };
}

describe("verify Rob controlled live activation", () => {
  it("parses live verification config from environment and options", () => {
    expect(parseLiveVerificationConfig([], {
      ROB_PHONE: "+16515559000",
      CONTROLLED_CONTACT_KEYS: "jim,jennifer",
      CONVEX_DEPLOYMENT_NAME: "dev:care-test",
    })).toEqual({
      robPhone: "+16515559000",
      controlledContactKeys: ["jim", "jennifer"],
      deploymentName: "dev:care-test",
      envFile: undefined,
      prod: undefined,
    });

    expect(parseLiveVerificationConfig([
      "--rob-phone",
      "+16515559001",
      "--contact-keys",
      "jim",
      "--env-file",
      ".env.local",
    ])).toEqual({
      robPhone: "+16515559001",
      controlledContactKeys: ["jim"],
      deploymentName: undefined,
      envFile: ".env.local",
      prod: undefined,
    });
  });

  it("targets production explicitly and rejects ambiguous deployment options", () => {
    expect(parseLiveVerificationConfig([], {
      ROB_PHONE: "+16515559000",
      CONVEX_PROD: "1",
    })).toEqual({
      robPhone: "+16515559000",
      controlledContactKeys: ["jim", "jennifer"],
      deploymentName: undefined,
      envFile: undefined,
      prod: true,
    });

    expect(() =>
      parseLiveVerificationConfig([
        "--rob-phone",
        "+16515559000",
        "--prod",
        "--deployment-name",
        "dev:care-test",
      ]),
    ).toThrow("Use either --prod");
  });

  it("rejects missing, invalid, or unsupported inputs", () => {
    expect(() => parseLiveVerificationConfig([], {})).toThrow("ROB_PHONE");
    expect(() => parseLiveVerificationConfig([], { ROB_PHONE: "6515559000" }))
      .toThrow("E.164");
    expect(() =>
      parseLiveVerificationConfig([], {
        ROB_PHONE: "+16515559000",
        CONTROLLED_CONTACT_KEYS: "jim,sarah",
      }),
    ).toThrow("Unsupported controlled contact key: sarah");
  });

  it("accepts a report with real live reply and fresh Rob status evidence", () => {
    expect(() =>
      assertLiveControlledReport({
        passed: true,
        blockers: [],
        warnings: [],
        robStatusMessageIds: ["rob-status-1"],
        contacts: [passingContact("jim"), passingContact("jennifer")],
      }),
    ).not.toThrow();
  });

  it("rejects a dry-run-only report with missing live reply audits", () => {
    expect(() =>
      assertLiveControlledReport({
        passed: true,
        blockers: [],
        warnings: ["live_reply_audit_missing:jim"],
        robStatusMessageIds: ["dry-run-status"],
        contacts: [
          {
            ...passingContact("jim"),
            audit: {
              ...passingContact("jim").audit,
              liveReplyReceived: false,
            },
          },
          passingContact("jennifer"),
        ],
      }),
    ).toThrow("Live reply audits are missing");
  });

  it("rejects a report without fresh Rob status evidence", () => {
    expect(() =>
      assertLiveControlledReport({
        passed: true,
        blockers: [],
        warnings: [],
        robStatusMessageIds: [],
        contacts: [passingContact("jim"), passingContact("jennifer")],
      }),
    ).toThrow("Fresh Rob status message evidence is missing");
  });

  it("rejects missing contact evidence even when aggregate report passed", () => {
    expect(() =>
      assertLiveControlledReport({
        passed: true,
        blockers: [],
        warnings: [],
        robStatusMessageIds: ["rob-status-1"],
        contacts: [
          {
            ...passingContact("jim"),
            inboundReplyMessageId: undefined,
          },
          passingContact("jennifer"),
        ],
      }),
    ).toThrow("Inbound reply evidence missing for jim");
  });

  it("stops immediately when the deployment is paused", () => {
    const config = parseLiveVerificationConfig([], {
      ROB_PHONE: "+16515559000",
    });
    expect(() =>
      verifyRobControlledLiveActivation(config, () => ({
        status: 1,
        stdout: "",
        stderr: "Cannot run functions while this deployment is paused.",
      })),
    ).toThrow("Convex deployment is paused");
  });

  it("runs the expected report command", () => {
    const config = parseLiveVerificationConfig([], {
      ROB_PHONE: "+16515559000",
    });
    const calls: string[] = [];

    verifyRobControlledLiveActivation(config, (command, args) => {
      calls.push([command, ...args].join(" "));
      return {
        status: 0,
        stdout: JSON.stringify({
          passed: true,
          blockers: [],
          warnings: [],
          robStatusMessageIds: ["rob-status-1"],
          contacts: [passingContact("jim"), passingContact("jennifer")],
        }),
        stderr: "",
      };
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("admin:getRobControlledLoopReport");
    expect(calls[0]).toContain("controlledContactKeys");
  });
});
