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
