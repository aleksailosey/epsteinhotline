"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { SimliClient } from "simli-client";

const SIMLI_FACE_ID = process.env.NEXT_PUBLIC_SIMLI_FACE_ID ?? "tmp9i8bbq7c";

export interface SimliAvatarHandle {
  speakText: (text: string) => Promise<void>;
}

const SimliAvatar = forwardRef<SimliAvatarHandle>(function SimliAvatar(
  _props,
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const simliClientRef = useRef<SimliClient | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const client = new SimliClient();
    simliClientRef.current = client;

    const init = async () => {
      if (!videoRef.current || !audioRef.current) return;

      client.Initialize({
        apiKey: process.env.NEXT_PUBLIC_SIMLI_API_KEY ?? "",
        faceID: SIMLI_FACE_ID,
        handleSilence: true,
        maxSessionLength: 600,
        maxIdleTime: 120,
        videoRef: videoRef.current,
        audioRef: audioRef.current,
      } as any);

      client.on("connected", () => {
        console.log("[Simli] Connected");
        const audio = audioRef.current;
        console.log("[Simli] Audio element state:", {
          muted: audio?.muted,
          volume: audio?.volume,
          paused: audio?.paused,
          readyState: audio?.readyState,
          srcObject: !!audio?.srcObject,
          src: audio?.src,
        });
        setIsConnected(true);
        setIsInitializing(false);
      });

      client.on("disconnected", () => {
        console.log("[Simli] Disconnected");
        setIsConnected(false);
      });

      client.on("failed", (reason: string) => {
        console.error("[Simli] Failed:", reason);
        setIsConnected(false);
        setIsInitializing(false);
      });

      await client.start();
    };

    init();

    return () => {
      client.close();
    };
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      const client = simliClientRef.current;
      console.log("[Avatar] speakText called, connected:", isConnected, "client:", !!client);
      if (!client || !isConnected) return;

      // Cancel any in-flight TTS request
      if (abortRef.current) {
        abortRef.current.abort();
        client.ClearBuffer();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        console.log("[Avatar] Fetching /api/tts...");
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });

        console.log("[Avatar] TTS response status:", res.status);
        if (!res.ok || !res.body) {
          console.error("[Avatar] TTS failed:", res.status, await res.text());
          return;
        }

        const reader = res.body.getReader();
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            totalBytes += value.length;
            client.sendAudioData(value);
          }
        }
        console.log("[Avatar] Sent", totalBytes, "bytes of audio to Simli");
        const audio = audioRef.current;
        console.log("[Avatar] Audio element after send:", {
          muted: audio?.muted,
          volume: audio?.volume,
          paused: audio?.paused,
          readyState: audio?.readyState,
          currentTime: audio?.currentTime,
          srcObject: !!audio?.srcObject,
        });
      } catch (e: any) {
        if (e.name !== "AbortError") console.error("[Avatar] TTS error:", e);
      }
    },
    [isConnected]
  );

  useImperativeHandle(ref, () => ({ speakText }), [speakText]);

  return (
    <div className="relative aspect-square w-full overflow-hidden">
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse text-sm text-white/50">
            Loading avatar...
          </p>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      <audio ref={audioRef} autoPlay />
    </div>
  );
});

export default SimliAvatar;
