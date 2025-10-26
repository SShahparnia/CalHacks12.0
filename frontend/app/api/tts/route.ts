import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const API_KEY = process.env.NEXT_PUBLIC_FISH_AUDIO_KEY

    if (!API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        reference_id: "7f92f8afb8ec43bf81429cc1c9199cb1",
        format: "mp3",
        mp3_bitrate: 128,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Fish Audio API error:", errorText)
      return NextResponse.json(
        { error: `Fish Audio API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("TTS API route error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
