import React from "react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SideDrawerProps {
  side: "left" | "right" | "bottom";
  activeTab: string | null;
  onClose: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function SideDrawer({ side, activeTab, onClose, headerAction, children }: SideDrawerProps) {
  const swipeDir = side === "bottom" ? "down" : side;

  return (
    <Drawer 
      swipeDirection={swipeDir as any} 
      modal={false} 
      disablePointerDismissal={true}
      open={activeTab !== null} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DrawerContent 
        className={`rounded-3xl border border-white/10 bg-[#15151a]/95 backdrop-blur-2xl shadow-2xl text-white after:hidden ${side === 'bottom' ? 'h-auto w-auto max-w-[600px] mx-auto' : 'w-[200px] md:w-[300px]'}`}
        style={side === "left" 
          ? { left: '56px', top: '56px', height: 'calc(100vh - 60px)' } 
          : side === "right" 
          ? { right: '56px', left: 'auto', top: '56px', height: 'calc(100vh - 60px)' }
          : { bottom: '4px', left: '56px', right: '56px', margin: '0 auto', top: 'auto' }
        }
      >
        <DrawerHeader className="border-b border-white/5 py-1.5 px-3 shrink-0 flex flex-row items-center justify-between !text-left bg-black/20">
          <DrawerTitle className="text-xs font-bold text-gray-500 uppercase tracking-widest m-0 text-left">
            {activeTab}
          </DrawerTitle>
          {headerAction && <div className="shrink-0 ml-4 scale-90 origin-right">{headerAction}</div>}
        </DrawerHeader>
        <ScrollArea className="flex-1 min-h-0 w-full">
           {children}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
