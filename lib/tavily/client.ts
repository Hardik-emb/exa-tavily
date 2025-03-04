import axios from 'axios';
import { SearchQuery, SearchResult } from '@/types';

interface TavilySearchResponse {
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score?: number;
    published_date?: string;
  }>;
  query: string;
  search_id?: string;
  answer_metadata?: {
    type: string;
    sources: string[];
  };
}

export class TavilyClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.tavily.com/search';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // 1 second minimum between requests

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Tavily API key is required');
    }
    this.apiKey = apiKey;
    console.log('Tavily client initialized with API key:', this.apiKey.substring(0, 10) + '...');
  }

  async search(params: SearchQuery): Promise<SearchResult[]> {
    try {
      // Rate limiting - ensure we don't send requests too quickly
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        const delay = this.minRequestInterval - timeSinceLastRequest;
        console.log(`Rate limiting: Waiting ${delay}ms before next Tavily request`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log('Searching Tavily with query:', params.query);
      console.log('Using Tavily API key:', this.apiKey.substring(0, 10) + '...');
      
      this.lastRequestTime = Date.now();
      
      const requestBody = {
        query: params.query,
        search_depth: "advanced",
        include_answer: true,
        include_images: false,
        include_raw_content: false,
        max_results: params.numResults || 10
      };
      
      console.log('Tavily request body:', JSON.stringify(requestBody));
      
      const response = await axios.post<TavilySearchResponse>(
        this.baseUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      console.log(`Tavily search returned ${response.data.results.length} results`);
      
      // Map Tavily results to our SearchResult interface
      return response.data.results.map(result => ({
        title: result.title || 'No title',
        url: result.url || '#',
        snippet: result.content || 'No content available'
      }));
    } catch (error) {
      console.error('Tavily search error:', error);
      
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        
        if (error.response?.status === 401) {
          console.error('Authentication error: Invalid API key or unauthorized access');
        } else if (error.response?.status === 429) {
          console.error('Rate limit exceeded: Too many requests to Tavily API');
        }
      }
      
      throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
