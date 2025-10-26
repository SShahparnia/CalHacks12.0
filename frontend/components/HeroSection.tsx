import Link from "next/link"

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="text-center space-y-8 max-w-2xl relative z-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-balance tracking-tight">Kensa</h1>
          <p className="text-lg text-muted-foreground text-balance">AI-powered research paper digests from arXiv</p>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/?view=browse"
            className="h-12 px-8 bg-secondary white border border-border rounded-xl font-medium hover:bg-muted transition-all flex items-center justify-center"
          >
            Browse
          </Link>

          <Link
            href="/?view=digest"
            className="h-12 px-8 bg-foreground text-background rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center"
          >
            Digest
          </Link>
        </div>
      </div>
    </main>
  )
}