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
          setButtonPos({ x: rect.right + window.scrollX, y: rect.top + window.scrollY - 40 })
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

  // Generate speech using Fish Audio via Next.js API route
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
      console.log("Generating speech for text:", selectedText.substring(0, 50) + "...")

      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
        }),
      })

      console.log("TTS API response status:", res.status)

      if (!res.ok) {
        const error = await res.json()
        console.error("TTS API error:", error)
        throw new Error(error.error || "TTS request failed")
      }

      const blob = await res.blob()
      console.log("Received audio blob, size:", blob.size, "bytes")

      if (blob.size === 0) {
        throw new Error("Received empty audio file")
      }

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      setAudioElement(audio)

      audio.addEventListener("loadedmetadata", () => {
        const duration = audio.duration * 1000 // Convert to milliseconds
        const wordCount = wordArray.length
        // Speed up highlighting by 8% to stay ahead of audio
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

      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        URL.revokeObjectURL(url)
        setShowOverlay(false)
        throw new Error("Failed to play audio")
      }

      audio.play()
      console.log("Audio playing successfully")
    } catch (err) {
      console.error("Speech generation error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      alert(`Failed to generate speech: ${errorMessage}\n\nCheck the browser console for details.`)
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

  return (
    <>
      {/* Floating Speak Button */}
      {buttonPos && (
        <button
          onClick={handleSpeak}
          disabled={loading}
          className="fixed z-50 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm rounded-lg shadow-lg transition-all flex items-center gap-2"
          style={{ top: buttonPos.y, left: buttonPos.x }}
        >
          {loading ? (
            "..."
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1 1 0 011 1v5.586l1.707-1.707a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L9 9.586V4a1 1 0 011-1z" />
                <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
              </svg>
              Speak
            </>
          )}
        </button>
      )}

      {/* Reading Text Box - positioned above highlighted text */}
      {showOverlay && overlayPos && (
        <div 
          className="fixed z-[100] max-w-2xl p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-700"
          style={{ 
            top: overlayPos.y - 20, 
            left: overlayPos.x,
            transform: 'translateY(-100%)'
          }}
        >
          <button
            onClick={handleStop}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            Stop
          </button>
          <div className="text-lg leading-relaxed pr-16">
            {words.map((word, idx) => (
              <span
                key={idx}
                className={`transition-all duration-200 ${
                  idx === currentWordIndex
                    ? "bg-yellow-200 text-black font-semibold px-1 rounded"
                    : "text-white"
                }`}
              >
                {word}{" "}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
