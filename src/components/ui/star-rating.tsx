import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  maxStars?: number
  size?: "sm" | "md" | "lg"
  interactive?: boolean
  className?: string
}

export function StarRating({
  rating,
  onRatingChange,
  maxStars = 5,
  size = "md",
  interactive = false,
  className
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState(0)

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  const handleClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating)
    }
  }

  const handleMouseEnter = (starRating: number) => {
    if (interactive) {
      setHoverRating(starRating)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0)
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxStars }, (_, index) => {
        const starRating = index + 1
        const isActive = starRating <= (hoverRating || rating)
        
        return (
          <Star
            key={index}
            className={cn(
              sizeClasses[size],
              interactive && "cursor-pointer transition-colors",
              isActive 
                ? "fill-accent text-accent" 
                : "fill-muted text-muted-foreground"
            )}
            onClick={() => handleClick(starRating)}
            onMouseEnter={() => handleMouseEnter(starRating)}
            onMouseLeave={handleMouseLeave}
          />
        )
      })}
    </div>
  )
}