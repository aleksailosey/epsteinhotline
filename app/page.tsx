"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useState, useCallback, useEffect } from "react";
import SimliAvatar, { type SimliAvatarHandle } from "./SimliAvatar";

export default function Home() {
  const avatarRef = useRef<SimliAvatarHandle>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const { sendMessage, status } = useChat({
    onFinish: async ({ message }) => {
      const text = message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      if (text && avatarRef.current) {
        avatarRef.current.speakText(text);
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);

      if (result.isFinal) {
        const finalText = result[0].transcript.trim();
        if (finalText) {
          sendMessage({ text: finalText });
        }
        setTranscript("");
        setIsListening(false);
      }
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [sendMessage]);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognition.start();
      setIsListening(true);
    }
  }, [isListening]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="mb-8 text-2xl font-bold">Chat with the Epstein Files</h1>

      <SimliAvatar ref={avatarRef} />

      <div className="mt-6 flex flex-col items-center gap-4">
        {transcript && (
          <p className="text-sm text-white/60 italic">&ldquo;{transcript}&rdquo;</p>
        )}

        {isLoading && (
          <p className="animate-pulse text-sm text-white/40">Thinking...</p>
        )}

        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
            isListening
              ? "bg-red-500 scale-110 animate-pulse"
              : "bg-white/10 hover:bg-white/20"
          } disabled:opacity-30`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-7 w-7"
          >
            <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2Z" />
          </svg>
        </button>

        <p className="text-xs text-white/30">
          {isListening ? "Listening..." : "Tap to speak"}
        </p>
      </div>
    </div>
  );
}
