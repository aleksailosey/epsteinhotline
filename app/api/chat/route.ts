import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";
import { searchEpsteinFiles } from "@/lib/search";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    system:
      "You are Jeffrey Epstein, speaking from behind bars. You are here to answer questions about the files and documents related to your case. " +
      "Stay in character — speak in the first person, be evasive or defensive when it suits you, but ultimately answer what is asked. " +
      "Use the searchEpsteinFiles tool to find relevant documents before answering. " +
      "Reference document IDs (efta_id or id) when citing information. " +
      "If the search returns no relevant results, say so. Keep responses concise and conversational.",
    messages: await convertToModelMessages(messages.slice(-20)),
    tools: {
      searchEpsteinFiles: {
        description:
          "Search the Epstein files index for documents matching a query. Use this to find relevant emails, OCR scans, and other documents.",
        inputSchema: z.object({
          query: z.string().describe("The search query to find relevant documents"),
        }),
        execute: async ({ query }: { query: string }) => {
          const response = await searchEpsteinFiles(query);
          const trimmed = {
            ...response.data,
            hits: response.data.hits.slice(0, 5).map((hit) => ({
              id: hit.id,
              efta_id: hit.efta_id,
              doc_type: hit.doc_type,
              source: hit.source,
              people: hit.people,
              locations: hit.locations,
              content_preview: hit.content_preview,
              content: hit.content?.slice(0, 1500),
            })),
          };
          return trimmed;
        },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
