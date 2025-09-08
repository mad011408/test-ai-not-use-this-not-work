export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-live-2.5-flash-preview';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  isEnhancing?: boolean;
  isGenerating?: boolean;
}

export interface ChatSettings {
  model: GeminiModel;
  systemPrompt: string;
}