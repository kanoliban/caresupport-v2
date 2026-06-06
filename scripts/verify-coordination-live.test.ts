import { describe, expect, it } from "vitest";
import {
  assertLiveCoordinationReport,
  parseLiveVerificationConfig,
  verifyCoordinationLiveActivation,
} from "./verify-coordination-live";

function passingContact(name: string) {
  return {
    key: name,
    name,
    passed: true,
    latestSentOutreachAttemptId: `attempt-${name}`,
    outboundMessageId: `outbound-${name}`,
    inboundReplyMessageId: `inbound-${name}`,
    followUpClockClearedOrDeferred: true,
    audit: {
      outreachRequested: true,
      outreachApproved: true,
      outreachSent: true,
      liveReplyReceived: true,
      statusSentToCoordinator: true,
    },
  };
}

describe("verify coordination live activation", () => {
  it("parses live verification config from environment and options", () => {
    expect(parseLiveVerificationConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      CONTROLLED_CONTACT_NAMES: "Angela,Maya",
      COORDINATION_EVENT_TITLE: "Wednesday coverage check",
      CONVEX_DEPLOYMENT_NAME: "dev:care-test",
    })).toEqual({
      coordinatorPhone: "+16515559000",
      controlledContactNames: ["Angela", "Maya"],
      coordinationEventTitle: "Wednesday coverage check",
      deploymentName: "dev:care-test",
      envFile: undefined,
      prod: undefined,
    });

    expect(parseLiveVerificationConfig([
      "--coordinator-phone",
      "+16515559001",
      "--contact-names",
      "Angela",
      "--env-file",
      ".env.local",
    ])).toEqual({
      coordinatorPhone: "+16515559001",
      controlledContactNames: ["Angela"],
      coordinationEventTitle: undefined,
      deploymentName: undefined,
      envFile: ".env.local",
      prod: undefined,
    });
  });

  it("rejects missing, old Rob-only, or invalid coordinator inputs", () => {
    expect(() => parseLiveVerificationConfig([], {})).toThrow("COORDINATOR_PHONE");
    expect(() =>
      parseLiveVerificationConfig([], {
        ROB_PHONE: "+16515559000",
      }),
    ).toThrow("COORDINATOR_PHONE");
    expect(() =>
      parseLiveVerificationConfig([], { COORDINATOR_PHONE: "6515559000" })
    ).toThrow("E.164");
  });

  it("targets production explicitly and rejects ambiguous deployment options", () => {
    expect(parseLiveVerificationConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      CONVEX_PROD: "1",
    })).toEqual({
      coordinatorPhone: "+16515559000",
      controlledContactNames: [],
      coordinationEventTitle: undefined,
      deploymentName: undefined,
      envFile: undefined,
      prod: true,
    });

    expect(() =>
      parseLiveVerificationConfig([
        "--coordinator-phone",
        "+16515559000",
        "--prod",
        "--deployment-name",
        "dev:care-test",
      ]),
    ).toThrow("Use either --prod");
  });

  it("accepts a report with live reply and fresh coordinator status evidence", () => {
    expect(() =>
      assertLiveCoordinationReport({
        passed: true,
        blockers: [],
        warnings: [],
        coordinatorStatusMessageIds: ["coordinator-status-1"],
        contacts: [passingContact("Angela"), passingContact("Maya")],
      }, ["Angela", "Maya"]),
    ).not.toThrow();
  });

  it("rejects a dry-run-only report with missing live reply audits", () => {
    expect(() =>
      assertLiveCoordinationReport({
        passed: true,
        blockers: [],
        warnings: ["live_reply_audit_missing:Angela"],
        coordinatorStatusMessageIds: ["dry-run-status"],
        contacts: [
          {
            ...passingContact("Angela"),
            audit: {
              ...passingContact("Angela").audit,
              liveReplyReceived: false,
            },
          },
          passingContact("Maya"),
        ],
      }, ["Angela", "Maya"]),
    ).toThrow("Live reply audits are missing");
  });

  it("rejects a report without fresh coordinator status evidence", () => {
    expect(() =>
      assertLiveCoordinationReport({
        passed: true,
        blockers: [],
        warnings: [],
        coordinatorStatusMessageIds: [],
        contacts: [passingContact("Angela"), passingContact("Maya")],
      }, ["Angela", "Maya"]),
    ).toThrow("Fresh coordinator status message evidence is missing");
  });

  it("rejects missing contact evidence even when aggregate report passed", () => {
    expect(() =>
      assertLiveCoordinationReport({
        passed: true,
        blockers: [],
        warnings: [],
        coordinatorStatusMessageIds: ["coordinator-status-1"],
        contacts: [
          {
            ...passingContact("Angela"),
            inboundReplyMessageId: undefined,
          },
          passingContact("Maya"),
        ],
      }, ["Angela", "Maya"]),
    ).toThrow("Inbound reply evidence missing for Angela");
  });

  it("stops immediately when the deployment is paused", () => {
    const config = parseLiveVerificationConfig([], {
      COORDINATOR_PHONE: "+16515559000",
    });
    expect(() =>
      verifyCoordinationLiveActivation(config, () => ({
        status: 1,
        stdout: "",
        stderr: "Cannot run functions while this deployment is paused.",
      })),
    ).toThrow("Convex deployment is paused");
  });

  it("runs the expected generic report command", () => {
    const config = parseLiveVerificationConfig([], {
      COORDINATOR_PHONE: "+16515559000",
      CONTROLLED_CONTACT_NAMES: "Angela,Maya",
    });
    const calls: string[] = [];

    verifyCoordinationLiveActivation(config, (command, args) => {
      calls.push([command, ...args].join(" "));
      return {
        status: 0,
        stdout: JSON.stringify({
          passed: true,
          blockers: [],
          warnings: [],
          coordinatorStatusMessageIds: ["coordinator-status-1"],
          contacts: [passingContact("Angela"), passingContact("Maya")],
        }),
        stderr: "",
      };
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("admin:getCoordinationLoopReport");
    expect(calls[0]).toContain("controlledContactNames");
  });
});
