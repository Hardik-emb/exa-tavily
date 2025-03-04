import { NextResponse } from 'next/server';
import { ClaudeCalendarClient, ChatMessage } from '@/lib/claude/calendar-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Session } from 'next-auth';

// Extend the Session type to include our custom properties
interface ExtendedSession extends Session {
  accessToken?: string;
  refreshToken?: string;
}

// Initialize the client with API key from environment variables
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

if (!CLAUDE_API_KEY) {
  console.error('Missing CLAUDE_API_KEY environment variable');
}

const claudeCalendarClient = new ClaudeCalendarClient(CLAUDE_API_KEY || '');

export async function POST(request: Request) {
  try {
    // Check if the user is authenticated
    const session = await getServerSession(authOptions) as ExtendedSession | null;
    
    if (!session) {
      console.error('User not authenticated');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
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
    
    // Log session info for debugging
    console.log('User session:', {
      email: session.user?.email,
      hasAccessToken: !!session.accessToken,
      hasRefreshToken: !!session.refreshToken
    });
    
    // Store the session in the request context for use by the calendar client
    (request as any).session = session;
    
    // Extract messages from the request
    const messages: ChatMessage[] = body.messages;
    const maxTokens = body.maxTokens || 1024;
    
    console.log('Processing chat-calendar request with', messages.length, 'messages');
    
    // Send the chat request to Claude with calendar tools
    const response = await claudeCalendarClient.chat(messages, maxTokens, request);
    
    console.log('Chat response received from Claude with calendar tools');
    
    // Return the response
    return NextResponse.json({ 
      success: true, 
      data: response,
      meta: {
        messageCount: messages.length,
        hasCalendarEvents: !!response.calendarEvents
      }
    });
  } catch (error) {
    // Log the error
    console.error('Chat-Calendar API error:', error);
    
    // Return an error response
    const errorMessage = error instanceof Error ? error.message : 'Chat failed';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
