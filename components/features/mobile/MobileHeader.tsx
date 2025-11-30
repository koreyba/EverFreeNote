import { BookOpen } from "lucide-react"

interface MobileHeaderProps {
  children?: React.ReactNode // The Menu Button / Sheet Trigger
}

export function MobileHeader({ children }: MobileHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background md:hidden sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {children}
        <div className="flex items-center gap-2 ml-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">EverFreeNote</h1>
        </div>
      </div>
    </div>
  )
}
