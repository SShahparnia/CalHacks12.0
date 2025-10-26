import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const API_KEY = process.env.NEXT_PUBLIC_FISH_AUDIO_KEY
    if (!API_KEY) {
      console.error("NEXT_PUBLIC_FISH_AUDIO_KEY is not set")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    console.log("Calling Fish Audio API for text:", text.substring(0, 50) + "...")

    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        reference_id: "e84b3cd0921f4e53bdbc8753ab0a0734", // Your custom voice model
        format: "mp3",
        mp3_bitrate: 128,
        opus_bitrate: -1000,
        latency: "normal",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Fish Audio API error:", response.status, errorText)
      return NextResponse.json(
        { error: `Fish Audio API error: ${response.status}` },
        { status: response.status }
      )
    }

    // Stream the audio response back to the client
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
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
