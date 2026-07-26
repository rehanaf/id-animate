import React from "react"
import { Button } from "@/components/ui/button"

interface SidebarButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ElementType;
  activeColorClass?: string;
  hasSubMenu?: boolean;
}

export function SidebarButton({ 
  active, 
  onClick, 
  title, 
  icon: Icon, 
  activeColorClass = "bg-blue-600 hover:bg-blue-500 shadow-blue-500/30",
  hasSubMenu = false
}: SidebarButtonProps) {
  return (
    <Button 
      variant={active ? "default" : "ghost"} 
      size="icon" 
      className={`relative w-8 h-8 rounded-full transition-all duration-300 ${active ? `${activeColorClass} text-white shadow-lg` : "text-gray-400 hover:text-white hover:bg-white/10"}`} 
      title={title}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      {hasSubMenu && (
        <div 
          className="absolute bottom-1 right-1 w-0 h-0 border-t-[4px] border-t-transparent border-l-[4px] border-l-transparent border-r-[4px] border-r-gray-400 group-hover:border-r-white border-b-[4px] border-b-gray-400 group-hover:border-b-white transition-colors"
          style={{ borderStyle: "solid" }}
        />
      )}
    </Button>
  )
}
