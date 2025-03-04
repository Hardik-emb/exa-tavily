// This file contains types specific to the Exa API client implementation
// The main types used across the application are in types/index.ts

import { ExaResult, SearchResult } from '@/types';

export interface ExaSearchOptions {
  numResults?: number;
  highlights?: boolean;
  useAutoprompt?: boolean;
  type?: 'keyword' | 'neural';
}

export interface ExaSearchResponse {
  results: ExaResult[];
  autoprompt?: string;
  highlightedResults?: ExaResult[];
}

export interface ExaErrorResponse {
  error: {
    message: string;
    type: string;
  };
}
