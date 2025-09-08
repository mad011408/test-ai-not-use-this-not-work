
import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { ChatMessage, ChatSettings } from '../models/chat.model';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private chat: Chat | null = null;
  public error = signal<string | null>(null);

  constructor() {
    try {
      if (typeof process === 'undefined' || !process.env['API_KEY']) {
        throw new Error('API_KEY environment variable not set.');
      }
      this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error initializing GoogleGenAI:', error);
      this.error.set(`Failed to initialize Gemini Service: ${error.message}. Make sure the API key is configured correctly.`);
    }
  }

  async enhancePrompt(prompt: string): Promise<string> {
    if (!this.ai) {
      this.error.set('Gemini Service is not initialized.');
      return prompt;
    }

    const enhancementPrompt = `You are a world-class AI prompt engineer. Your task is to take a user's prompt and refine it to be more detailed, specific, and structured to elicit the most comprehensive and expert-level response from another AI model. Do not answer the prompt. Only output the refined prompt itself, without any introduction or explanation.

User prompt: "${prompt}"`;

    try {
      this.error.set(null);
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: enhancementPrompt,
      });
      return response.text.trim();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Error enhancing prompt:', error);
      this.error.set(`Failed to enhance prompt: ${error.message}`);
      return prompt; // Return original prompt on failure
    }
  }

  async *generateResponseStream(
    history: ChatMessage[],
    newPrompt: string,
    settings: ChatSettings
  ): AsyncGenerator<string, void, unknown> {
    if (!this.ai) {
        this.error.set('Gemini Service is not initialized.');
        return;
    }
    
    this.chat = this.ai.chats.create({
        model: settings.model,
        config: {
            systemInstruction: settings.systemPrompt,
        },
        history: history.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }))
    });

    try {
        this.error.set(null);
        const stream = await this.chat.sendMessageStream({ message: newPrompt });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (e: unknown) {
        const error = e as Error;
        console.error('Error generating response:', error);
        this.error.set(`Failed to generate response: ${error.message}`);
    }
  }
}
