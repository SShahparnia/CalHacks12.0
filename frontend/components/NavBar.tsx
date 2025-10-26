import Link from "next/link"
import { Github } from "lucide-react"

export function NavBar({ active }: { active: "browse" | "digest" }) {
  const baseClasses =
    "px-3 py-1.5 text-sm font-medium rounded-full border border-transparent transition-colors hover:bg-muted"
  const activeClasses = "text-primary bg-primary/10 border-primary/30"
  const inactiveClasses = "text-foreground hover:text-primary"

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-secondary/80 backdrop-blur-lg border border-border rounded-full shadow-lg">
        <Link href="/" className={`${baseClasses} ${inactiveClasses}`}>
          Home
        </Link>
        <Link
          href="/?view=browse"
          className={`${baseClasses} ${active === "browse" ? activeClasses : inactiveClasses}`}
        >
          Browse
        </Link>
        <Link
          href="/?view=digest"
          className={`${baseClasses} ${active === "digest" ? activeClasses : inactiveClasses}`}
        >
          Digest
        </Link>
        <div className="w-px h-4 bg-border" />
        <a
          href="https://github.com/rohankhatri7/CalHacks12.0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </nav>
  )
}
