"use client"
import { useEffect, useRef, useState } from "react"

export default function HighlightToSpeech() {
  const [selectedText, setSelectedText] = useState("")
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const [words, setWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number } | null>(null)
  const buttonMouseDownRef = useRef(false)

  // Track highlighted text and show a small floating button
  useEffect(() => {
    const updateFromSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setButtonPos(null)
        setSelectedText("")
        return
      }

      const text = selection.toString().replace(/\s+/g, " ").trim()
      if (!text) {
        setButtonPos(null)
        setSelectedText("")
        return
      }

      let range: Range
      try {
        range = selection.getRangeAt(0)
      } catch {
        return
      }

      // Use the last client rect for multi-line selections; fallback to bounding rect
      const clientRects = range.getClientRects()
      const rect = clientRects.length ? clientRects[clientRects.length - 1] : range.getBoundingClientRect()
      if (!rect) return

      // For fixed positioning, use viewport coordinates (no scroll offsets) and clamp to viewport
      const x = Math.min(window.innerWidth - 120, rect.right + 8)
      const y = Math.min(window.innerHeight - 48, Math.max(8, rect.top - 36))
      setButtonPos({ x, y })
      setOverlayPos({ x: rect.left, y: rect.top })
      setSelectedText(text)
    }

    const handleMouseUp = () => {
      // Defer to ensure selection is finalized
      setTimeout(updateFromSelection, 0)
    }

    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("selectionchange", () => {
      if (buttonMouseDownRef.current) return
      updateFromSelection()
    })
    return () => {
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("selectionchange", updateFromSelection as any)
    }
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
          onMouseDown={() => (buttonMouseDownRef.current = true)}
          onMouseUp={() => (buttonMouseDownRef.current = false)}
          onClick={handleSpeak}
          disabled={loading}
          className="fixed z-[2000] bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm rounded-lg shadow-lg transition-all flex items-center gap-2"
          style={{ top: buttonPos.y, left: buttonPos.x }}
        >
          {loading ? (
            "..."
          ) : (
            <>
              Speak
            </>
          )}
        </button>
      )}

      {/* Reading Text Box - positioned above highlighted text */}
      {showOverlay && overlayPos && (
        <div
          className="fixed z-[2000] max-w-2xl p-6 bg-gray-900 rounded-xl shadow-2xl border border-gray-700"
          style={{
            top: Math.max(8, overlayPos.y - 20),
            left: Math.min(window.innerWidth - 32, Math.max(8, overlayPos.x)),
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
