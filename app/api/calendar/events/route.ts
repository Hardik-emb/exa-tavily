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
    
    // Get the calendar client (now always session-based)
    const calendarClient = await getCalendarClient(request);
    console.log('Using session-based calendar client for listing events');
    
    // List events
    const events = await calendarClient.listEvents(days, maxResults);
    
    // Return events
    return NextResponse.json({ 
      success: true, 
      data: events 
    });
  } catch (error) {
    console.error('Error listing calendar events:', error);
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
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
    
    // Get the calendar client (now always session-based)
    const calendarClient = await getCalendarClient(request);
    console.log('Using session-based calendar client for creating event');
    
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
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('Authentication required')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create calendar event' 
      },
      { status: 500 }
    );
  }
}
