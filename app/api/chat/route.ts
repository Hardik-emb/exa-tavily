import { NextResponse } from 'next/server';
import { ClaudeClient } from '@/lib/claude/client';
import { ChatMessage } from '@/lib/claude/client';

// Initialize the Claude client with API keys from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const EXA_API_KEY = process.env.EXA_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('Missing CLAUDE_API_KEY environment variable');
}

if (!EXA_API_KEY) {
  console.error('Missing EXA_API_KEY environment variable');
}

const claudeClient = new ClaudeClient(CLAUDE_API_KEY || '', EXA_API_KEY || '');

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
    
    console.log('Processing chat request with', messages.length, 'messages');
    
    // Send the chat request to Claude
    const response = await claudeClient.chat(messages, maxTokens);
    
    console.log('Chat response received from Claude');
    
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
    console.error('Chat API error:', error);
    
    // Return an error response
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
