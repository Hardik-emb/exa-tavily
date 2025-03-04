import { NextResponse } from 'next/server';
import { ClaudeTavilyClient } from '@/lib/claude/tavily-client';
import { ChatMessage } from '@/lib/claude/tavily-client';

// Initialize the Claude-Tavily client with API keys from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('Missing CLAUDE_API_KEY environment variable');
}

if (!TAVILY_API_KEY) {
  console.error('Missing TAVILY_API_KEY environment variable');
}

const claudeTavilyClient = new ClaudeTavilyClient(CLAUDE_API_KEY || '', TAVILY_API_KEY || '');

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate the request body
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      console.error('Invalid chat request:', body);
      return NextResponse.json(
        { success: false, error: 'Invalid chat request' },
        { status: 400 }
      );
    }
    
    // Extract messages from the request
    const messages: ChatMessage[] = body.messages;
    const maxTokens = body.maxTokens || 1024;
    
    console.log('Processing chat-tavily request with', messages.length, 'messages');
    
    // Send the chat request to Claude with Tavily
    const response = await claudeTavilyClient.chat(messages, maxTokens);
    
    console.log('Chat response received from Claude with Tavily');
    
    // Return the response
    return NextResponse.json({ 
      success: true, 
      data: response,
      meta: {
        messageCount: messages.length,
        hasSearchResults: !!response.searchResults
      }
    });
  } catch (error) {
    // Log the error
    console.error('Chat-Tavily API error:', error);
    
    // Return an error response
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
