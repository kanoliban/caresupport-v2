"use client";

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

export interface Option {
  id: string;
  label: string;
}

interface OptionButtonsProps {
  options: Option[];
  onSelect: (option: Option) => void;
  disabled?: boolean;
  animate?: boolean;
}

export function OptionButtons({
  options,
  onSelect,
  disabled = false,
  animate = false,
}: OptionButtonsProps) {
  return (
    <div
      className={`flex flex-col gap-[8px] ${animate ? "animate-options-in" : ""}`}
    >
      {options.map((option, index) => (
        <button
          key={option.id}
          onClick={() => !disabled && onSelect(option)}
          disabled={disabled}
          className={`w-full py-[12px] px-[16px] rounded-[12px] text-[16px] font-medium bg-white border border-[#c6c6c8] text-[#007aff] transition-all duration-200 ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-[#007aff] hover:text-white hover:border-[#007aff] active:scale-[0.98]"
          }`}
          style={{
            ...FONT_STYLE,
            animationDelay: animate ? `${index * 100}ms` : undefined,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
