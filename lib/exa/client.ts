import Exa from 'exa-js';
import { SearchQuery, SearchResult, ExaResult } from '@/types';
import { ExaSearchOptions, ExaSearchResponse } from './types';

export class ExaClient {
  private client: Exa;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Exa API key is required');
    }
    this.client = new Exa(apiKey);
  }

  async search(params: SearchQuery): Promise<SearchResult[]> {
    try {
      console.log('Searching Exa with query:', params.query);
      
      const options: ExaSearchOptions = {
        numResults: params.numResults || 5,
        highlights: true
      };
      
      const response = await this.client.search(params.query, options);
      
      // Log the response type and structure for debugging
      console.log('Raw Exa response type:', typeof response);
      console.log('Raw Exa response structure:', JSON.stringify(response, null, 2));
      
      // Handle different response formats
      let results: any[] = [];
      
      if (!response) {
        throw new Error('Empty response from Exa API');
      }
      
      if (Array.isArray(response)) {
        // Response is already an array of results
        results = response;
      } else if (typeof response === 'object' && response !== null) {
        // Try to extract results from the response object
        // Check common properties where results might be stored
        const possibleResultsProps = ['results', 'documents', 'items', 'content'];
        
        for (const prop of possibleResultsProps) {
          if (Array.isArray((response as any)[prop])) {
            results = (response as any)[prop];
            console.log(`Found results in '${prop}' property`);
            break;
          }
        }
      }
      
      if (results.length === 0) {
        console.error('Could not extract results from Exa response:', response);
        throw new Error('Invalid response format from Exa API');
      }
      
      console.log(`Processing ${results.length} results from Exa`);
      
      return results.map((result: ExaResult) => ({
        title: result.title || 'No title',
        url: result.url || '#',
        snippet: result.text || result.excerpt || 'No content available'
      }));
    } catch (error) {
      console.error('Exa search error:', error);
      throw new Error(`Exa search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
