import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const VOICE_ID =
  process.env.NEXT_PUBLIC_SIMLI_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response("Missing text", { status: 400 });
    }

    console.log("[TTS] Generating speech for voice:", VOICE_ID, "text length:", text.length, "preview:", text.slice(0, 80));

    const audioStream = await elevenlabs.textToSpeech.stream(VOICE_ID, {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "pcm_16000",
    });

    // The SDK may return a ReadableStream or a Node stream-like object.
    // Convert to a web ReadableStream if needed.
    if (audioStream instanceof ReadableStream) {
      return new Response(audioStream, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }

    // If it's an async iterable (Node stream), convert it
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of audioStream as AsyncIterable<Uint8Array>) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (err) {
          console.error("[TTS] Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (err) {
    console.error("[TTS] Error:", err);
    return new Response("TTS generation failed", { status: 500 });
  }
}
