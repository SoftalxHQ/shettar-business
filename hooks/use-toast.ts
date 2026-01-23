import { useState } from "react"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: ToastProps) => {
    // Simple console logging for now
    // You can implement proper toast UI later
    if (props.variant === "destructive") {
      console.error(`${props.title}: ${props.description}`)
    } else {
      console.log(`${props.title}: ${props.description}`)
    }

    setToasts((prev) => [...prev, props])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t !== props))
    }, 5000)
  }

  return { toast, toasts }
}
