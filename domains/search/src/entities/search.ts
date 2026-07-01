export type SearchDomain =
  | 'media' | 'travel' | 'projects' | 'recipes' | 'shopping'
  | 'finance' | 'insurance' | 'vault' | 'documents' | 'calendar'
  | 'it_inventory' | 'jellyfin';

export type SearchResult = {
  domain: SearchDomain;
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  matchField: string | null;
  matchSnippet: string | null;
};

export type SearchResults = {
  query: string;
  totalResults: number;
  results: SearchResult[];
  grouped: Partial<Record<SearchDomain, SearchResult[]>>;
};
