export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo container */}
        <div className="relative">
          {/* Outer spinning ring */}
          <div
            className="w-20 h-20 border-4 border-blue-100 rounded-full absolute animate-spin"
            style={{ animationDuration: "3s" }}
          />

          {/* Inner spinning ring */}
          <div className="w-20 h-20 border-4 border-transparent border-t-blue-600 border-r-blue-600 rounded-full animate-spin" />

          {/* Center pulsing dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Loading text with fade animation */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-foreground animate-pulse">Loading</p>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
