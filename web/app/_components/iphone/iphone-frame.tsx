"use client";

import { type ReactNode } from "react";

interface IPhoneFrameProps {
  children: ReactNode;
  className?: string;
}

export function IPhoneFrame({ children, className = "" }: IPhoneFrameProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative bg-[#1a1a1a] rounded-[55px] p-[14px] shadow-[0_12px_24px_-12px_rgba(0,0,0,0.35)]">
        <div className="absolute left-[-3px] top-[120px] w-[3px] h-[30px] bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-[-3px] top-[170px] w-[3px] h-[60px] bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute left-[-3px] top-[240px] w-[3px] h-[60px] bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute right-[-3px] top-[180px] w-[3px] h-[80px] bg-[#2a2a2a] rounded-r-sm" />

        <div className="relative bg-black rounded-[42px] overflow-hidden">
          <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-50">
            <div className="w-[126px] h-[37px] bg-black rounded-full flex items-center justify-center">
              <div className="absolute left-[22px] w-[12px] h-[12px] rounded-full bg-[#1a1a2e] ring-1 ring-[#2a2a3e]">
                <div className="absolute inset-[2px] rounded-full bg-[#0f0f1a]">
                  <div className="absolute top-[2px] left-[2px] w-[3px] h-[3px] rounded-full bg-[#2a2a4a] opacity-50" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-[375px] h-[760px] bg-[#f2f2f7]">
            {children}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 rounded-[55px] pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent" />
    </div>
  );
}
