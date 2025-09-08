import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { ChatMessage, ChatSettings, GeminiModel } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class ChatComponent {
  openSidebar = output<string>();

  userInput = signal('');
  messages = signal<ChatMessage[]>([
    { role: 'model', content: 'Hello! How can I assist you today?' }
  ]);
  settings = signal<ChatSettings>({
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are a helpful and highly skilled AI assistant. Your answers are always detailed and well-structured.'
  });
  isGenerating = signal(false);
  
  // Expose service error signal to the template
  geminiError = this.geminiService.error;

  constructor(private geminiService: GeminiService) {}

  updateModel(model: GeminiModel) {
    this.settings.update(s => ({ ...s, model }));
  }

  updateSystemPrompt(prompt: string) {
    this.settings.update(s => ({ ...s, systemPrompt: prompt }));
  }

  async sendMessage() {
    const prompt = this.userInput().trim();
    if (!prompt || this.isGenerating()) return;

    this.userInput.set('');
    this.messages.update(m => [...m, { role: 'user', content: prompt }]);
    this.isGenerating.set(true);

    try {
      // Step 1: Enhance the prompt
      this.messages.update(m => [...m, { role: 'system', content: 'Enhancing prompt...', isEnhancing: true }]);
      const enhancedPrompt = await this.geminiService.enhancePrompt(prompt);
      this.messages.update(m => {
        const lastMsgIndex = m.length -1;
        if (m[lastMsgIndex].isEnhancing) {
            m.pop();
        }
        return [...m, { role: 'system', content: `Enhanced Prompt: ${enhancedPrompt}` }];
      });
      
      // Step 2: Generate response with enhanced prompt
      this.messages.update(m => [...m, { role: 'model', content: '', isGenerating: true }]);
      const history = this.messages().slice(0, -1); // Exclude the empty model message
      
      let fullResponse = '';
      const stream = this.geminiService.generateResponseStream(history, enhancedPrompt, this.settings());

      for await (const chunk of stream) {
        fullResponse += chunk;
        this.messages.update(m => {
          const lastMsg = m[m.length - 1];
          lastMsg.content = fullResponse;
          return [...m];
        });
      }

      this.openSidebar.emit(fullResponse);

    } catch (error) {
      console.error('An error occurred:', error);
      this.messages.update(m => [...m, { role: 'model', content: `Sorry, an error occurred. ${this.geminiError() || ''}` }]);
    } finally {
      this.isGenerating.set(false);
       this.messages.update(m => {
          const lastMsg = m[m.length - 1];
          if(lastMsg) {
             lastMsg.isGenerating = false;
          }
          return [...m];
        });
    }
  }

   continueLastResponse() {
    this.userInput.set('Continue');
    this.sendMessage();
  }

}