import Anthropic from '@anthropic-ai/sdk';
import { ExaClient } from '@/lib/exa/client';
import { SearchResult } from '@/types';
import { exaTools } from '@/lib/claude/tools';

// Initialize the Anthropic client with API key from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('Missing CLAUDE_API_KEY environment variable');
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  searchResults?: SearchResult[];
}

export class ClaudeClient {
  private client: Anthropic;
  private exaClient: ExaClient;

  constructor(apiKey: string, exaApiKey: string) {
    if (!apiKey) {
      throw new Error('Claude API key is required');
    }
    this.client = new Anthropic({
      apiKey: apiKey
    });
    this.exaClient = new ExaClient(exaApiKey);
  }

  async chat(messages: ChatMessage[], maxTokens: number = 1024): Promise<ChatMessage> {
    try {
      console.log('Sending chat request to Claude');
      
      // Format messages for Claude API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Make the initial request with tool definitions
      const response = await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        messages: formattedMessages,
        tools: exaTools as any, // Use type assertion to bypass TypeScript type checking
        tool_choice: { type: "auto" }
      });
      
      console.log('Claude response:', response);
      
      // Check if Claude wants to use a tool
      const hasToolUse = response.content.some(block => block.type === 'tool_use');
      
      if (hasToolUse) {
        // Find the tool use block
        const toolUseBlock = response.content.find(block => block.type === 'tool_use');
        
        if (toolUseBlock && toolUseBlock.type === 'tool_use') {
          // Handle Exa search tool
          if (toolUseBlock.name === 'exa_search') {
            // Type assertion for the input
            const input = toolUseBlock.input as { query: string; num_results?: number };
            
            console.log('Claude is using Exa search tool with query:', input.query);
            
            // Perform the search
            const searchResults = await this.exaClient.search({
              query: input.query,
              numResults: input.num_results || 5
            });
            
            console.log(`Exa search returned ${searchResults.length} results`);
            
            // Log the search results for debugging
            console.log('Search results to send back to Claude:', JSON.stringify(searchResults, null, 2));
            
            // Create a new array of messages to send back to Claude
            // Ensure all messages have the correct format
            const messagesWithToolUse = [
              ...formattedMessages,
              {
                role: "assistant",
                content: [
                  {
                    type: "tool_use" as const, // Use const assertion to ensure correct type
                    id: toolUseBlock.id,
                    name: toolUseBlock.name,
                    input: toolUseBlock.input as Record<string, unknown>
                  }
                ]
              },
              {
                role: "user",
                content: [
                  { 
                    type: "tool_result" as const, // Use const assertion to ensure correct type
                    tool_use_id: toolUseBlock.id,
                    content: JSON.stringify(searchResults)
                  },
                  {
                    type: "text" as const,
                    text: "Please provide a comprehensive response that incorporates information from these search results. Include a detailed explanation or summary before listing the search results."
                  }
                ]
              }
            ];
            
            // Log the messages being sent to Claude for debugging
            console.log('Messages being sent to Claude:', JSON.stringify(messagesWithToolUse.map(msg => ({
              role: msg.role,
              contentType: Array.isArray(msg.content) ? msg.content.map(c => c.type) : 'string'
            })), null, 2));
            
            // Send the search results back to Claude
            const toolResponse = await this.client.messages.create({
              model: "claude-3-7-sonnet-20250219",
              max_tokens: maxTokens,
              messages: messagesWithToolUse as any // Use type assertion to bypass TypeScript type checking
            });
          
            // Return the final response with search results
            const textContent = toolResponse.content.find(block => block.type === 'text');
            const responseText = textContent && textContent.type === 'text' && textContent.text.trim() 
              ? textContent.text 
              : "Here are the search results for your query. Please review them for the information you're looking for.";
            
            return {
              role: 'assistant',
              content: responseText,
              searchResults: searchResults
            };
          }
        }
      }
      
      // Return the response if no tool was used
      const textContent = response.content.find(block => block.type === 'text');
      return {
        role: 'assistant',
        content: textContent && textContent.type === 'text' ? textContent.text : ''
      };
    } catch (error) {
      console.error('Claude chat error:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        
        // If it's an API error from Anthropic, log more details
        if ('status' in error && 'response' in error) {
          try {
            const responseData = (error as any).response?.data;
            console.error('API error details:', {
              status: (error as any).status,
              responseData
            });
          } catch (e) {
            console.error('Could not parse API error details');
          }
        }
      }
      
      throw new Error(`Claude chat failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
