// types/index.ts
export interface SearchQuery {
    query: string;
    numResults?: number;
  }
  
  export interface SearchResult {
    title: string;
    url: string;
    snippet: string;
  }
  
  // Exa specific types
  export interface ExaResult {
    title: string;
    url: string;
    text: string;
    excerpt?: string;
    // other properties that Exa returns
  }