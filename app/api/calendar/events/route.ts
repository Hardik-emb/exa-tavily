import { NextResponse } from 'next/server';
import { getCalendarClient, getSessionCalendarClient } from '@/lib/google/calendar-api-client';
import { CalendarEvent } from '@/lib/google/calendar-client';

// GET /api/calendar/events - List events
export async function GET(request: Request) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    const maxResults = parseInt(url.searchParams.get('maxResults') || '10', 10);
    
    // Try to get the session-based calendar client first
    let calendarClient;
    try {
      calendarClient = await getSessionCalendarClient(request);
      console.log('Using session-based calendar client for listing events');
    } catch (error) {
      console.warn('Failed to get session calendar client, falling back to static client:', error);
      calendarClient = getCalendarClient();
      console.log('Using static calendar client for listing events');
    }
    
    // List events
    const events = await calendarClient.listEvents(days, maxResults);
    
    // Return events
    return NextResponse.json({ 
      success: true, 
      data: events 
    });
  } catch (error) {
    console.error('Error listing calendar events:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list calendar events' 
      },
      { status: 500 }
    );
  }
}

// POST /api/calendar/events - Create event
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate request body
    if (!body.summary || !body.start || !body.end) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: summary, start, end' 
        },
        { status: 400 }
      );
    }
    
    // Create event object
    const event: CalendarEvent = {
      summary: body.summary,
      description: body.description,
      location: body.location,
      start: body.start,
      end: body.end,
      reminders: body.reminders
    };
    
    // Try to get the session-based calendar client first
    let calendarClient;
    try {
      calendarClient = await getSessionCalendarClient(request);
      console.log('Using session-based calendar client for creating event');
    } catch (error) {
      console.warn('Failed to get session calendar client, falling back to static client:', error);
      calendarClient = getCalendarClient();
      console.log('Using static calendar client for creating event');
    }
    
    // Create event
    const createdEvent = await calendarClient.createEvent(event);
    
    // Log the created event for debugging
    console.log('Event created successfully:', {
      id: createdEvent.id,
      summary: createdEvent.summary,
      start: createdEvent.start,
      end: createdEvent.end,
      calendarId: 'primary' // The calendar ID used in the client
    });
    
    // Return created event
    return NextResponse.json({ 
      success: true, 
      data: createdEvent 
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      },
      { status: 500 }
    );
  }
}
