import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "DEEPGRAM_API_KEY is not configured" },
        { status: 500 }
      );
    }

    // Get audio blob from request
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });
    }

    const audioBuffer = await audioFile.arrayBuffer();

    // Call Deepgram Nova-2-Medical model
    const deepgramUrl = new URL("https://api.deepgram.com/v1/listen");
    deepgramUrl.searchParams.set("model", "nova-2-medical");
    deepgramUrl.searchParams.set("smart_format", "true");
    deepgramUrl.searchParams.set("punctuate", "true");
    deepgramUrl.searchParams.set("diarize", "true");
    deepgramUrl.searchParams.set("language", "en-US");
    deepgramUrl.searchParams.set("filler_words", "false");

    const response = await fetch(deepgramUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": audioFile.type || "audio/webm",
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Deepgram error:", errText);
      return NextResponse.json(
        { error: "Deepgram API error", details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    const words = data?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];

    return NextResponse.json({ transcript, words, raw: data });
  } catch (error: unknown) {
    console.error("Transcription error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Server error", details: message },
      { status: 500 }
    );
  }
}