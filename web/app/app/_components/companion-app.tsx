"use client";

import { useState } from "react";
import { CreateHeader } from "./brand/create-header";
import { PageDots, VoiceFab } from "./primitives";
import { SwipePager } from "./swipe-pager";
import { HomeScreen, type CreateOptionKey } from "../_screens/home-screen";
import { MemoryScreen } from "../_screens/memory-screen";
import { ScheduleScreen } from "../_screens/schedule-screen";

const PAGE_COUNT = 2;
const PAGE_HOME = 0;
const PAGE_MEMORY = 1;

type Destination =
  | null
  | "schedule"
  | "meds"
  | "settings"
  | { kind: "coord"; taskKey: string }
  | { kind: "create"; taskKey: CreateOptionKey };

export function CompanionApp() {
  const [page, setPage] = useState<number>(PAGE_HOME);
  const [dest, setDest] = useState<Destination>(null);

  const openSchedule = () => setDest("schedule");
  const openMeds = () => setDest("meds");
  const openSettings = () => setDest("settings");
  const openCoord = (taskKey: string) =>
    setDest({ kind: "coord", taskKey });
  const openCreate = (taskKey: CreateOptionKey) =>
    setDest({ kind: "create", taskKey });
  const goToMemory = () => setPage(PAGE_MEMORY);
  const closeDest = () => setDest(null);

  const showCoordCoverageGap = () => openCoord("coverage-gap");

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "var(--cs-bg)",
      }}
    >
      <SwipePager page={page} onPageChange={setPage}>
        <div
          style={{
            width: "100%",
            height: "100%",
            overflowY: "auto",
            overflowX: "hidden",
            paddingTop: 56,
          }}
        >
          <HomeScreen
            onNavCoord={showCoordCoverageGap}
            onTapMemory={goToMemory}
            onOpenSchedule={openSchedule}
            onOpenMeds={openMeds}
            onPickCreate={openCreate}
            onOpenSettings={openSettings}
          />
        </div>
        <div
          style={{
            width: "100%",
            height: "100%",
            paddingTop: 56,
            boxSizing: "border-box",
          }}
        >
          <MemoryScreen embedded />
        </div>
      </SwipePager>

      <FooterFlourish page={page} onPageChange={setPage} />

      {/* Takeovers */}
      {dest === "schedule" && (
        <ScheduleScreen
          onClose={closeDest}
          onOpenCoord={showCoordCoverageGap}
        />
      )}
      {dest === "meds" && (
        <ComingSoonTakeover title="Meds" onClose={closeDest} />
      )}
      {dest === "settings" && (
        <ComingSoonTakeover title="Settings" onClose={closeDest} />
      )}
      {dest && typeof dest === "object" && dest.kind === "coord" && (
        <ComingSoonTakeover
          title={`Coordinate · ${dest.taskKey}`}
          onClose={closeDest}
        />
      )}
      {dest && typeof dest === "object" && dest.kind === "create" && (
        <ComingSoonTakeover
          title={`Create · ${dest.taskKey}`}
          onClose={closeDest}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Footer — page indicator + voice FAB
// ──────────────────────────────────────────────────────────────

function FooterFlourish({
  page,
  onPageChange,
}: {
  page: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 30,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            padding: "8px 12px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(14px) saturate(160%)",
            WebkitBackdropFilter: "blur(14px) saturate(160%)",
            borderRadius: 999,
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <PageDots
            count={PAGE_COUNT}
            active={page}
            onJump={onPageChange}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 22,
          right: 22,
          zIndex: 30,
        }}
      >
        <VoiceFab />
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Coming-soon placeholder takeover (used by Meds/Coord/Create
// stubs in slice 1A — replaced with real flows in slice 2/3).
// ──────────────────────────────────────────────────────────────

function ComingSoonTakeover({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 250,
        background: "var(--cs-bg)",
        paddingTop: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CreateHeader onBack={onClose} backLabel="Home" />
      <div style={{ flex: 1, padding: "0 22px", overflowY: "auto" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: 30,
            color: "var(--cs-text)",
            letterSpacing: -0.9,
          }}
        >
          {title}
        </h1>
        <div
          style={{
            marginTop: 6,
            fontWeight: 500,
            fontSize: 15,
            color: "var(--cs-text-muted)",
            lineHeight: 1.4,
          }}
        >
          Coming in the next slice.
        </div>
        <div
          style={{
            marginTop: 24,
            padding: "40px 20px",
            textAlign: "center",
            background: "var(--cs-card)",
            borderRadius: 18,
            boxShadow: "var(--cs-card-shadow)",
            border: "1px solid var(--cs-card-border)",
            fontSize: 14,
            color: "var(--cs-text-muted)",
            fontWeight: 500,
          }}
        >
          This flow ships next.
        </div>
      </div>
    </div>
  );
}
