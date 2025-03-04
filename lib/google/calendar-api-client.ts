import { GoogleCalendarClient } from './calendar-client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { Session } from 'next-auth';

// Extend the Session type to include our custom properties
interface ExtendedSession extends Session {
  accessToken?: string;
  refreshToken?: string;
}

// Initialize the client with API keys from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
// The email associated with the refresh token
const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || '';

// Check if all required environment variables are set
if (!GOOGLE_CLIENT_ID) {
  console.error('Missing GOOGLE_CLIENT_ID environment variable');
}

if (!GOOGLE_CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_SECRET environment variable');
}

if (!GOOGLE_REFRESH_TOKEN) {
  console.error('Missing GOOGLE_REFRESH_TOKEN environment variable');
}

// Create a singleton instance of the GoogleCalendarClient for the static refresh token
let staticCalendarClient: GoogleCalendarClient | null = null;

// Cache for session-based calendar clients
const sessionCalendarClients = new Map<string, GoogleCalendarClient>();

/**
 * Get a calendar client using the static refresh token from environment variables
 * This is a fallback and should be avoided in favor of session-based authentication
 */
export function getStaticCalendarClient(): GoogleCalendarClient {
  if (!staticCalendarClient) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      throw new Error('Missing Google Calendar credentials. Please check your environment variables.');
    }
    
    console.log('Creating calendar client with static refresh token');
    
    // If we have the email associated with the refresh token, use it as the calendar ID
    const calendarId = GOOGLE_EMAIL ? GOOGLE_EMAIL : 'primary';
    console.log(`Using calendar ID: ${calendarId}`);
    
    staticCalendarClient = new GoogleCalendarClient(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN,
      undefined, // No access token for static client
      calendarId
    );
  }
  
  return staticCalendarClient;
}

/**
 * Get a calendar client using the user's session tokens
 * This is the preferred method as it ensures operations are performed on the user's calendar
 * @param req Optional request object that might contain a session
 */
export async function getSessionCalendarClient(req?: Request): Promise<GoogleCalendarClient> {
  try {
    // Try to get the user's session from the request or from getServerSession
    let session: ExtendedSession | null = null;
    
    // Check if the request has a session attached
    if (req && (req as any).session) {
      session = (req as any).session as ExtendedSession;
      console.log('Using session from request object');
    } else {
      // Otherwise, get the session from NextAuth
      session = await getServerSession(authOptions) as ExtendedSession | null;
      console.log('Using session from getServerSession');
    }
    
    if (session?.refreshToken && session?.user?.email) {
      const sessionId = session.user.email;
      
      // Check if we already have a client for this session
      if (!sessionCalendarClients.has(sessionId)) {
        console.log('Creating new calendar client with user session tokens');
        console.log(`Using user email as calendar ID: ${sessionId}`);
        
        // Create a new client with the user's tokens and email as calendar ID
        const client = new GoogleCalendarClient(
          GOOGLE_CLIENT_ID!,
          GOOGLE_CLIENT_SECRET!,
          session.refreshToken,
          session.accessToken,
          sessionId // Use the user's email as the calendar ID
        );
        
        // Cache the client
        sessionCalendarClients.set(sessionId, client);
      }
      
      return sessionCalendarClients.get(sessionId)!;
    }
    
    // Fallback to static client if no session is available
    console.warn('No user session found, falling back to static calendar client');
    return getStaticCalendarClient();
  } catch (error) {
    console.error('Error getting session calendar client:', error);
    
    // Fallback to static client
    console.warn('Error with session, falling back to static calendar client');
    return getStaticCalendarClient();
  }
}

/**
 * Get the appropriate calendar client based on context
 * This is the main function that should be used by API routes
 */
export function getCalendarClient(): GoogleCalendarClient {
  // For now, we'll use the static client to avoid breaking existing code
  // In a real-world scenario, we would want to use the session client
  // but that would require making all the API routes async
  return getStaticCalendarClient();
}
