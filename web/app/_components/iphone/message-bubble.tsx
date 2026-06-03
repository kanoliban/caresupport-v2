"use client";

import { type ReactNode } from "react";

interface MessageBubbleProps {
  children: ReactNode;
  variant: "received" | "sent";
  showTail?: boolean;
  animate?: boolean;
  avatarSrc?: string;
  senderName?: string;
}

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

export function MessageBubble({
  children,
  variant,
  showTail = true,
  animate = false,
  avatarSrc,
  senderName,
}: MessageBubbleProps) {
  const isReceived = variant === "received";

  const bubble = (
    <div
      className={`relative w-fit max-w-full px-[12px] py-[8px] text-[16px] leading-[22px] rounded-[18px] text-left ${
        isReceived ? "bg-[#e5e5ea] text-black" : "bg-[#007aff] text-white"
      } ${showTail && isReceived ? "rounded-bl-[4px]" : ""} ${
        showTail && !isReceived ? "rounded-br-[4px]" : ""
      }`}
      style={FONT_STYLE}
    >
      {children}
      {showTail && (
        <svg
          className={`absolute bottom-0 w-[12px] h-[18px] ${isReceived ? "-left-[6px]" : "-right-[6px] scale-x-[-1]"}`}
          viewBox="0 0 12 18"
          aria-hidden
        >
          <path
            d="M12 0C12 0 6 6 6 12C6 18 0 18 0 18L12 18L12 0Z"
            fill={isReceived ? "#e5e5ea" : "#007aff"}
          />
        </svg>
      )}
    </div>
  );

  if (isReceived && (avatarSrc || senderName)) {
    return (
      <div
        className={`flex flex-col mr-auto max-w-[82%] ${animate ? "animate-message-in" : ""}`}
      >
        {senderName && (
          <span className="ml-[36px] mb-[3px] text-[11px] leading-none text-[#8e8e93]">
            {senderName}
          </span>
        )}
        <div className="flex items-end gap-[8px]">
          {avatarSrc && showTail ? (
            <div className="w-[28px] h-[28px] shrink-0 overflow-hidden rounded-full bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarSrc}
                alt="CareSupport"
                className="w-[25px] h-[25px] object-contain"
              />
            </div>
          ) : (
            <div className="w-[28px] shrink-0" aria-hidden />
          )}
          {bubble}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col max-w-[75%] ${isReceived ? "items-start mr-auto" : "items-end ml-auto"} ${animate ? "animate-message-in" : ""}`}
    >
      {senderName && (
        <span
          className={`mb-[3px] text-[11px] leading-none text-[#8e8e93] ${isReceived ? "ml-[2px]" : "mr-[2px]"}`}
        >
          {senderName}
        </span>
      )}
      {bubble}
    </div>
  );
}
