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
