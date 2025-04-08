import type React from "react"
import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fullWidth?: boolean
}

export function Container({ children, className, fullWidth = false, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full", fullWidth ? "max-w-none px-4 md:px-6 lg:px-8" : "container", className)}
      {...props}
    >
      {children}
    </div>
  )
}

