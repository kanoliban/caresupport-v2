"use client";

import { CSLogo } from "./cs-logo";

type CreateHeaderProps = {
  onBack?: () => void;
  hideBack?: boolean;
  /** Optional label override. Defaults to "Back". */
  backLabel?: string;
};

export function CreateHeader({
  onBack,
  hideBack = false,
  backLabel = "Back",
}: CreateHeaderProps) {
  return (
    <div
      className="grid items-center px-[18px]"
      style={{
        gridTemplateColumns: "1fr auto 1fr",
        height: 56,
      }}
    >
      <div className="justify-self-start">
        {!hideBack && (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer border-0 bg-transparent p-0 text-cs-primary"
            style={{
              fontFamily: "inherit",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: -0.2,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1, marginTop: -2 }}>
              ‹
            </span>
            <span>{backLabel}</span>
          </button>
        )}
      </div>
      <div className="justify-self-center">
        <CSLogo size={36} />
      </div>
      <div className="justify-self-end" />
    </div>
  );
}
