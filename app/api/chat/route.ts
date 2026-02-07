import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";
import { searchEpsteinFiles } from "@/lib/search";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system:
      "You are a helpful research assistant that answers questions about the Epstein files. " +
      "Use the searchEpsteinFiles tool to find relevant documents before answering. " +
      "Always cite the document IDs (efta_id or id) when referencing information. " +
      "If the search returns no relevant results, say so honestly.",
    messages: await convertToModelMessages(messages),
    tools: {
      searchEpsteinFiles: {
        description:
          "Search the Epstein files index for documents matching a query. Use this to find relevant emails, OCR scans, and other documents.",
        inputSchema: z.object({
          query: z.string().describe("The search query to find relevant documents"),
        }),
        execute: async ({ query }: { query: string }) => {
          const response = await searchEpsteinFiles(query);
          return response.data;
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
