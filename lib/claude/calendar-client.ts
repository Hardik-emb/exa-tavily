import Anthropic from '@anthropic-ai/sdk';
import { getCalendarClient, getSessionCalendarClient } from '@/lib/google/calendar-api-client';
import { CalendarEvent } from '@/lib/google/calendar-client';
import { calendarTools } from '@/lib/claude/tools';
import {
  parseNaturalDate,
  parseNaturalTime,
  parseNaturalDuration,
  calculateEndTime,
  formatDateForCalendar
} from '@/lib/claude/date-parser';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  calendarEvents?: CalendarEvent[];
}

export class ClaudeCalendarClient {
  private client: Anthropic;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Claude API key is required');
    }
    this.client = new Anthropic({
      apiKey: apiKey
    });
  }

  async chat(messages: ChatMessage[], maxTokens: number = 1024, request?: Request): Promise<ChatMessage> {
    try {
      console.log('Sending chat request to Claude with calendar tools');

      // Get current date information
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Format dates for the system prompt
      const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const tomorrowFormatted = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      // Create a system prompt with date information
      const systemPrompt = {
        role: "user" as const, // Use "user" role with system instructions
        content: `[SYSTEM INSTRUCTIONS]
Today's date is ${todayFormatted}. Tomorrow's date is ${tomorrowFormatted}. 
When creating or updating calendar events, always use current or future dates.
For references like "tomorrow", use ${tomorrowFormatted}.
For references like "next week", use dates that are 7 days from today.
Always format dates in ISO format (YYYY-MM-DD) with times in 24-hour format.
Examples:
- "tomorrow at 2pm" should be "${tomorrowFormatted}T14:00:00"
- "today at 5pm" should be "${todayFormatted}T17:00:00"
Never use dates from the past when creating calendar events.
[END SYSTEM INSTRUCTIONS]`
      };

      // Format messages for Claude API with system prompt
      const formattedMessages = [
        systemPrompt,
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Make the initial request with tool definitions
      const response = await this.client.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens,
        messages: formattedMessages,
        tools: calendarTools as any, // Use type assertion to bypass TypeScript type checking
        tool_choice: { type: "auto" }
      });

      console.log('Claude response with calendar tools:', response);

      // Check if Claude wants to use a tool
      const hasToolUse = response.content.some(block => block.type === 'tool_use');

      if (hasToolUse) {
        // Find the tool use block
        const toolUseBlock = response.content.find(block => block.type === 'tool_use');

        if (toolUseBlock && toolUseBlock.type === 'tool_use') {
          // Handle list_calendar_events tool
          if (toolUseBlock.name === 'list_calendar_events') {
            // Type assertion for the input
            const input = toolUseBlock.input as { days?: number; max_results?: number };

            console.log('Claude is using list_calendar_events tool with params:', input);

            try {
              // Get the calendar client (now always session-based)
              const calendarClient = await getCalendarClient(request);
              console.log('Using session-based calendar client for Claude tool');

              // List events
              const events = await calendarClient.listEvents(
                input.days || 7,
                input.max_results || 10
              );

              console.log(`Calendar returned ${events.length} events`);

              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                systemPrompt, // Include the system prompt again
                ...messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
                      id: toolUseBlock.id,
                      name: toolUseBlock.name,
                      input: toolUseBlock.input as Record<string, unknown>
                    }
                  ]
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify(events)
                    },
                    {
                      type: "text" as const,
                      text: "Here are your upcoming calendar events. Please provide a summary of these events."
                    }
                  ]
                }
              ];

              // Send the events back to Claude
              const toolResponse = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any
              });

              // Return the final response with events
              const textContent = toolResponse.content.find(block => block.type === 'text');
              const responseText = textContent && textContent.type === 'text' && textContent.text.trim()
                ? textContent.text
                : "Here are your upcoming calendar events.";

              return {
                role: 'assistant',
                content: responseText,
                calendarEvents: events
              };
            } catch (error) {
              // Handle authentication errors
              if (error instanceof Error && error.message.includes('Authentication required')) {
                return {
                  role: 'assistant',
                  content: "I need access to your Google Calendar to list your events. Please sign in with your Google account first."
                };
              }

              // Handle other errors
              console.error('Calendar client error:', error);
              throw error;
            }
          }

          // Handle create_calendar_event tool
          else if (toolUseBlock.name === 'create_calendar_event') {
            // Type assertion for the input
            const input = toolUseBlock.input as {
              summary: string;
              description?: string;
              location?: string;
              start_time: string;
              end_time: string;
              time_zone?: string;
              reminders?: { method: string; minutes: number }[];
            };

            console.log('Claude is using create_calendar_event tool with params:', input);

            try {
              // Get the calendar client (now always session-based)
              const calendarClient = await getCalendarClient(request);
              console.log('Using session-based calendar client for Claude tool');

              // Check if the start_time and end_time are valid ISO strings
              let startDateTime: string;
              let endDateTime: string;

              try {
                // Try to parse as ISO string
                const startDate = new Date(input.start_time);
                const endDate = new Date(input.end_time);

                // Check if dates are valid
                startDate.toISOString();
                endDate.toISOString();

                // Check if dates are in the past
                const now = new Date();
                const isPastDate = startDate < now;

                if (isPastDate) {
                  console.warn('Claude provided a past date:', {
                    providedDate: startDate.toISOString(),
                    currentDate: now.toISOString()
                  });

                  // If the date is in the past, try to interpret it as a natural language reference
                  throw new Error('Date is in the past');
                }

                // If no error and date is not in the past, use the provided times
                startDateTime = input.start_time;
                endDateTime = input.end_time;

                console.log('Using provided ISO date strings:', { startDateTime, endDateTime });
              } catch (error) {
                // If error, try to parse as natural language
                console.log('Parsing natural language dates:', {
                  start_time: input.start_time,
                  end_time: input.end_time
                });

                // Try to extract date and time components
                // Example: "tomorrow at 2pm"
                const startMatch = input.start_time.match(/(.+?)(?:\s+at\s+)(.+)/i);

                if (startMatch) {
                  const dateText = startMatch[1]; // "tomorrow"
                  const timeText = startMatch[2]; // "2pm"

                  // Parse the date and time
                  const startDate = parseNaturalDate(dateText);
                  const startWithTime = parseNaturalTime(startDate, timeText);

                  // Format as ISO string
                  startDateTime = formatDateForCalendar(startWithTime);

                  // If end_time is not provided or is relative to start_time
                  if (!input.end_time || input.end_time.toLowerCase().includes('hour')) {
                    // Default to 1 hour duration
                    const duration = input.end_time
                      ? parseNaturalDuration(input.end_time)
                      : 60; // 1 hour in minutes

                    const endDate = calculateEndTime(startWithTime, duration);
                    endDateTime = formatDateForCalendar(endDate);
                  } else {
                    // Try to parse end time the same way
                    const endMatch = input.end_time.match(/(.+?)(?:\s+at\s+)(.+)/i);

                    if (endMatch) {
                      const endDateText = endMatch[1];
                      const endTimeText = endMatch[2];

                      const endDate = parseNaturalDate(endDateText);
                      const endWithTime = parseNaturalTime(endDate, endTimeText);

                      endDateTime = formatDateForCalendar(endWithTime);
                    } else {
                      // If no match, assume it's just a time for the same day
                      const endWithTime = parseNaturalTime(startDate, input.end_time);
                      endDateTime = formatDateForCalendar(endWithTime);
                    }
                  }

                  console.log('Parsed natural language dates:', {
                    startDateTime,
                    endDateTime,
                    originalStart: input.start_time,
                    originalEnd: input.end_time
                  });
                } else {
                  // If no match, use the original values
                  startDateTime = input.start_time;
                  endDateTime = input.end_time;

                  console.log('Could not parse natural language dates, using original values:', {
                    startDateTime,
                    endDateTime
                  });
                }
              }

              // Create event object
              const event: CalendarEvent = {
                summary: input.summary,
                description: input.description,
                location: input.location,
                start: {
                  dateTime: startDateTime,
                  timeZone: input.time_zone || 'Asia/Kolkata'
                },
                end: {
                  dateTime: endDateTime,
                  timeZone: input.time_zone || 'Asia/Kolkata'
                }
              };

              // Add reminders if provided
              if (input.reminders && input.reminders.length > 0) {
                event.reminders = {
                  useDefault: false,
                  overrides: input.reminders.map(reminder => ({
                    method: reminder.method,
                    minutes: reminder.minutes
                  }))
                };
              }

              console.log('Creating event with the following details:', {
                summary: event.summary,
                start: event.start,
                end: event.end,
                location: event.location || 'Not specified',
                calendarClient: calendarClient ? 'Available' : 'Not available'
              });

              // Create event
              const createdEvent = await calendarClient.createEvent(event);

              // Log the created event details for debugging
              console.log('Event creation response:', {
                id: createdEvent.id,
                summary: createdEvent.summary,
                start: createdEvent.start,
                end: createdEvent.end,
                success: !!createdEvent.id
              });

              console.log('Event created successfully:', createdEvent);

              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                systemPrompt, // Include the system prompt again
                ...messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
                      id: toolUseBlock.id,
                      name: toolUseBlock.name,
                      input: toolUseBlock.input as Record<string, unknown>
                    }
                  ]
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify(createdEvent)
                    },
                    {
                      type: "text" as const,
                      text: "The event has been created successfully. Please provide a confirmation message."
                    }
                  ]
                }
              ];

              // Send the created event back to Claude
              const toolResponse = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any
              });

              // Return the final response with created event
              const textContent = toolResponse.content.find(block => block.type === 'text');
              const responseText = textContent && textContent.type === 'text' && textContent.text.trim()
                ? textContent.text
                : `Event "${input.summary}" has been created successfully.`;

              return {
                role: 'assistant',
                content: responseText,
                calendarEvents: [createdEvent]
              };
            } catch (error) {
              // Handle authentication errors
              if (error instanceof Error && error.message.includes('Authentication required')) {
                return {
                  role: 'assistant',
                  content: "I need access to your Google Calendar to create this event. Please sign in with your Google account first."
                };
              }

              // Handle other errors
              console.error('Calendar client error:', error);
              throw error;
            }
          }

          // Handle update_calendar_event tool
          else if (toolUseBlock.name === 'update_calendar_event') {
            // Type assertion for the input
            const input = toolUseBlock.input as { 
              event_id?: string;
              event_description?: string;
              match_criteria?: 'title' | 'datetime' | 'all';
              summary?: string;
              description?: string;
              location?: string;
              start_time?: string;
              end_time?: string;
              time_zone?: string;
            };
            
            console.log('Claude is using update_calendar_event tool with params:', input);
            
            try {
              // Get the calendar client (now always session-based)
              const calendarClient = await getCalendarClient(request);
              console.log('Using session-based calendar client for Claude tool');
              
              let eventId = input.event_id;
              let existingEvent: CalendarEvent | null = null;
              let matchedEvents: CalendarEvent[] = [];
              
              // If no event ID is provided, try to find the event by description
              if (!eventId && input.event_description) {
                console.log(`No event ID provided. Trying to find event by description: "${input.event_description}"`);
                
                // Get all upcoming events
                const events = await calendarClient.listEvents(30, 100); // Look ahead 30 days with a larger limit
                console.log(`Found ${events.length} upcoming events to search through`);
                
                // Match criteria (default to 'all' if not specified)
                const matchCriteria = input.match_criteria || 'all';
                console.log(`Using match criteria: ${matchCriteria}`);
                
                // Convert description to lowercase for case-insensitive matching
                const description = input.event_description.toLowerCase();
                
                // Extract potential date/time information from the description
                const dateTimeMatches = description.match(/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(st|nd|rd|th)?( of)? (january|february|march|april|may|june|july|august|september|october|november|december)/gi) || [];
                const timeMatches = description.match(/\d{1,2}(:\d{2})?\s*(am|pm)|morning|afternoon|evening|night/gi) || [];
                
                console.log('Extracted date/time information:', {
                  dates: dateTimeMatches,
                  times: timeMatches
                });
                
                // Filter events based on match criteria
                matchedEvents = events.filter(event => {
                  // Title matching
                  const titleMatch = event.summary.toLowerCase().includes(description) ||
                                    description.includes(event.summary.toLowerCase());
                  
                  // If only matching by title, return the result
                  if (matchCriteria === 'title') {
                    return titleMatch;
                  }
                  
                  // Date/time matching
                  let dateTimeMatch = false;
                  
                  // Convert event start time to Date object
                  const eventDate = new Date(event.start.dateTime);
                  const eventDateStr = eventDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  }).toLowerCase();
                  
                  const eventTimeStr = eventDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }).toLowerCase();
                  
                  // Check if any of the date/time matches are in the event date/time
                  const hasDateMatch = dateTimeMatches.some(match => 
                    eventDateStr.includes(match.toLowerCase())
                  );
                  
                  const hasTimeMatch = timeMatches.some(match => 
                    eventTimeStr.includes(match.toLowerCase())
                  );
                  
                  // If we have date or time matches in the description, check if they match the event
                  if (dateTimeMatches.length > 0 || timeMatches.length > 0) {
                    dateTimeMatch = hasDateMatch || hasTimeMatch;
                  } else {
                    // If no specific date/time in description, consider it a match
                    dateTimeMatch = true;
                  }
                  
                  // If only matching by datetime, return the result
                  if (matchCriteria === 'datetime') {
                    return dateTimeMatch;
                  }
                  
                  // For 'all' criteria, require both title and datetime match
                  return titleMatch && dateTimeMatch;
                });
                
                console.log(`Found ${matchedEvents.length} matching events:`, 
                  matchedEvents.map(e => ({
                    id: e.id,
                    summary: e.summary,
                    start: e.start.dateTime
                  }))
                );
                
                // If we found exactly one match, use it
                if (matchedEvents.length === 1) {
                  existingEvent = matchedEvents[0];
                  eventId = existingEvent.id;
                  console.log(`Found exactly one matching event: "${existingEvent.summary}" (${eventId})`);
                } 
                // If we found multiple matches, use the first one but log a warning
                else if (matchedEvents.length > 1) {
                  existingEvent = matchedEvents[0];
                  eventId = existingEvent.id;
                  console.log(`Found multiple matching events, using the first one: "${existingEvent.summary}" (${eventId})`);
                } 
                // If no matches, throw an error
                else {
                  throw new Error(`No events found matching description: "${input.event_description}"`);
                }
              } else if (eventId) {
                // If event ID is provided, get the event directly
                const events = await calendarClient.listEvents(30, 100);
                existingEvent = events.find((e: CalendarEvent) => e.id === eventId) || null;
                
                if (!existingEvent) {
                  throw new Error(`Event with ID ${eventId} not found`);
                }
              } else {
                // If neither event ID nor description is provided, throw an error
                throw new Error('No event ID or description provided for update');
              }

              // Process start and end times if provided
              let startDateTime = existingEvent.start.dateTime;
              let endDateTime = existingEvent.end.dateTime;

              if (input.start_time) {
                try {
                  // Try to parse as ISO string
                  const startDate = new Date(input.start_time);

                  // Check if date is valid
                  startDate.toISOString();

                  // Check if date is in the past
                  const now = new Date();
                  const isPastDate = startDate < now;

                  if (isPastDate) {
                    console.warn('Claude provided a past date for update:', {
                      providedDate: startDate.toISOString(),
                      currentDate: now.toISOString()
                    });

                    // If the date is in the past, try to interpret it as a natural language reference
                    throw new Error('Date is in the past');
                  }

                  // If no error and date is not in the past, use the provided time
                  startDateTime = input.start_time;
                } catch (error) {
                  // If error, try to parse as natural language
                  console.log('Parsing natural language start date:', input.start_time);

                  // Try to extract date and time components
                  const startMatch = input.start_time.match(/(.+?)(?:\s+at\s+)(.+)/i);

                  if (startMatch) {
                    const dateText = startMatch[1];
                    const timeText = startMatch[2];

                    // Parse the date and time
                    const startDate = parseNaturalDate(dateText);
                    const startWithTime = parseNaturalTime(startDate, timeText);

                    // Format as ISO string
                    startDateTime = formatDateForCalendar(startWithTime);

                    console.log('Parsed natural language start date:', {
                      original: input.start_time,
                      parsed: startDateTime
                    });
                  }
                }
              }

              if (input.end_time) {
                try {
                  // Try to parse as ISO string
                  const endDate = new Date(input.end_time);

                  // Check if date is valid
                  endDate.toISOString();

                  // Check if date is in the past
                  const now = new Date();
                  const isPastDate = endDate < now;

                  if (isPastDate) {
                    console.warn('Claude provided a past end date for update:', {
                      providedDate: endDate.toISOString(),
                      currentDate: now.toISOString()
                    });

                    // If the date is in the past, try to interpret it as a natural language reference
                    throw new Error('End date is in the past');
                  }

                  // If no error and date is not in the past, use the provided time
                  endDateTime = input.end_time;
                } catch (error) {
                  // If error, try to parse as natural language
                  console.log('Parsing natural language end date:', input.end_time);

                  // Try to extract date and time components
                  const endMatch = input.end_time.match(/(.+?)(?:\s+at\s+)(.+)/i);

                  if (endMatch) {
                    const dateText = endMatch[1];
                    const timeText = endMatch[2];

                    // Parse the date and time
                    const endDate = parseNaturalDate(dateText);
                    const endWithTime = parseNaturalTime(endDate, timeText);

                    // Format as ISO string
                    endDateTime = formatDateForCalendar(endWithTime);

                    console.log('Parsed natural language end date:', {
                      original: input.end_time,
                      parsed: endDateTime
                    });
                  } else if (input.end_time.toLowerCase().includes('hour')) {
                    // Handle duration-based end time
                    const duration = parseNaturalDuration(input.end_time);
                    const startDate = new Date(startDateTime);
                    const endDate = calculateEndTime(startDate, duration);

                    endDateTime = formatDateForCalendar(endDate);

                    console.log('Calculated end time from duration:', {
                      original: input.end_time,
                      duration,
                      parsed: endDateTime
                    });
                  }
                }
              }

              // Create updated event object
              const updatedEvent: CalendarEvent = {
                summary: input.summary || existingEvent.summary,
                description: input.description !== undefined ? input.description : existingEvent.description,
                location: input.location !== undefined ? input.location : existingEvent.location,
                start: {
                  dateTime: startDateTime,
                  timeZone: input.time_zone || existingEvent.start.timeZone
                },
                end: {
                  dateTime: endDateTime,
                  timeZone: input.time_zone || existingEvent.end.timeZone
                },
                reminders: existingEvent.reminders
              };

              // Update event - we've already validated that eventId is not undefined
              const result = await calendarClient.updateEvent(eventId as string, updatedEvent);

              console.log('Event updated successfully:', result);

              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                systemPrompt, // Include the system prompt again
                ...messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
                      id: toolUseBlock.id,
                      name: toolUseBlock.name,
                      input: toolUseBlock.input as Record<string, unknown>
                    }
                  ]
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify(result)
                    },
                    {
                      type: "text" as const,
                      text: "The event has been updated successfully. Please provide a confirmation message."
                    }
                  ]
                }
              ];

              // Send the updated event back to Claude
              const toolResponse = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any
              });

              // Return the final response with updated event
              const textContent = toolResponse.content.find(block => block.type === 'text');
              const responseText = textContent && textContent.type === 'text' && textContent.text.trim()
                ? textContent.text
                : `Event "${updatedEvent.summary}" has been updated successfully.`;

              return {
                role: 'assistant',
                content: responseText,
                calendarEvents: [result]
              };
            } catch (error) {
              // Handle authentication errors
              if (error instanceof Error && error.message.includes('Authentication required')) {
                return {
                  role: 'assistant',
                  content: "I need access to your Google Calendar to update this event. Please sign in with your Google account first."
                };
              }

              // Handle other errors
              console.error('Calendar client error:', error);
              throw error;
            }
          }

          // Handle delete_calendar_event tool
          else if (toolUseBlock.name === 'delete_calendar_event') {
            // Type assertion for the input
            const input = toolUseBlock.input as {
              event_id?: string;
              description?: string;
              match_criteria?: 'title' | 'datetime' | 'all';
            };

            console.log('Claude is using delete_calendar_event tool with params:', input);

            try {
              // Get the calendar client (now always session-based)
              const calendarClient = await getCalendarClient(request);
              console.log('Using session-based calendar client for Claude tool');

              let eventId = input.event_id;
              let eventToDelete: CalendarEvent | null = null;
              let matchedEvents: CalendarEvent[] = [];

              // If no event ID is provided, try to find the event by description
              if (!eventId && input.description) {
                console.log(`No event ID provided. Trying to find event by description: "${input.description}"`);

                // Get all upcoming events
                const events = await calendarClient.listEvents(30, 100); // Look ahead 30 days with a larger limit
                console.log(`Found ${events.length} upcoming events to search through`);

                // Match criteria (default to 'all' if not specified)
                const matchCriteria = input.match_criteria || 'all';
                console.log(`Using match criteria: ${matchCriteria}`);

                // Convert description to lowercase for case-insensitive matching
                const description = input.description.toLowerCase();

                // Extract potential date/time information from the description
                const dateTimeMatches = description.match(/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(st|nd|rd|th)?( of)? (january|february|march|april|may|june|july|august|september|october|november|december)/gi) || [];
                const timeMatches = description.match(/\d{1,2}(:\d{2})?\s*(am|pm)|morning|afternoon|evening|night/gi) || [];

                console.log('Extracted date/time information:', {
                  dates: dateTimeMatches,
                  times: timeMatches
                });

                // Filter events based on match criteria
                matchedEvents = events.filter(event => {
                  // Title matching
                  const titleMatch = event.summary.toLowerCase().includes(description) ||
                    description.includes(event.summary.toLowerCase());

                  // If only matching by title, return the result
                  if (matchCriteria === 'title') {
                    return titleMatch;
                  }

                  // Date/time matching
                  let dateTimeMatch = false;

                  // Convert event start time to Date object
                  const eventDate = new Date(event.start.dateTime);
                  const eventDateStr = eventDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  }).toLowerCase();

                  const eventTimeStr = eventDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  }).toLowerCase();

                  // Check if any of the date/time matches are in the event date/time
                  const hasDateMatch = dateTimeMatches.some(match =>
                    eventDateStr.includes(match.toLowerCase())
                  );

                  const hasTimeMatch = timeMatches.some(match =>
                    eventTimeStr.includes(match.toLowerCase())
                  );

                  // If we have date or time matches in the description, check if they match the event
                  if (dateTimeMatches.length > 0 || timeMatches.length > 0) {
                    dateTimeMatch = hasDateMatch || hasTimeMatch;
                  } else {
                    // If no specific date/time in description, consider it a match
                    dateTimeMatch = true;
                  }

                  // If only matching by datetime, return the result
                  if (matchCriteria === 'datetime') {
                    return dateTimeMatch;
                  }

                  // For 'all' criteria, require both title and datetime match
                  return titleMatch && dateTimeMatch;
                });

                console.log(`Found ${matchedEvents.length} matching events:`,
                  matchedEvents.map(e => ({
                    id: e.id,
                    summary: e.summary,
                    start: e.start.dateTime
                  }))
                );

                // If we found exactly one match, use it
                if (matchedEvents.length === 1) {
                  eventToDelete = matchedEvents[0];
                  eventId = eventToDelete.id;
                  console.log(`Found exactly one matching event: "${eventToDelete.summary}" (${eventId})`);
                }
                // If we found multiple matches, use the first one but log a warning
                else if (matchedEvents.length > 1) {
                  eventToDelete = matchedEvents[0];
                  eventId = eventToDelete.id;
                  console.log(`Found multiple matching events, using the first one: "${eventToDelete.summary}" (${eventId})`);
                }
                // If no matches, throw an error
                else {
                  throw new Error(`No events found matching description: "${input.description}"`);
                }
              }

              // If we still don't have an event ID, throw an error
              if (!eventId) {
                throw new Error('No event ID provided and could not find a matching event');
              }

              // Delete the event
              console.log(`Deleting event with ID: ${eventId}`);
              const success = await calendarClient.deleteEvent(eventId);

              console.log('Event deleted successfully:', success);

              // Create a new array of messages to send back to Claude
              const messagesWithToolUse = [
                systemPrompt, // Include the system prompt again
                ...messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                {
                  role: "assistant",
                  content: [
                    {
                      type: "tool_use" as const,
                      id: toolUseBlock.id,
                      name: toolUseBlock.name,
                      input: toolUseBlock.input as Record<string, unknown>
                    }
                  ]
                },
                {
                  role: "user",
                  content: [
                    {
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: JSON.stringify({
                        success,
                        eventId,
                        eventSummary: eventToDelete ? eventToDelete.summary : undefined,
                        matchedEvents: matchedEvents.length
                      })
                    },
                    {
                      type: "text" as const,
                      text: eventToDelete
                        ? `The event "${eventToDelete.summary}" has been deleted successfully. Please provide a confirmation message.`
                        : "The event has been deleted successfully. Please provide a confirmation message."
                    }
                  ]
                }
              ];

              // Send the deletion result back to Claude
              const toolResponse = await this.client.messages.create({
                model: "claude-3-7-sonnet-20250219",
                max_tokens: maxTokens,
                messages: messagesWithToolUse as any
              });

              // Return the final response
              const textContent = toolResponse.content.find(block => block.type === 'text');
              const responseText = textContent && textContent.type === 'text' && textContent.text.trim()
                ? textContent.text
                : eventToDelete
                  ? `Event "${eventToDelete.summary}" has been deleted successfully.`
                  : `Event has been deleted successfully.`;

              return {
                role: 'assistant',
                content: responseText
              };
            } catch (error) {
              // Handle authentication errors
              if (error instanceof Error && error.message.includes('Authentication required')) {
                return {
                  role: 'assistant',
                  content: "I need access to your Google Calendar to delete this event. Please sign in with your Google account first."
                };
              }

              // Handle event not found errors
              if (error instanceof Error && error.message.includes('No events found matching description')) {
                return {
                  role: 'assistant',
                  content: `I couldn't find any events matching "${input.description}". Please try again with a more specific description or list your events first to see what's available.`
                };
              }

              // Handle other errors
              console.error('Calendar client error:', error);
              return {
                role: 'assistant',
                content: `I encountered an error while trying to delete the event: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a more specific description.`
              };
            }
          }
        }
      }

      // Return the response if no tool was used
      const textContent = response.content.find(block => block.type === 'text');
      return {
        role: 'assistant',
        content: textContent && textContent.type === 'text' ? textContent.text : ''
      };
    } catch (error) {
      console.error('Claude chat with calendar tools error:', error);

      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });

        // If it's an API error from Anthropic, log more details
        if ('status' in error && 'response' in error) {
          try {
            const responseData = (error as any).response?.data;
            console.error('API error details:', {
              status: (error as any).status,
              responseData
            });
          } catch (e) {
            console.error('Could not parse API error details');
          }
        }
      }

      throw new Error(`Claude chat with calendar tools failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
