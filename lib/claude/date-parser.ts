/**
 * Helper functions for parsing natural language dates and times
 */

/**
 * Parse a natural language date reference and return a Date object
 * @param dateText Natural language date reference (e.g., "tomorrow", "next Monday")
 * @returns Date object representing the parsed date
 */
export function parseNaturalDate(dateText: string): Date {
  const now = new Date();
  const lowerText = dateText.toLowerCase().trim();
  
  // Handle common date references
  if (lowerText === 'today') {
    return now;
  }
  
  if (lowerText === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }
  
  if (lowerText === 'day after tomorrow' || lowerText === 'the day after tomorrow') {
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(now.getDate() + 2);
    return dayAfterTomorrow;
  }
  
  if (lowerText.startsWith('next ')) {
    const dayName = lowerText.substring(5);
    return getNextDayOfWeek(now, getDayNumber(dayName));
  }
  
  if (lowerText.startsWith('this ')) {
    const dayName = lowerText.substring(5);
    return getThisDayOfWeek(now, getDayNumber(dayName));
  }
  
  // If we can't parse it, return the original date
  return now;
}

/**
 * Get the day number (0-6) for a day name
 * @param dayName Day name (e.g., "monday", "tuesday")
 * @returns Day number (0 for Sunday, 1 for Monday, etc.)
 */
function getDayNumber(dayName: string): number {
  const days: Record<string, number> = {
    'sunday': 0,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  
  return days[dayName.toLowerCase()] || 0;
}

/**
 * Get the next occurrence of a specific day of the week
 * @param date Starting date
 * @param dayOfWeek Day of the week (0 for Sunday, 1 for Monday, etc.)
 * @returns Date object representing the next occurrence of the specified day
 */
function getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
  const resultDate = new Date(date.getTime());
  resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
  
  // If the result is today, add 7 days to get the next occurrence
  if (resultDate.toDateString() === date.toDateString()) {
    resultDate.setDate(resultDate.getDate() + 7);
  }
  
  return resultDate;
}

/**
 * Get this week's occurrence of a specific day of the week
 * @param date Starting date
 * @param dayOfWeek Day of the week (0 for Sunday, 1 for Monday, etc.)
 * @returns Date object representing this week's occurrence of the specified day
 */
function getThisDayOfWeek(date: Date, dayOfWeek: number): Date {
  const resultDate = new Date(date.getTime());
  const currentDay = date.getDay();
  
  // Calculate the difference between the current day and the target day
  let diff = dayOfWeek - currentDay;
  
  // If the target day has already passed this week, get next week's occurrence
  if (diff < 0) {
    diff += 7;
  }
  
  resultDate.setDate(date.getDate() + diff);
  return resultDate;
}

/**
 * Parse a natural language time reference and set the time on a Date object
 * @param date Date object to modify
 * @param timeText Natural language time reference (e.g., "2pm", "14:30")
 * @returns Date object with the time set
 */
export function parseNaturalTime(date: Date, timeText: string): Date {
  const result = new Date(date);
  const lowerText = timeText.toLowerCase().trim();
  
  // Handle 12-hour format with am/pm
  const amPmMatch = lowerText.match(/(\d+)(?::(\d+))?\s*(am|pm)/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2] ? parseInt(amPmMatch[2], 10) : 0;
    const isPM = amPmMatch[3] === 'pm';
    
    // Convert to 24-hour format
    if (isPM && hours < 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
    
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  
  // Handle 24-hour format
  const hourMinuteMatch = lowerText.match(/(\d+):(\d+)/);
  if (hourMinuteMatch) {
    const hours = parseInt(hourMinuteMatch[1], 10);
    const minutes = parseInt(hourMinuteMatch[2], 10);
    
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
  
  // Handle hour-only format
  const hourMatch = lowerText.match(/(\d+)/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    
    result.setHours(hours, 0, 0, 0);
    return result;
  }
  
  return result;
}

/**
 * Parse a duration in natural language and return the number of minutes
 * @param durationText Natural language duration (e.g., "1 hour", "30 minutes")
 * @returns Duration in minutes
 */
export function parseNaturalDuration(durationText: string): number {
  const lowerText = durationText.toLowerCase().trim();
  
  // Handle hours
  const hourMatch = lowerText.match(/(\d+)\s*(?:hour|hr|h)/);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }
  
  // Handle minutes
  const minuteMatch = lowerText.match(/(\d+)\s*(?:minute|min|m)/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1], 10);
  }
  
  // Default to 1 hour
  return 60;
}

/**
 * Calculate the end time based on a start time and duration
 * @param startDate Start date and time
 * @param durationMinutes Duration in minutes
 * @returns End date and time
 */
export function calculateEndTime(startDate: Date, durationMinutes: number): Date {
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);
  return endDate;
}

/**
 * Format a date as an ISO string for Google Calendar
 * @param date Date to format
 * @returns ISO string formatted for Google Calendar
 */
export function formatDateForCalendar(date: Date): string {
  return date.toISOString();
}
