"use client"
import { useEffect, useState } from "react"

export default function HighlightToSpeech() {
  const [selectedText, setSelectedText] = useState("")
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)

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
      
      audio.onerror = (e) => {
        console.error("Audio playback error:", e)
        URL.revokeObjectURL(url)
        throw new Error("Failed to play audio")
      }
      
      audio.onended = () => {
        URL.revokeObjectURL(url)
      }
      
      await audio.play()
      console.log("Audio playing successfully")
      
    } catch (err) {
      console.error("Speech generation error:", err)
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      alert(`Failed to generate speech: ${errorMessage}\n\nCheck the browser console for details.`)
    } finally {
      setLoading(false)
      setButtonPos(null)
    }
  }

  if (!buttonPos) return null

  return (
    <button
      onClick={handleSpeak}
      disabled={loading}
      className="fixed z-50 bg-primary text-white px-2 py-1 text-xs rounded-lg shadow-lg hover:opacity-90 transition-opacity"
      style={{ top: buttonPos.y, left: buttonPos.x }}
    >
      {loading ? "..." : "🔊 Speak"}
    </button>
  )
}
