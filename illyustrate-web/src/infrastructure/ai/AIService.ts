import axios from 'axios';
import type { Documentation, ChatMessage } from '@shared/types';

export interface AIConfig {
  provider: 'gemini' | 'groq' | 'openai';
  apiKey: string;
  model?: string;
}

export interface GenerateDocsRequest {
  filePath: string;
  content: string;
  language: string;
  context?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    repositoryName?: string;
    currentFile?: string;
    graphContext?: string;
  };
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateDocumentation(request: GenerateDocsRequest): Promise<Omit<Documentation, 'id' | 'repositoryId'>> {
    const prompt = this.buildDocsPrompt(request);
    
    const response = await this.callAI(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return {
        filePath: request.filePath,
        content: parsed.content || response,
        summary: parsed.summary || '',
        keyFunctions: parsed.keyFunctions || [],
        dependencies: parsed.dependencies || [],
        generatedAt: new Date(),
        confidence: parsed.confidence || 0.8,
      };
    } catch {
      return {
        filePath: request.filePath,
        content: response,
        summary: '',
        keyFunctions: [],
        dependencies: [],
        generatedAt: new Date(),
        confidence: 0.6,
      };
    }
  }

  async chat(request: ChatRequest): Promise<string> {
    const prompt = this.buildChatPrompt(request);
    return this.callAI(prompt);
  }

  private buildDocsPrompt(request: GenerateDocsRequest): string {
    return `Analyze the following ${request.language} code file and generate comprehensive documentation.

File: ${request.filePath}

Code:
\`\`\`${request.language}
${request.content.slice(0, 10000)}
\`\`\`

Provide a JSON response with the following structure:
{
  "summary": "A concise 2-3 sentence summary of what this file does",
  "content": "Detailed markdown documentation explaining the code structure, functions, and purpose",
  "keyFunctions": ["list of main functions/classes exported"],
  "dependencies": ["list of imported modules/packages"],
  "confidence": 0.9
}

Focus on:
1. The purpose and responsibility of this file
2. Key functions, classes, and their parameters
3. Dependencies and how they are used
4. Any important patterns or architectural decisions`;
  }

  private buildChatPrompt(request: ChatRequest): string {
    const context = request.context;
    let systemPrompt = `You are an expert code analysis assistant. You help developers understand codebases by answering questions about code structure, dependencies, and functionality.`;

    if (context?.repositoryName) {
      systemPrompt += `\n\nYou are currently analyzing the repository: ${context.repositoryName}`;
    }

    if (context?.currentFile) {
      systemPrompt += `\n\nCurrent file context: ${context.currentFile}`;
    }

    if (context?.graphContext) {
      systemPrompt += `\n\nGraph context:\n${context.graphContext}`;
    }

    const conversation = request.messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    return `${systemPrompt}\n\nConversation:\n${conversation}\n\nAssistant:`;
  }

  private async callAI(prompt: string): Promise<string> {
    switch (this.config.provider) {
      case 'gemini':
        return this.callGemini(prompt);
      case 'groq':
        return this.callGroq(prompt);
      case 'openai':
        return this.callOpenAI(prompt);
      default:
        throw new Error(`Unsupported AI provider: ${this.config.provider}`);
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const model = this.config.model || 'gemini-pro';
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.config.apiKey,
            },
          }
        );

        return response.data.candidates[0]?.content?.parts[0]?.text || '';
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Handle rate limiting (429)
          if (error.response?.status === 429) {
            if (attempt < maxRetries - 1) {
              const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
              console.warn(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new Error('Rate limit exceeded. Please wait a moment and try again. The free tier has limited requests per minute.');
          }
          
          // Handle other API errors
          const errorMessage = error.response?.data?.error?.message || error.message;
          throw new Error(`Gemini API error: ${errorMessage}`);
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async callGroq(prompt: string): Promise<string> {
    const model = this.config.model || 'llama-3.3-70b-versatile';
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2048,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return response.data.choices[0]?.message?.content || '';
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            if (attempt < maxRetries - 1) {
              const delay = baseDelay * Math.pow(2, attempt);
              console.warn(`Rate limited. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
          }
          const errorMessage = error.response?.data?.error?.message || error.message;
          throw new Error(`Groq API error: ${errorMessage}`);
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const model = this.config.model || 'gpt-4';
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }
}
