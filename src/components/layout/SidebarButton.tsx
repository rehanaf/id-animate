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
      className={`group relative w-8 h-8 rounded-full transition-all duration-300 ${active ? `${activeColorClass} text-white shadow-lg` : "text-gray-400 hover:text-white hover:bg-white/10"}`} 
      title={title}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
      {hasSubMenu && (
        <div 
          className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full transition-colors ${active ? "bg-white" : "bg-gray-400 group-hover:bg-white"}`}
        />
      )}
    </Button>
  )
}
