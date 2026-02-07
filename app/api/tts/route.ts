import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const VOICE_ID = process.env.NEXT_PUBLIC_SIMLI_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return new Response("Missing text", { status: 400 });
  }

  const audioStream = await elevenlabs.textToSpeech.stream(VOICE_ID, {
    text,
    modelId: "eleven_turbo_v2_5",
    outputFormat: "pcm_16000",
  });

  return new Response(audioStream as unknown as ReadableStream, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
