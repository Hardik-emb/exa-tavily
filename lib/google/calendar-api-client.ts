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

// Check if required environment variables are set
if (!GOOGLE_CLIENT_ID) {
  console.error('Missing GOOGLE_CLIENT_ID environment variable');
}

if (!GOOGLE_CLIENT_SECRET) {
  console.error('Missing GOOGLE_CLIENT_SECRET environment variable');
}

// Cache for session-based calendar clients
const sessionCalendarClients = new Map<string, GoogleCalendarClient>();

/**
 * Get a calendar client using static refresh token
 * This method is completely removed and will throw an error if called
 * @deprecated This method is no longer available. The application now exclusively uses session-based authentication.
 */
export function getStaticCalendarClient(): GoogleCalendarClient {
  throw new Error('Static calendar client is no longer supported. The application now exclusively uses session-based authentication.');
}

/**
 * Get a calendar client using the user's session tokens
 * This is the only supported authentication method in the application
 * It ensures operations are performed on the user's own calendar using their OAuth credentials
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
    
    // Instead of falling back to static client, throw an error
    throw new Error('Authentication required: Please sign in to access calendar features.');
  } catch (error) {
    console.error('Error getting session calendar client:', error);
    
    // Instead of falling back to static client, propagate the error
    if (error instanceof Error && error.message.includes('Authentication required')) {
      throw error;
    }
    
    throw new Error('Authentication required: Please sign in to access calendar features.');
  }
}

/**
 * Get a calendar client for the current user
 * This is the main entry point that should be used by all API routes and services
 * It always uses session-based authentication with the user's OAuth credentials
 * 
 * @param req Optional request object that might contain a session
 * @returns A GoogleCalendarClient instance authenticated with the user's credentials
 * @throws Error if the user is not authenticated
 */
export async function getCalendarClient(req?: Request): Promise<GoogleCalendarClient> {
  return getSessionCalendarClient(req);
}
