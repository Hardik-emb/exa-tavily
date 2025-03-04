export const calendarTools = [
  {
    name: "list_calendar_events",
    description: "List upcoming events from the user's Google Calendar. Returns a list of events with their details.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number" as const,
          description: "Number of days to look ahead (default: 7)",
          default: 7
        },
        max_results: {
          type: "number" as const,
          description: "Maximum number of events to return (default: 10)",
          default: 10
        }
      },
      required: []
    }
  },
  {
    name: "create_calendar_event",
    description: "Create a new event in the user's Google Calendar. Requires event details like summary, start time, and end time.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string" as const,
          description: "Title of the event"
        },
        description: {
          type: "string" as const,
          description: "Description or details of the event"
        },
        location: {
          type: "string" as const,
          description: "Location of the event"
        },
        start_time: {
          type: "string" as const,
          description: "Start time of the event in ISO format (e.g., '2025-03-05T09:00:00')"
        },
        end_time: {
          type: "string" as const,
          description: "End time of the event in ISO format (e.g., '2025-03-05T10:00:00')"
        },
        time_zone: {
          type: "string" as const,
          description: "Time zone for the event (default: 'Asia/Kolkata')",
          default: "Asia/Kolkata"
        },
        reminders: {
          type: "array" as const,
          description: "Reminders for the event",
          items: {
            type: "object" as const,
            properties: {
              method: {
                type: "string" as const,
                description: "Method of reminder (e.g., 'popup', 'email')",
                enum: ["popup", "email"]
              },
              minutes: {
                type: "number" as const,
                description: "Minutes before the event to send the reminder"
              }
            },
            required: ["method", "minutes"]
          }
        }
      },
      required: ["summary", "start_time", "end_time"]
    }
  },
  {
    name: "update_calendar_event",
    description: "Update an existing event in the user's Google Calendar. Requires the event ID and updated details.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string" as const,
          description: "ID of the event to update"
        },
        summary: {
          type: "string" as const,
          description: "Updated title of the event"
        },
        description: {
          type: "string" as const,
          description: "Updated description or details of the event"
        },
        location: {
          type: "string" as const,
          description: "Updated location of the event"
        },
        start_time: {
          type: "string" as const,
          description: "Updated start time of the event in ISO format"
        },
        end_time: {
          type: "string" as const,
          description: "Updated end time of the event in ISO format"
        },
        time_zone: {
          type: "string" as const,
          description: "Updated time zone for the event"
        }
      },
      required: ["event_id"]
    }
  },
  {
    name: "delete_calendar_event",
    description: "Delete an event from the user's Google Calendar. Requires the event ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        event_id: {
          type: "string" as const,
          description: "ID of the event to delete"
        }
      },
      required: ["event_id"]
    }
  }
];

export const exaTools = [
  {
    name: "exa_search",
    description: "Search the internet for current information using Exa API. After receiving search results, you must provide a comprehensive response that incorporates the information from these results. Always include a detailed explanation or summary before listing the search results.",
    input_schema: {
      type: "object" as const, // Use const assertion to ensure correct type
      properties: {
        query: {
          type: "string" as const,
          description: "The search query to look up"
        },
        num_results: {
          type: "number" as const,
          description: "Number of results to return (default: 5)",
          default: 5
        }
      },
      required: ["query"]
    }
  }
];

export const tavilyTools = [
  {
    name: "tavily_search",
    description: "Search the internet for current information using Tavily API. After receiving search results, you must provide a comprehensive response that incorporates the information from these results. Always include a detailed explanation or summary before listing the search results.",
    input_schema: {
      type: "object" as const, // Use const assertion to ensure correct type
      properties: {
        query: {
          type: "string" as const,
          description: "The search query to look up"
        },
        num_results: {
          type: "number" as const,
          description: "Number of results to return (default: 5)",
          default: 5
        }
      },
      required: ["query"]
    }
  }
];

export const imageGenerationTools = [
  {
    name: "generate_image",
    description: "Generate an image based on a text description using DALL-E. Provide a detailed description of the image you want to create.",
    input_schema: {
      type: "object" as const, // Use const assertion to ensure correct type
      properties: {
        prompt: {
          type: "string" as const,
          description: "Detailed description of the image to generate"
        },
        size: {
          type: "string" as const,
          description: "Size of the generated image (default: 1024x1024)",
          enum: ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]
        },
        style: {
          type: "string" as const,
          description: "Style of the generated image (default: vivid)",
          enum: ["vivid", "natural"]
        }
      },
      required: ["prompt"]
    }
  }
];

export const imageAndSearchTools = [
  {
    name: "generate_image",
    description: "Generate an image based on a text description using DALL-E. Provide a detailed description of the image you want to create.",
    input_schema: {
      type: "object" as const, // Use const assertion to ensure correct type
      properties: {
        prompt: {
          type: "string" as const,
          description: "Detailed description of the image to generate"
        },
        size: {
          type: "string" as const,
          description: "Size of the generated image (default: 1024x1024)",
          enum: ["256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"]
        },
        style: {
          type: "string" as const,
          description: "Style of the generated image (default: vivid)",
          enum: ["vivid", "natural"]
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "tavily_search",
    description: "Search the internet for current information using Tavily API. After receiving search results, you must provide a comprehensive response that incorporates the information from these results. Always include a detailed explanation or summary before listing the search results.",
    input_schema: {
      type: "object" as const, // Use const assertion to ensure correct type
      properties: {
        query: {
          type: "string" as const,
          description: "The search query to look up"
        },
        num_results: {
          type: "number" as const,
          description: "Number of results to return (default: 5)",
          default: 5
        }
      },
      required: ["query"]
    }
  }
];
