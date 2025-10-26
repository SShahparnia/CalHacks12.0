"use client"
import { useEffect, useState } from "react"

export default function HighlightToSpeech() {
  const [selectedText, setSelectedText] = useState("")
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const API_KEY = process.env.NEXT_PUBLIC_FISH_AUDIO_KEY

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

  // Generate speech using Fish Audio
  async function handleSpeak() {
    if (!selectedText) return
    setLoading(true)
    try {
      const res = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "fish-speech-1",
          text: selectedText,
          voice: "male_1",
          format: "mp3",
        }),
      })
      if (!res.ok) throw new Error("TTS request failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.play()
    } catch (err) {
      console.error(err)
      alert("Something went wrong with Fish Audio.")
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
