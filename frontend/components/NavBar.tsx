import Link from "next/link"
import { Github } from "lucide-react"

export function NavBar({ active }: { active: "browse" | "digest" | "home" }) {
  const baseClasses =
    "px-3 py-1.5 text-sm font-medium rounded-full border transition-all duration-200"
  const activeClasses = "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-white shadow-lg shadow-blue-500/10"
  const inactiveClasses = "text-gray-300 hover:text-white border-transparent hover:bg-white/5"

  return (
    <nav className="fixed top-6 right-6 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
        <Link 
          href="/" 
          className={`${baseClasses} ${active === "home" ? activeClasses : inactiveClasses}`}
        >
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
        <div className="w-px h-4 bg-white/10" />
        <a
          href="https://github.com/rohankhatri7/CalHacks12.0"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-gray-300 hover:text-white transition-all duration-200 rounded-full hover:bg-white/5 border border-transparent"
        >
          <Github className="h-4 w-4" />
          GitHub
        </a>
      </div>
    </nav>
  )
}