import { useState, useEffect } from 'react'

export default function Page() {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const fullText = 'PaperLink'
  const typingSpeed = 150 // milliseconds per character

  useEffect(() => {
    let currentIndex = 0
    let isDeleting = false
    let deleteCount = 0
    let targetDeleteCount = 0
    let typingTimeout: NodeJS.Timeout
    
    const type = () => {
      if (!isDeleting && currentIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex))
        currentIndex++
        typingTimeout = setTimeout(type, typingSpeed)
      } else if (!isDeleting && currentIndex > fullText.length) {
        // Pause at the end before deleting
        typingTimeout = setTimeout(() => {
          isDeleting = true
          deleteCount = 0
          // Randomly delete between 3 and 7 letters
          targetDeleteCount = Math.floor(Math.random() * 5) + 3
          type()
        }, 2000)
      } else if (isDeleting && deleteCount < targetDeleteCount && currentIndex > 0) {
        currentIndex--
        deleteCount++
        setDisplayText(fullText.slice(0, currentIndex))
        typingTimeout = setTimeout(type, typingSpeed / 2)
      } else if (isDeleting && deleteCount >= targetDeleteCount) {
        // Done deleting, start typing again
        isDeleting = false
        typingTimeout = setTimeout(type, 500)
      }
    }

    type()

    // Cursor blink effect
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)

    return () => {
      clearTimeout(typingTimeout)
      clearInterval(cursorInterval)
    }
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="text-center space-y-8 max-w-2xl relative z-10">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-balance tracking-tight min-h-[72px] flex items-center justify-center">
            <span>
              {displayText}
            </span>
            <span 
              className={`inline-block w-1 h-14 bg-foreground ml-1 transition-opacity duration-100 ${
                showCursor ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            AI-powered arXiv digests, ready to share
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <a
            href="/?view=browse"
            className="group relative h-12 px-8 border border-white/10 rounded-xl font-medium transition-all flex items-center justify-center overflow-hidden bg-gray-900/50"
          >
            <span className="relative z-10 text-gray-200 group-hover:text-white transition-colors">
              Browse
            </span>
          </a>

          <a
            href="/?view=digest"
            className="h-12 px-8 bg-foreground text-background rounded-xl font-medium transition-all flex items-center justify-center"
          >
            <span className="relative z-10 text-black font-semibold">
              Digest
            </span>
          </a>
        </div>
      </div>
    </main>
  )
}