"use client"
import { useEffect, useState } from "react"

export default function HighlightToSpeech() {
  const [selectedText, setSelectedText] = useState("")
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [words, setWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number } | null>(null)

  // Track highlighted text and show a small floating button
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim() || ""
      if (text) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        if (rect) {
          setButtonPos({ x: rect.right + window.scrollX, y: rect.top + window.scrollY - 30 })
          setOverlayPos({ x: rect.left + window.scrollX, y: rect.top + window.scrollY })
        }
        setSelectedText(text)
      } else {
        setButtonPos(null)
      }
    }
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [])

  // Generate speech using Fish Audio via proxy
  async function handleSpeak() {
    if (!selectedText) return
    setLoading(true)
    setShowOverlay(true)
    setButtonPos(null)

    // Split text into words for highlighting
    const wordArray = selectedText.split(/\s+/)
    setWords(wordArray)
    setCurrentWordIndex(-1)

    try {
      console.log("Generating speech for text:", selectedText)
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: selectedText }),
      })

      console.log("TTS API response status:", res.status)

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`TTS request failed: ${res.status} ${errorText}`)
      }

      const blob = await res.blob()
      console.log("Received audio blob, size:", blob.size)

      if (blob.size === 0) {
        throw new Error("Received empty audio file")
      }

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setAudioElement(audio)

      audio.addEventListener("loadedmetadata", () => {
        const duration = audio.duration * 1000 // Convert to milliseconds
        const wordCount = wordArray.length
        // Reduce the duration slightly to make highlighting faster (95% of actual duration)
        const adjustedDuration = duration * 0.92
        const wordDuration = adjustedDuration / wordCount

        console.log(`Audio duration: ${duration}ms, Adjusted: ${adjustedDuration}ms, Words: ${wordCount}, Per word: ${wordDuration.toFixed(0)}ms`)

        let index = 0
        const interval = setInterval(() => {
          if (index >= wordCount || audio.paused || audio.ended) {
            clearInterval(interval)
            return
          }
          setCurrentWordIndex(index)
          index++
        }, wordDuration)

        audio.addEventListener("ended", () => {
          clearInterval(interval)
          setShowOverlay(false)
          setCurrentWordIndex(-1)
          URL.revokeObjectURL(url)
        })

        audio.addEventListener("pause", () => {
          clearInterval(interval)
        })
      })

      audio.play()
      console.log("Audio playing successfully")
    } catch (err) {
      console.error("TTS Error:", err)
      alert(`Failed to generate speech: ${err instanceof Error ? err.message : "Unknown error"}\n\nCheck the browser console for details.`)
      setShowOverlay(false)
    } finally {
      setLoading(false)
    }
  }

  function handleStop() {
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }
    setShowOverlay(false)
    setCurrentWordIndex(-1)
    setButtonPos(null)
  }

  if (showOverlay && overlayPos) {
    return (
      <div
        className="fixed z-50 bg-black/80 backdrop-blur-sm border-2 border-primary rounded-lg shadow-2xl p-6 max-w-3xl animate-in fade-in zoom-in-95"
        style={{ top: overlayPos.y, left: overlayPos.x }}
      >
        <button
          onClick={handleStop}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center transition-colors"
          title="Stop"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        <div className="text-lg leading-relaxed text-white">
          {words.map((word, idx) => (
            <span
              key={idx}
              className={`transition-all duration-200 ${
                idx === currentWordIndex
                  ? "bg-primary text-primary-foreground font-bold px-1 rounded"
                  : "text-white"
              }`}
            >
              {word}{" "}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (!buttonPos) return null

  return (
    <button
      onClick={handleSpeak}
      disabled={loading}
      className="fixed z-50 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      style={{ top: buttonPos.y, left: buttonPos.x }}
      title="Text to Speech"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v9.28a4.39 4.39 0 00-1.09-.13 4.48 4.48 0 100 9A4.48 4.48 0 0015.39 17V7h3V3zm-1.09 13.5a2.59 2.59 0 110-5.19 2.59 2.59 0 010 5.19z" />
          <path d="M3 9v6h4l5 5V4L7 9H3z" />
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z" />
        </svg>
      )}
      <span className="text-sm font-medium">Speak</span>
    </button>
  )
}
