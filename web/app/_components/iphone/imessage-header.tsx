"use client";

const FONT_STYLE = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
};

export function IMessageHeader() {
  return (
    <div
      className="relative bg-[#f6f6f6]/95 backdrop-blur-xl border-b border-[#c6c6c8]"
      style={FONT_STYLE}
    >
      {/* status bar */}
      <div className="flex items-center justify-between px-[28px] pt-[14px] pb-[6px] text-[15px] font-semibold text-black">
        <span>9:41</span>
        <div className="flex items-center gap-[5px]">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="black" aria-hidden>
            <rect x="0" y="8" width="3" height="4" rx="0.5" />
            <rect x="5" y="5" width="3" height="7" rx="0.5" />
            <rect x="10" y="2" width="3" height="10" rx="0.5" />
            <rect x="15" y="0" width="3" height="12" rx="0.5" />
          </svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="black" aria-hidden>
            <path d="M8.5 3.5C11.5 3.5 14 4.8 15.5 6.8L17 5C15 2.5 11.9 1 8.5 1C5.1 1 2 2.5 0 5L1.5 6.8C3 4.8 5.5 3.5 8.5 3.5Z" />
            <path d="M8.5 6.5C10.3 6.5 11.9 7.3 13 8.5L14.5 6.8C13 5.2 10.9 4.2 8.5 4.2C6.1 4.2 4 5.2 2.5 6.8L4 8.5C5.1 7.3 6.7 6.5 8.5 6.5Z" />
            <circle cx="8.5" cy="10.5" r="1.5" />
          </svg>
          <div className="flex items-center gap-[2px]">
            <div className="w-[25px] h-[12px] border border-black rounded-[3px] p-[1px]">
              <div className="w-full h-full bg-black rounded-[1px]" />
            </div>
            <div className="w-[2px] h-[5px] bg-black rounded-r-sm" />
          </div>
        </div>
      </div>

      {/* nav bar */}
      <div className="flex items-center px-[16px] py-[10px]">
        <div className="flex items-center gap-[4px] text-[#007aff]">
          <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden>
            <path
              d="M10.5 1L2 10L10.5 19"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-[17px]">Messages</span>
        </div>

        <div className="flex-1 flex flex-col items-center -ml-[60px] mt-[8px]">
          <div className="w-[48px] h-[48px] rounded-full bg-white flex items-center justify-center mb-[2px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/caresupport-logo.webp"
              alt=""
              className="w-[43px] h-[43px] object-contain"
            />
          </div>
          <span className="text-[13px] font-semibold text-black">CareSupport</span>
          <span className="text-[11px] text-[#8e8e93]">Care coordinator</span>
        </div>

        <div className="flex items-center gap-[16px] text-[#007aff]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
