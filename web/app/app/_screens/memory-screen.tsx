"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "../_components/brand/avatar";
import {
  BackIcon,
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  HeartIcon,
  IdCardIcon,
  PillIcon,
  PlusIcon,
  QuestionIcon,
  SearchIcon,
} from "../_components/icons";
import {
  useCurrentCareCase,
  useMemoryHub,
  type MemoryHubCategory,
} from "../_lib/data-hooks";

// ──────────────────────────────────────────────────────────────
// People — hardcoded for slice 1A. Slice 2 swaps to real
// careContacts + per-person memoryEntries queries.
// ──────────────────────────────────────────────────────────────

type Person = {
  id: string;
  initials: string;
  name: string;
  color: string;
  role: string;
  facts: string[];
};

const PEOPLE: readonly Person[] = [
  {
    id: "maria",
    initials: "MK",
    name: "Maria Kim",
    color: "#2BAE66",
    role: "Caregiver · weekday mornings",
    facts: [
      "Maria covers Degitu's morning shift, 7–11 AM Monday–Friday.",
      "Independent contractor — not through an agency.",
      "Speaks Amharic; Degitu is most comfortable around her.",
      "Texted last on Tuesday at 7:08 AM to confirm coffee.",
      "Has been with the family for 14 months.",
    ],
  },
  {
    id: "angela",
    initials: "AB",
    name: "Angela Brown",
    color: "#F45A50",
    role: "Caregiver · evenings (Mon/Wed/Fri)",
    facts: [
      "Angela covers evenings Mon/Wed/Fri, 6–10 PM.",
      "Through Roseville HomeCare agency.",
      "Cancelled tonight at 4:12 PM — first cancellation in 3 months.",
      "You said you'd give her another chance — she's normally reliable.",
    ],
  },
  {
    id: "marcus",
    initials: "MH",
    name: "Marcus Hayes",
    color: "#B829D8",
    role: "Friend · 1st evening fallback",
    facts: [
      "Can cover evenings if Angela can't, especially after 7 PM.",
      "Lives 10 minutes from Degitu.",
      "Has text consent. Prefers SMS over calls.",
      "Knows Degitu's medication routine — helped with it once in February.",
    ],
  },
  {
    id: "janet",
    initials: "JI",
    name: "Janet Iwu",
    color: "#4A6DAC",
    role: "Neighbor · weekend backup",
    facts: [
      "Lives next door to Degitu.",
      "Weekend backup — has covered twice in March.",
      "Doesn't have text consent yet. Best to call.",
    ],
  },
  {
    id: "park",
    initials: "DP",
    name: "Dr. Park",
    color: "#B86530",
    role: "Cardiology",
    facts: [
      "Cardiology check-ins recur every 8 weeks.",
      "Next visit Thursday at 10:00 AM.",
      "Adjusted Eliquis dose in January.",
      "Phone: 503-555-0118.",
    ],
  },
  {
    id: "lillian",
    initials: "LB",
    name: "Aunt Lillian",
    color: "#7A5AE0",
    role: "Family · long-notice only",
    facts: [
      "Lives in Salem, OR — about 1 hour away.",
      "Family backup — best for long-notice coverage.",
      "Prefers phone calls, not texts.",
    ],
  },
];

// ──────────────────────────────────────────────────────────────
// Icon helpers
// ──────────────────────────────────────────────────────────────

type IconKind = MemoryHubCategory["iconKind"];

function CategoryGlyph({
  kind,
  color,
  size = 20,
}: {
  kind: IconKind;
  color: string;
  size?: number;
}) {
  switch (kind) {
    case "clock":
      return <ClockIcon color={color} size={size} />;
    case "pill":
      return <PillIcon color={color} size={size} />;
    case "heart":
      return <HeartIcon color={color} size={size} />;
    case "idcard":
      return <IdCardIcon color={color} size={size} />;
    case "question":
      return <QuestionIcon color={color} size={size} />;
  }
}

// ──────────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────────

type CircleBtnProps = {
  children: ReactNode;
  onClick?: () => void;
  accent?: string;
  ariaLabel: string;
};

function CircleBtn({ children, onClick, accent, ariaLabel }: CircleBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        background: "var(--cs-card)",
        color: accent ?? "var(--cs-text)",
        border: 0,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "var(--cs-chip-shadow)",
        lineHeight: 0,
      }}
    >
      {children}
    </button>
  );
}

type TopBarProps = {
  onLeftTap?: () => void;
  leftKind: "back" | "close";
  rightKind?: "search" | "add";
  onRightTap?: () => void;
};

function MemoryTopBar({
  onLeftTap,
  leftKind,
  rightKind,
  onRightTap,
}: TopBarProps) {
  return (
    <div
      style={{
        padding: "4px 22px 8px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <CircleBtn
        onClick={onLeftTap}
        ariaLabel={leftKind === "back" ? "Back" : "Close"}
      >
        {leftKind === "back" ? (
          <BackIcon color="var(--cs-text)" />
        ) : (
          <CloseIcon color="var(--cs-text)" />
        )}
      </CircleBtn>
      {rightKind && (
        <CircleBtn
          onClick={onRightTap}
          accent="var(--cs-primary)"
          ariaLabel={rightKind === "search" ? "Search" : "Add"}
        >
          {rightKind === "search" ? (
            <SearchIcon color="var(--cs-primary)" size={18} />
          ) : (
            <PlusIcon color="var(--cs-primary)" size={18} />
          )}
        </CircleBtn>
      )}
    </div>
  );
}

function SectionHead({
  children,
  action,
  onActionClick,
}: {
  children: ReactNode;
  action?: ReactNode;
  onActionClick?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "24px 22px 12px 22px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 20,
          color: "var(--cs-text)",
          letterSpacing: -0.5,
        }}
      >
        {children}
      </h2>
      {action && (
        <button
          type="button"
          onClick={onActionClick}
          style={{
            background: "none",
            border: 0,
            cursor: "pointer",
            padding: 0,
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 13,
            color: "var(--cs-text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {action}
          <ChevronRightIcon color="var(--cs-text-muted)" />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Hub
// ──────────────────────────────────────────────────────────────

function MemoryHubView({
  categories,
  recipientName,
  onPick,
}: {
  categories: MemoryHubCategory[];
  recipientName: string;
  onPick: (key: string) => void;
}) {
  const totalFacts = categories.reduce((sum, c) => sum + c.facts.length, 0);
  return (
    <div style={{ paddingBottom: 60 }}>
      <h1
        style={{
          margin: 0,
          padding: "6px 22px 8px 22px",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: -1,
          color: "var(--cs-text)",
        }}
      >
        What I Know
      </h1>
      <div
        style={{
          padding: "0 22px 18px 22px",
          fontSize: 14.5,
          color: "var(--cs-text-muted)",
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        About {recipientName}. Everything below was learned from your texts —
        tap any line to correct it.
      </div>

      {/* Care snapshot */}
      <div style={{ padding: "0 22px 18px 22px" }}>
        <div
          style={{
            background: "var(--cs-card)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "var(--cs-card-shadow)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <Avatar
            initials={recipientName.charAt(0)}
            size={52}
            bgColor="#C97A57"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "var(--cs-text)",
                letterSpacing: -0.4,
                lineHeight: 1.15,
              }}
            >
              {recipientName}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--cs-text-muted)",
                fontWeight: 600,
                marginTop: 1,
              }}
            >
              78 · Mom · {totalFacts} facts saved
            </div>
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(43,174,102,0.10)",
              color: "var(--cs-success)",
              fontWeight: 700,
              fontSize: 11.5,
              letterSpacing: 0.3,
            }}
          >
            SYNCED
          </div>
        </div>
      </div>

      <SectionHead>Categories</SectionHead>
      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {categories.map((cat) => (
          <HubRow
            key={cat.key}
            category={cat}
            onClick={() => onPick(cat.key)}
          />
        ))}
      </div>

      <SectionHead
        action={`${PEOPLE.length} people · See all`}
        onActionClick={() => onPick("people")}
      >
        Your People
      </SectionHead>
      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {PEOPLE.slice(0, 4).map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            onClick={() => onPick(`person:${p.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function HubRow({
  category,
  onClick,
}: {
  category: MemoryHubCategory;
  onClick: () => void;
}) {
  const count = category.facts.length;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--cs-card)",
        borderRadius: 18,
        border: 0,
        cursor: "pointer",
        boxShadow: "var(--cs-card-shadow)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: category.bg,
          color: category.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CategoryGlyph kind={category.iconKind} color={category.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 16.5,
            color: "var(--cs-text)",
            letterSpacing: -0.3,
            lineHeight: 1.2,
          }}
        >
          {category.label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--cs-text-muted)",
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {count} {count === 1 ? "fact" : "facts"} · {category.description}
        </div>
      </div>
      <span style={{ flexShrink: 0, opacity: 0.4 }}>
        <ChevronRightIcon color="var(--cs-text-muted)" />
      </span>
    </button>
  );
}

function PersonRow({
  person,
  onClick,
}: {
  person: Person;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "var(--cs-card)",
        borderRadius: 18,
        border: 0,
        cursor: "pointer",
        boxShadow: "var(--cs-card-shadow)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <Avatar initials={person.initials} size={40} bgColor={person.color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "inherit",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--cs-text)",
            letterSpacing: -0.3,
            lineHeight: 1.2,
          }}
        >
          {person.name}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--cs-text-muted)",
            fontWeight: 500,
            marginTop: 2,
          }}
        >
          {person.role}
        </div>
      </div>
      <span style={{ flexShrink: 0, opacity: 0.4 }}>
        <ChevronRightIcon color="var(--cs-text-muted)" />
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// Category detail
// ──────────────────────────────────────────────────────────────

function CategoryDetail({ category }: { category: MemoryHubCategory }) {
  const count = category.facts.length;
  return (
    <div style={{ paddingBottom: 60 }}>
      <h1
        style={{
          margin: 0,
          padding: "6px 22px 4px 22px",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -0.9,
          color: "var(--cs-text)",
          lineHeight: 1.1,
        }}
      >
        {category.label}
      </h1>
      <div
        style={{
          padding: "0 22px 18px 22px",
          fontSize: 13.5,
          color: "var(--cs-text-muted)",
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {count} {count === 1 ? "fact" : "facts"} · all from your texts · tap
        any to correct
      </div>
      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {category.facts.map((fact, i) => (
          <FactPill
            key={i}
            iconKind={category.iconKind}
            iconColor={category.color}
            fact={fact}
          />
        ))}
      </div>
    </div>
  );
}

function FactPill({
  iconKind,
  iconColor,
  fact,
}: {
  iconKind: IconKind;
  iconColor: string;
  fact: string;
}) {
  return (
    <button
      type="button"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "16px 18px",
        background: "var(--cs-card)",
        borderRadius: 18,
        border: 0,
        cursor: "pointer",
        boxShadow: "var(--cs-card-shadow)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <div style={{ paddingTop: 1, flexShrink: 0 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            background: iconColor,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CategoryGlyph kind={iconKind} color="#fff" size={14} />
        </div>
      </div>
      <span
        style={{
          flex: 1,
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 15.5,
          color: "var(--cs-text)",
          letterSpacing: -0.25,
          lineHeight: 1.4,
        }}
      >
        {fact}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────────────
// People list + person detail
// ──────────────────────────────────────────────────────────────

function PeopleList({ onPick }: { onPick: (key: string) => void }) {
  return (
    <div style={{ paddingBottom: 60 }}>
      <h1
        style={{
          margin: 0,
          padding: "6px 22px 4px 22px",
          fontFamily: "inherit",
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: -0.9,
          color: "var(--cs-text)",
          lineHeight: 1.1,
        }}
      >
        Your People
      </h1>
      <div
        style={{
          padding: "0 22px 18px 22px",
          fontSize: 13.5,
          color: "var(--cs-text-muted)",
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {PEOPLE.length} people in the care circle.
      </div>
      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {PEOPLE.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            onClick={() => onPick(`person:${p.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function PersonDetail({ person }: { person: Person }) {
  const firstName = person.name.split(" ")[0];
  return (
    <div style={{ paddingBottom: 60 }}>
      <div
        style={{
          padding: "6px 22px 18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Avatar initials={person.initials} size={64} bgColor={person.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: -0.6,
              color: "var(--cs-text)",
              lineHeight: 1.1,
            }}
          >
            {person.name}
          </h1>
          <div
            style={{
              fontSize: 13.5,
              color: "var(--cs-text-muted)",
              fontWeight: 600,
              marginTop: 3,
            }}
          >
            {person.role}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "0 22px 12px 22px",
          fontSize: 11.5,
          fontWeight: 700,
          color: "var(--cs-text-subtle)",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        What I know about {firstName}
      </div>

      <div
        style={{
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {person.facts.map((fact, i) => (
          <FactPill
            key={i}
            iconKind="idcard"
            iconColor={person.color}
            fact={fact}
          />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Root with stack-based navigation
// ──────────────────────────────────────────────────────────────

type MemoryScreenProps = {
  /** True when rendered as a page in the swipe pager (no top-level close). */
  embedded?: boolean;
  onClose?: () => void;
};

export function MemoryScreen({
  embedded = false,
  onClose,
}: MemoryScreenProps) {
  const [stack, setStack] = useState<string[]>(["hub"]);
  const current = stack[stack.length - 1];
  const push = (v: string) => setStack((s) => [...s, v]);
  const back = () => setStack((s) => s.slice(0, -1));
  const onLeftTap = () => {
    if (stack.length > 1) back();
    else if (onClose) onClose();
  };

  const categories = useMemoryHub();
  const careCase = useCurrentCareCase();
  const recipientName = careCase?.careRecipientName ?? "Mom";

  const showLeftButton = !embedded || stack.length > 1;

  let content: ReactNode;
  let rightKind: "search" | "add" | undefined;
  if (current === "hub") {
    content = (
      <MemoryHubView
        categories={categories}
        recipientName={recipientName}
        onPick={push}
      />
    );
    rightKind = "search";
  } else if (current === "people") {
    content = <PeopleList onPick={push} />;
    rightKind = "search";
  } else if (current.startsWith("person:")) {
    const person = PEOPLE.find((p) => p.id === current.slice(7));
    if (!person) {
      content = null;
    } else {
      content = <PersonDetail person={person} />;
      rightKind = "add";
    }
  } else {
    const cat = categories.find((c) => c.key === current);
    if (!cat) {
      content = null;
    } else {
      content = <CategoryDetail category={cat} />;
      rightKind = "add";
    }
  }

  const containerStyle = embedded
    ? {
        width: "100%",
        height: "100%",
        background: "var(--cs-bg)",
        overflowY: "auto" as const,
        overflowX: "hidden" as const,
      }
    : {
        position: "absolute" as const,
        inset: 0,
        zIndex: 200,
        background: "var(--cs-bg)",
        paddingTop: 56,
        overflowY: "auto" as const,
        overflowX: "hidden" as const,
      };

  return (
    <div style={containerStyle}>
      {showLeftButton ? (
        <MemoryTopBar
          onLeftTap={onLeftTap}
          leftKind={stack.length > 1 ? "back" : "close"}
          rightKind={rightKind}
        />
      ) : (
        <div
          style={{
            padding: "4px 22px 8px 22px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {rightKind && (
            <CircleBtn
              accent="var(--cs-primary)"
              ariaLabel={rightKind === "search" ? "Search" : "Add"}
            >
              {rightKind === "search" ? (
                <SearchIcon color="var(--cs-primary)" size={18} />
              ) : (
                <PlusIcon color="var(--cs-primary)" size={18} />
              )}
            </CircleBtn>
          )}
        </div>
      )}
      {content}
    </div>
  );
}
