import React from "react";

interface FloatingSidebarProps {
  side: "left" | "right";
  children: React.ReactNode;
}

export function FloatingSidebar({ side, children }: FloatingSidebarProps) {
  return (
    <div className={`absolute top-12 ${side === "left" ? "left-1" : "right-1"} w-10 bg-[#15151a]/80 backdrop-blur-xl border border-white/10 rounded-full flex flex-col items-center p-1 gap-1 z-[70] shadow-2xl`}>
      {children}
    </div>
  )
}
