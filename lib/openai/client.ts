import OpenAI from 'openai';

export interface ImageGenerationOptions {
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  style?: 'vivid' | 'natural';
  quality?: 'standard' | 'hd';
  n?: number;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export class OpenAIClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  async generateImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    try {
      console.log('Generating image with prompt:', options.prompt);
      
      const response = await this.client.images.generate({
        model: "dall-e-3",
        prompt: options.prompt,
        size: options.size || "1024x1024",
        quality: options.quality || "standard",
        style: options.style || "vivid",
        n: options.n || 1,
      });

      console.log('Image generation successful');
      
      return {
        url: response.data[0].url || '',
        prompt: options.prompt
      };
    } catch (error) {
      console.error('OpenAI image generation error:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      throw new Error(`Image generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
