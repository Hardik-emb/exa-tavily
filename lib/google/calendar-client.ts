import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
}

export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;
  // The calendar ID to use for all operations
  private calendarId: string;
  
  constructor(clientId: string, clientSecret: string, refreshToken: string, accessToken?: string, calendarId: string = 'primary') {
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google Calendar client requires clientId, clientSecret, and refreshToken');
    }
    
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    
    // Set credentials based on what's available
    const credentials: { refresh_token: string; access_token?: string } = { 
      refresh_token: refreshToken 
    };
    
    // Add access token if provided
    if (accessToken) {
      credentials.access_token = accessToken;
    }
    
    this.oauth2Client.setCredentials(credentials);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.calendarId = calendarId;
    
    console.log(`Calendar client initialized with calendar ID: ${this.calendarId}`);
  }
  
  /**
   * List upcoming events from the user's primary calendar
   * @param days Number of days to look ahead
   * @param maxResults Maximum number of events to return
   * @returns List of calendar events
   */
  async listEvents(days: number = 7, maxResults: number = 10): Promise<CalendarEvent[]> {
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      
      const future = new Date();
      future.setDate(future.getDate() + days);
      const timeMax = future.toISOString();
      
      console.log(`Listing events from ${timeMin} to ${timeMax} (${days} days) from calendar ID: ${this.calendarId}`);
      
      const response = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      console.log(`Found ${response.data.items?.length || 0} events`);
      
      return (response.data.items || []).map(event => ({
        id: event.id || undefined,
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        location: event.location || undefined,
        start: event.start as { dateTime: string; timeZone?: string },
        end: event.end as { dateTime: string; timeZone?: string },
        reminders: event.reminders ? {
          useDefault: event.reminders.useDefault || true,
          overrides: event.reminders.overrides?.map(override => ({
            method: override.method || 'popup',
            minutes: override.minutes || 10
          }))
        } : undefined
      }));
    } catch (error) {
      console.error('Error listing calendar events:', error);
      throw new Error(`Failed to list calendar events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Create a new event in the user's primary calendar
   * @param event Event details
   * @returns Created event
   */
  async createEvent(event: CalendarEvent): Promise<CalendarEvent> {
    try {
      console.log(`Creating event "${event.summary}" in calendar ID: ${this.calendarId}`);
      
      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          reminders: event.reminders || {
            useDefault: true
          }
        }
      });
      
      console.log(`Event created successfully with ID: ${response.data.id}`);
      
      return {
        id: response.data.id || undefined,
        summary: response.data.summary || 'Untitled Event',
        description: response.data.description || undefined,
        location: response.data.location || undefined,
        start: response.data.start as { dateTime: string; timeZone?: string },
        end: response.data.end as { dateTime: string; timeZone?: string },
        reminders: response.data.reminders ? {
          useDefault: response.data.reminders.useDefault || true,
          overrides: response.data.reminders.overrides?.map(override => ({
            method: override.method || 'popup',
            minutes: Number(override.minutes) || 10
          }))
        } : undefined
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Delete an event from the user's primary calendar
   * @param eventId ID of the event to delete
   * @returns True if successful
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      console.log(`Deleting event with ID: ${eventId} from calendar ID: ${this.calendarId}`);
      
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId
      });
      
      console.log(`Event deleted successfully`);
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error(`Failed to delete calendar event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Update an existing event in the user's primary calendar
   * @param eventId ID of the event to update
   * @param event Updated event details
   * @returns Updated event
   */
  async updateEvent(eventId: string, event: CalendarEvent): Promise<CalendarEvent> {
    try {
      console.log(`Updating event with ID: ${eventId} in calendar ID: ${this.calendarId}`);
      
      const response = await this.calendar.events.update({
        calendarId: this.calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: event.start,
          end: event.end,
          reminders: event.reminders
        }
      });
      
      console.log(`Event updated successfully`);
      
      return {
        id: response.data.id || undefined,
        summary: response.data.summary || 'Untitled Event',
        description: response.data.description || undefined,
        location: response.data.location || undefined,
        start: response.data.start as { dateTime: string; timeZone?: string },
        end: response.data.end as { dateTime: string; timeZone?: string },
        reminders: response.data.reminders ? {
          useDefault: response.data.reminders.useDefault || true,
          overrides: response.data.reminders.overrides?.map(override => ({
            method: override.method || 'popup',
            minutes: Number(override.minutes) || 10
          }))
        } : undefined
      };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error(`Failed to update calendar event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
