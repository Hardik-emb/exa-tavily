import { NextResponse } from 'next/server';
import { ClaudeToggleClient } from '@/lib/claude/toggle-client';
import { ChatMessage } from '@/lib/claude/toggle-client';

// Initialize the Claude-Toggle client with API keys from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('Missing CLAUDE_API_KEY environment variable');
}

if (!TAVILY_API_KEY) {
  console.error('Missing TAVILY_API_KEY environment variable');
}

const claudeToggleClient = new ClaudeToggleClient(CLAUDE_API_KEY || '', TAVILY_API_KEY || '');

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
    
    // Extract messages and web search toggle state from the request
    const messages: ChatMessage[] = body.messages;
    const maxTokens = body.maxTokens || 1024;
    const webSearchEnabled = body.webSearchEnabled || false;
    
    console.log(`Processing chat-toggle request with ${messages.length} messages, web search ${webSearchEnabled ? 'enabled' : 'disabled'}`);
    
    // Send the chat request to Claude with toggle state
    const response = await claudeToggleClient.chat(messages, maxTokens, webSearchEnabled);
    
    console.log(`Chat response received from Claude with web search ${webSearchEnabled ? 'enabled' : 'disabled'}`);
    
    // Return the response
    return NextResponse.json({ 
      success: true, 
      data: response,
      meta: {
        messageCount: messages.length,
        hasSearchResults: !!response.searchResults,
        webSearchEnabled: webSearchEnabled
      }
    });
  } catch (error) {
    // Log the error
    console.error('Chat-Toggle API error:', error);
    
    // Return an error response
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
