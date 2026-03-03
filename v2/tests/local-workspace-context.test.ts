import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalWorkspaceContext } from "../src/context/localWorkspace.js";

const tempDirs: string[] = [];

function writeFixtureFile(root: string, relativePath: string, content: string): void {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function createWorkspaceFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "caresupport-v2-workspace-"));
  tempDirs.push(root);

  writeFixtureFile(
    root,
    "families/kano/routing.json",
    JSON.stringify(
      {
        family_id: "kano",
        members: {
          "+15551112222": {
            name: "Liban Kano",
            role: "primary_caregiver",
            access_level: "schedule+meds",
            active: true,
            chat_id: "chat-known",
          },
        },
      },
      null,
      2,
    ),
  );

  writeFixtureFile(
    root,
    "families/kano/family.md",
    `---
family_id: "kano"
care_recipient: "Degitu Tefera"
---

# Current
- Name: Degitu Tefera
`,
  );

  writeFixtureFile(root, "families/kano/members/libankano.md", "Liban profile notes");
  writeFixtureFile(
    root,
    "conversations/+15551112222/2026-03.log",
    `[2026-03-02T10:00:00Z] [INBOUND] Did she take meds?
[2026-03-02T10:00:04Z] [OUTBOUND] Yes, meds taken this morning.
`,
  );

  return root;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("LocalWorkspaceContext", () => {
  it("resolves actor by phone and maps non-full access to limited", () => {
    const workspaceRoot = createWorkspaceFixture();
    const context = new LocalWorkspaceContext(workspaceRoot);
    const actor = context.resolveActor("+1 (555) 111-2222");

    expect(actor).not.toBeNull();
    expect(actor?.familyId).toBe("kano");
    expect(actor?.memberName).toBe("Liban Kano");
    expect(actor?.accessLevel).toBe("limited");
  });

  it("builds family context with member notes and recent conversation", () => {
    const workspaceRoot = createWorkspaceFixture();
    const context = new LocalWorkspaceContext(workspaceRoot);
    const actor = context.resolveActor("+15551112222", "chat-known");
    expect(actor).not.toBeNull();

    const familyContext = context.loadFamilyContext(actor!);
    expect(familyContext).not.toBeNull();
    expect(familyContext?.careRecipient).toBe("Degitu Tefera");
    expect(familyContext?.markdown).toContain("# Current");
    expect(familyContext?.memberMarkdown).toContain("Liban profile notes");
    expect(familyContext?.recentConversation).toContain("[INBOUND] Did she take meds?");
    expect(familyContext?.recentConversation).toContain("[OUTBOUND] Yes, meds taken this morning.");
  });
});
