"use client"
import { useEffect, useState, useRef } from "react"

export default function HighlightToSpeech() {
  const [selectedText, setSelectedText] = useState("")
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(-1)
  const [words, setWords] = useState<string[]>([])
  const [overlayPos, setOverlayPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rangeRef = useRef<Range | null>(null)

  // Track highlighted text and show a small floating button
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim() || ""
      if (text) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()
        if (rect && range) {
          setButtonPos({ x: rect.right + window.scrollX, y: rect.top + window.scrollY - 30 })
          rangeRef.current = range.cloneRange() // Store the range for later highlighting
          
          // Get the bounding box of the entire selection for overlay
          setOverlayPos({
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          })
        }
        setSelectedText(text)
        // Split text into words for highlighting
        setWords(text.split(/(\s+)/).filter(word => word.trim().length > 0))
      } else {
        setButtonPos(null)
        setOverlayPos(null)
        rangeRef.current = null
      }
    }
    document.addEventListener("mouseup", handleMouseUp)
    return () => document.removeEventListener("mouseup", handleMouseUp)
  }, [])

  // Generate speech using Fish Audio via Next.js API route
  async function handleSpeak() {
    if (!selectedText) return
    
    setLoading(true)
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
      audioRef.current = audio
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        URL.revokeObjectURL(url)
        setIsPlaying(false)
        throw new Error("Failed to play audio")
      }
      
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setIsPlaying(false)
        setCurrentWordIndex(-1)
        audioRef.current = null
      }
      
      // Wait for audio metadata to load so we can get the duration
      await new Promise<void>((resolve) => {
        audio.addEventListener("loadedmetadata", () => resolve(), { once: true })
      })
      
      const audioDuration = audio.duration * 1000 // Convert to milliseconds
      const wordCount = words.length
      const wordDuration = audioDuration / wordCount // Milliseconds per word based on actual audio length
      
      console.log(`Audio duration: ${audioDuration}ms, Words: ${wordCount}, Per word: ${wordDuration.toFixed(0)}ms`)
      
      // Start playing audio
      audio.play()
      setIsPlaying(true)
      setButtonPos(null) // Hide the speak button
      console.log("Audio playing successfully with synchronized highlighting")
      
      // Highlight words progressively based on actual audio duration
      let wordIndex = 0
      const highlightInterval = setInterval(() => {
        if (wordIndex < words.length && audio.currentTime < audio.duration) {
          setCurrentWordIndex(wordIndex)
          wordIndex++
        } else if (wordIndex >= words.length || audio.ended) {
          clearInterval(highlightInterval)
        }
      }, wordDuration)
      
      // Clean up interval when audio ends
      audio.addEventListener("ended", () => clearInterval(highlightInterval))
      audio.addEventListener("pause", () => clearInterval(highlightInterval))
      
    } catch (err) {
      console.error("Speech generation error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      alert(`Failed to generate speech: ${errorMessage}\n\nCheck the browser console for details.`)
      setIsPlaying(false)
    } finally {
      setLoading(false)
    }
  }

  // Stop playback
  function stopPlayback() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentWordIndex(-1)
    setButtonPos(null)
    setOverlayPos(null)
  }

  if (!buttonPos && !isPlaying) return null

  return (
    <>
      {/* Speak button */}
      {buttonPos && !isPlaying && (
        <button
          onClick={handleSpeak}
          disabled={loading}
          className="fixed z-50 bg-primary text-white px-2 py-1 text-xs rounded-lg shadow-lg hover:opacity-90 transition-opacity"
          style={{ top: buttonPos.y, left: buttonPos.x }}
        >
          {loading ? "..." : "🔊 Speak"}
        </button>
      )}

      {/* Reading overlay with highlighted text */}
      {isPlaying && overlayPos && (
        <div
          className="fixed z-[60] pointer-events-none"
          style={{
            top: overlayPos.y - 10,
            left: overlayPos.x - 10,
            width: overlayPos.width + 20,
            minHeight: overlayPos.height + 20,
          }}
        >
          {/* Background overlay */}
          <div className="absolute inset-0 bg-black/80 rounded-lg backdrop-blur-sm border-2 border-primary/50" />
          
          {/* Text with word-by-word highlighting */}
          <div className="relative p-4 text-lg leading-relaxed">
            {words.map((word, index) => (
              <span
                key={index}
                className={`transition-all duration-200 ${
                  index === currentWordIndex
                    ? "bg-primary text-primary-foreground font-semibold px-1 rounded"
                    : "text-white"
                }`}
              >
                {word}{" "}
              </span>
            ))}
          </div>

          {/* Stop button */}
          <button
            onClick={stopPlayback}
            className="absolute top-2 right-2 pointer-events-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1 text-xs rounded-lg shadow-lg transition-colors"
          >
            ⏹ Stop
          </button>
        </div>
      )}
    </>
  )
}
