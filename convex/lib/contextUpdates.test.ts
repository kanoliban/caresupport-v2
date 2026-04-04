import { describe, expect, it } from "vitest";
import {
  applySectionUpdates,
  buildDefaultMemberContext,
} from "./contextUpdates";

describe("buildDefaultMemberContext", () => {
  it("seeds the identity section from the member row", () => {
    const context = buildDefaultMemberContext({
      name: "Liban Kano",
      phone: "+16517037981",
      role: "family_caregiver",
      relationship: "grandson",
      accessLevel: "full",
    });

    expect(context).toContain("# Liban Kano — Member Profile");
    expect(context).toContain("- Name: Liban Kano");
    expect(context).toContain("- Phone: +16517037981");
    expect(context).toContain("- Role: family_caregiver");
    expect(context).toContain("- Relationship to care recipient: grandson");
    expect(context).toContain("- Access level: full");
    expect(context).toContain("## Communication Preferences");
    expect(context).toContain("## Care Responsibilities");
    expect(context).toContain("## Personal Context");
    expect(context).toContain("## Interaction History");
  });
});

describe("applySectionUpdates", () => {
  const baseContext = [
    "# Liban Kano — Member Profile",
    "",
    "## Communication Preferences",
    "- Preferred channel: iMessage",
    "",
    "## Personal Context",
    "- Primary coordinator for Degitu's care.",
    "",
    "## Interaction History",
  ].join("\n");

  it("appends content within the targeted section", () => {
    const updated = applySectionUpdates(baseContext, [
      {
        section: "Personal Context",
        operation: "append",
        content: "- Prefers late-evening updates.",
      },
    ]);

    expect(updated).toContain("- Primary coordinator for Degitu's care.");
    expect(updated).toContain("- Prefers late-evening updates.");
    expect(updated.indexOf("- Prefers late-evening updates.")).toBeGreaterThan(
      updated.indexOf("## Personal Context"),
    );
  });

  it("prepends content within the targeted section", () => {
    const updated = applySectionUpdates(baseContext, [
      {
        section: "Interaction History",
        operation: "prepend",
        content: "- 2026-03-31: Mentioned preferring text over calls.",
      },
    ]);

    expect(updated).toContain("## Interaction History\n- 2026-03-31: Mentioned preferring text over calls.");
  });

  it("matches slug section keys against title-cased headers", () => {
    const updated = applySectionUpdates(baseContext, [
      {
        section: "personal_context",
        operation: "append",
        content: "- Prefers direct updates.",
      },
    ]);

    expect(updated).toContain("## Personal Context");
    expect(updated).toContain("- Prefers direct updates.");
  });

  it("replaces old content when provided", () => {
    const updated = applySectionUpdates(baseContext, [
      {
        section: "Communication Preferences",
        operation: "replace",
        content: "- Preferred channel: SMS",
        oldContent: "- Preferred channel: iMessage",
      },
    ]);

    expect(updated).toContain("- Preferred channel: SMS");
    expect(updated).not.toContain("- Preferred channel: iMessage");
  });

  it("removes matched text for resolve_issue operations", () => {
    const updated = applySectionUpdates(baseContext, [
      {
        section: "Personal Context",
        operation: "resolve_issue",
        content: "",
        oldContent: "- Primary coordinator for Degitu's care.",
      },
    ]);

    expect(updated).not.toContain("- Primary coordinator for Degitu's care.");
  });
});
