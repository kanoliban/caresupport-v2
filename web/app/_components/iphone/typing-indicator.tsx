"use client";

interface TypingIndicatorProps {
  animate?: boolean;
}

export function TypingIndicator({ animate = true }: TypingIndicatorProps) {
  return (
    <div className={`relative w-fit mr-auto ${animate ? "animate-message-in" : ""}`}>
      <div className="relative">
        <div className="bg-[#e5e5ea] rounded-[18px] rounded-bl-[4px] px-[16px] py-[12px] flex items-center gap-[5px]">
          <span
            className="w-[8px] h-[8px] rounded-full bg-[#8e8e93] animate-typing-dot"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-[8px] h-[8px] rounded-full bg-[#8e8e93] animate-typing-dot"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-[8px] h-[8px] rounded-full bg-[#8e8e93] animate-typing-dot"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        <svg
          className="absolute bottom-0 -left-[6px] w-[12px] h-[18px]"
          viewBox="0 0 12 18"
          aria-hidden
        >
          <path
            d="M12 0C12 0 6 6 6 12C6 18 0 18 0 18L12 18L12 0Z"
            fill="#e5e5ea"
          />
        </svg>
      </div>
    </div>
  );
}
