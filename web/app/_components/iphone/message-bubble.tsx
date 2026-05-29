"use client";

import { type ReactNode } from "react";

interface MessageBubbleProps {
  children: ReactNode;
  variant: "received" | "sent";
  showTail?: boolean;
  animate?: boolean;
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
}: MessageBubbleProps) {
  const isReceived = variant === "received";
  return (
    <div
      className={`relative w-fit max-w-[75%] ${isReceived ? "mr-auto" : "ml-auto"} ${animate ? "animate-message-in" : ""}`}
    >
      <div
        className={`relative px-[12px] py-[8px] text-[16px] leading-[22px] rounded-[18px] text-left ${
          isReceived
            ? "bg-[#e5e5ea] text-black"
            : "bg-[#007aff] text-white"
        } ${showTail && isReceived ? "rounded-bl-[4px]" : ""} ${
          showTail && !isReceived ? "rounded-br-[4px]" : ""
        }`}
        style={FONT_STYLE}
      >
        {children}
      </div>

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
}
