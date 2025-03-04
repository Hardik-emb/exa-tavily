import { NextResponse } from 'next/server';
import { getCalendarClient, getSessionCalendarClient } from '@/lib/google/calendar-api-client';
import { CalendarEvent } from '@/lib/google/calendar-client';

// GET /api/calendar/events/[id] - Get a specific event
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get event ID from params
    const eventId = params.id;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Try to get the session-based calendar client first
    let calendarClient;
    try {
      calendarClient = await getSessionCalendarClient(request);
      console.log('Using session-based calendar client for getting event');
    } catch (error) {
      console.warn('Failed to get session calendar client, falling back to static client:', error);
      calendarClient = getCalendarClient();
      console.log('Using static calendar client for getting event');
    }
    
    // List events and find the specific one
    const events = await calendarClient.listEvents(30, 100); // Look ahead 30 days with a larger limit
    const event = events.find((e: CalendarEvent) => e.id === eventId);
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Return the event
    return NextResponse.json({ success: true, data: event });
  } catch (error) {
    console.error('Error getting calendar event:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get calendar event' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/calendar/events/[id] - Update an event
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get event ID from params
    const eventId = params.id;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
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
      console.log('Using session-based calendar client for updating event');
    } catch (error) {
      console.warn('Failed to get session calendar client, falling back to static client:', error);
      calendarClient = getCalendarClient();
      console.log('Using static calendar client for updating event');
    }
    
    // Update event
    const updatedEvent = await calendarClient.updateEvent(eventId, event);
    
    // Log the updated event for debugging
    console.log('Event updated successfully:', {
      id: updatedEvent.id,
      summary: updatedEvent.summary,
      start: updatedEvent.start,
      end: updatedEvent.end,
      calendarId: 'primary' // The calendar ID used in the client
    });
    
    // Return updated event
    return NextResponse.json({ success: true, data: updatedEvent });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update calendar event' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar/events/[id] - Delete an event
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get event ID from params
    const eventId = params.id;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Try to get the session-based calendar client first
    let calendarClient;
    try {
      calendarClient = await getSessionCalendarClient(request);
      console.log('Using session-based calendar client for deleting event');
    } catch (error) {
      console.warn('Failed to get session calendar client, falling back to static client:', error);
      calendarClient = getCalendarClient();
      console.log('Using static calendar client for deleting event');
    }
    
    // Delete event
    await calendarClient.deleteEvent(eventId);
    
    // Log the deletion for debugging
    console.log('Event deleted successfully:', {
      id: eventId,
      calendarId: 'primary' // The calendar ID used in the client
    });
    
    // Return success
    return NextResponse.json({ 
      success: true, 
      message: `Event ${eventId} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete calendar event' 
      },
      { status: 500 }
    );
  }
}
