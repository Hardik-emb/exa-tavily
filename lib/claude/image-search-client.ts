import Anthropic from '@anthropic-ai/sdk';
import { OpenAIClient } from '@/lib/openai/client';
import { TavilyClient } from '@/lib/tavily/client';
import { SearchResult, GeneratedImage } from '@/types';
import { imageAndSearchTools } from '@/lib/claude/tools';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  generatedImages?: GeneratedImage[];
  searchResults?: SearchResult[];
}

// Define types for Anthropic API messages with tool use
type TextContent = { type: 'text'; text: string };
type ToolUseContent = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ToolResultContent = { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: string;
  content: string | (TextContent | ToolUseContent | ToolResultContent)[];
}

export class ClaudeImageSearchClient {
  private client: Anthropic;
  private openaiClient: OpenAIClient;
  private tavilyClient: TavilyClient;

  constructor(claudeApiKey: string, openaiApiKey: string, tavilyApiKey: string) {
    if (!claudeApiKey) {
      throw new Error('Claude API key is required');
    }
    this.client = new Anthropic({
      apiKey: claudeApiKey
    });
    this.openaiClient = new OpenAIClient(openaiApiKey);
    this.tavilyClient = new TavilyClient(tavilyApiKey);
  }

  async chat(messages: ChatMessage[], maxTokens: number = 1024): Promise<ChatMessage> {
    try {
      console.log('Sending chat request to Claude with image generation and search tools');
      
      // Initialize variables for results
      let generatedImage: GeneratedImage | null = null;
      let searchResults: SearchResult[] = [];
      let finalResponseText = '';
      
      // Format messages for Claude API
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Make the initial request with tool definitions
      let response = await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        messages: formattedMessages,
        tools: imageAndSearchTools as any, // Use type assertion to bypass TypeScript type checking
        tool_choice: { type: "auto" }
      });
      
      console.log('Claude response with image and search tools:', response);
      
      // Process all tool uses
      let currentMessages: AnthropicMessage[] = [...formattedMessages];
      let hasMoreToolUses = response.content.some(block => block.type === 'tool_use');
      
      while (hasMoreToolUses) {
        // Find the tool use block
        const toolUseBlock = response.content.find(block => block.type === 'tool_use');
        
        if (toolUseBlock && toolUseBlock.type === 'tool_use') {
          // Handle image generation tool
          if (toolUseBlock.name === 'generate_image') {
            // Type assertion for the input
            const input = toolUseBlock.input as { 
              prompt: string; 
              size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
              style?: 'vivid' | 'natural';
            };
            
            console.log('Claude is using image generation tool with prompt:', input.prompt);
            
            // Generate the image
            try {
              const imgResult = await this.openaiClient.generateImage({
                prompt: input.prompt,
                size: input.size,
                style: input.style
              });
              
              console.log('Image generation successful, URL:', imgResult.url);
              
              // Store the generated image
              generatedImage = imgResult;
              
              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                ...currentMessages,
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
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
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify(generatedImage)
                    },
                    {
                      type: "text" as const,
                      text: "The image has been generated successfully. Please provide a response that incorporates this image."
                    }
                  ]
                }
              ];
              
              // Update current messages for potential next tool use
              currentMessages = messagesWithToolUse;
              
              // Send the image generation result back to Claude
              response = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any // Use type assertion to bypass TypeScript type checking
              });
              
              // Check if there are more tool uses
              hasMoreToolUses = response.content.some(block => block.type === 'tool_use');
              
              // If no more tool uses, capture the final response text
              if (!hasMoreToolUses) {
                const textContent = response.content.find(block => block.type === 'text');
                finalResponseText = textContent && textContent.type === 'text' && textContent.text.trim() 
                  ? textContent.text 
                  : "I've generated the image based on your description.";
              }
              
            } catch (imageError) {
              console.error('Image generation failed, using fallback:', imageError);
              
              // Provide fallback response
              return {
                role: 'assistant',
                content: `I'm sorry, I wasn't able to generate the image you requested. The error was: ${imageError instanceof Error ? imageError.message : String(imageError)}. Please try again with a different description.`
              };
            }
          }
          
          // Handle Tavily search tool
          else if (toolUseBlock.name === 'tavily_search') {
            // Type assertion for the input
            const input = toolUseBlock.input as { query: string; num_results?: number };
            
            console.log('Claude is using Tavily search tool with query:', input.query);
            
            // Perform the search with fallback
            try {
              const searchData = await this.tavilyClient.search({
                query: input.query,
                numResults: input.num_results || 5
              });
              
              console.log(`Tavily search returned ${searchData.length} results`);
              
              // Store the search results
              searchResults = searchData;
              
              // Log the search results for debugging
              console.log('Tavily search results to send back to Claude:', JSON.stringify(searchResults, null, 2));
              
              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                ...currentMessages,
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
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
                      type: "tool_result" as const,
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
              
              // Update current messages for potential next tool use
              currentMessages = messagesWithToolUse;
              
              // Send the search results back to Claude
              response = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any // Use type assertion to bypass TypeScript type checking
              });
              
              // Check if there are more tool uses
              hasMoreToolUses = response.content.some(block => block.type === 'tool_use');
              
              // If no more tool uses, capture the final response text
              if (!hasMoreToolUses) {
                const textContent = response.content.find(block => block.type === 'text');
                finalResponseText = textContent && textContent.type === 'text' && textContent.text.trim() 
                  ? textContent.text 
                  : "Here are the search results for your query. Please review them for the information you're looking for.";
              }
              
            } catch (searchError) {
              console.error('Tavily search failed, using fallback:', searchError);
              
              // Provide fallback results
              searchResults = [
                {
                  title: 'Search Error',
                  url: '#',
                  snippet: `Unable to perform search for "${input.query}". Please try again later or rephrase your query.`
                }
              ];
              
              // If this is the only tool use, set final response text
              if (!finalResponseText) {
                finalResponseText = `I'm sorry, I wasn't able to search for "${input.query}". Please try again later or rephrase your query.`;
              }
            }
          }
        } else {
          // No valid tool use block found, break the loop
          hasMoreToolUses = false;
        }
      }
      
      // If no tool was used, get the response text
      if (!finalResponseText) {
        const textContent = response.content.find(block => block.type === 'text');
        finalResponseText = textContent && textContent.type === 'text' ? textContent.text : '';
      }
      
      // Return the final response with results
      return {
        role: 'assistant',
        content: finalResponseText,
        generatedImages: generatedImage ? [generatedImage] : undefined,
        searchResults: searchResults.length > 0 ? searchResults : undefined
      };
    } catch (error) {
      console.error('Claude chat with image and search tools error:', error);
      
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
      
      throw new Error(`Claude chat with image and search tools failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
