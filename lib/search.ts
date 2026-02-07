const SEARCH_API_URL = "https://analytics.dugganusa.com/api/v1/search";

export interface SearchHit {
  content: string;
  content_preview: string;
  char_count: number;
  doc_type: string;
  id: string;
  source: string;
  _index: string;
  efta_id?: string;
  people?: string[];
  locations?: string[];
  aircraft?: string[];
  evidence_types?: string[];
  dataset?: string;
  file_path?: string;
  pages?: number;
  page?: number;
  indexed_at?: string;
}

export interface SearchResponse {
  success: boolean;
  data: {
    query: string;
    totalHits: number;
    hits: SearchHit[];
  };
}

export async function searchEpsteinFiles(
  query: string,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    indexes: "epstein_files",
  });

  const res = await fetch(`${SEARCH_API_URL}?${params}`);
  if (!res.ok) throw new Error(`Search API error: ${res.status}`);
  return res.json();
}
