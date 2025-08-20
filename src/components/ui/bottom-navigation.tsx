import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface BottomNavigationProps {
  items: {
    id: string
    title: string
    icon: LucideIcon
    isActive?: boolean
    onClick: () => void
  }[]
  className?: string
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border",
      "grid grid-cols-4 gap-1 p-2",
      "md:hidden", // Only show on mobile
      className
    )}>
      {items.map((item) => (
        <Button
          key={item.id}
          variant={item.isActive ? "default" : "ghost"}
          size="sm"
          onClick={item.onClick}
          className={cn(
            "flex flex-col gap-1 h-auto py-2 px-1",
            "text-xs font-medium",
            item.isActive 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span className="truncate max-w-full">{item.title}</span>
        </Button>
      ))}
    </div>
  )
}