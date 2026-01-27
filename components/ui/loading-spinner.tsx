import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number
  fullScreen?: boolean
}

export function LoadingSpinner({ size = 24, fullScreen = false, className, ...props }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
        <Loader2 className={cn("animate-spin text-indigo-500", className)} size={size * 1.5} />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <Loader2 className={cn("animate-spin text-indigo-500", className)} size={size} />
    </div>
  )
}
