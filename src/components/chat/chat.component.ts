import { ChangeDetectionStrategy, Component, output, signal, inject, viewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { ChatMessage, ChatSettings, GeminiModel } from '../../models/chat.model';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <!-- Settings Panel -->
      <div class="w-80 p-6 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col">
        <h2 class="text-xl font-bold mb-6">Settings</h2>
        
        <div class="space-y-6">
          <!-- Model Selection -->
          <div>
            <label for="model" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
            <select id="model" name="model" [ngModel]="settings().model" (ngModelChange)="updateModel($event)" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              @for (model of availableModels; track model) {
                <option [value]="model">{{ model }}</option>
              }
            </select>
          </div>

          <!-- System Prompt -->
          <div>
            <label for="system-prompt" class="block text-sm font-medium text-gray-700 dark:text-gray-300">System Prompt</label>
            <textarea id="system-prompt" name="system-prompt" rows="8" [ngModel]="settings().systemPrompt" (ngModelChange)="updateSystemPrompt($event)" class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"></textarea>
          </div>
        </div>
      </div>

      <!-- Chat Area -->
      <div class="flex-1 flex flex-col">
        <!-- Messages -->
        <div class="flex-1 p-6 overflow-y-auto" #messageContainer>
          @if (error()) {
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
              <strong class="font-bold">Error:</strong>
              <span class="block sm:inline">{{ error() }}</span>
            </div>
          }
          <div class="space-y-6">
            @for (message of messages(); track $index) {
              <div class="flex items-start gap-4" [class.justify-end]="message.role === 'user'">
                @if (message.role !== 'user') {
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0" 
                    [class.bg-green-500]="message.role === 'model'"
                    [class.bg-gray-500]="message.role === 'system'">
                    {{ message.role === 'model' ? 'M' : 'S' }}
                  </div>
                }
                
                <div class="max-w-2xl p-4 rounded-lg shadow-sm"
                  [class.bg-blue-500]="message.role === 'user'"
                  [class.text-white]="message.role === 'user'"
                  [class.bg-white]="message.role === 'model'"
                  [class.dark:bg-gray-700]="message.role === 'model'"
                  [class.bg-gray-200]="message.role === 'system'"
                  [class.dark:bg-gray-600]="message.role === 'system'"
                  [class.w-full]="message.role === 'system'"
                  [class.text-center]="message.role === 'system'"
                  [class.text-sm]="message.role === 'system'"
                  [class.italic]="message.role === 'system'">
                  
                  <div class="prose dark:prose-invert max-w-none prose-p:my-2 prose-pre:my-2" [innerHTML]="formatMessageContent(message.content)"></div>

                  @if (message.isGenerating) {
                    <div class="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  }
                  @if (message.role === 'model' && message.content && !message.isGenerating) {
                    <button (click)="onOpenSidebar(message.content)" class="mt-2 text-xs text-blue-500 hover:underline">View Details</button>
                  }
                </div>

                @if (message.role === 'user') {
                  <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-blue-500 shrink-0">
                    U
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Input Area -->
        <div class="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div class="flex items-start gap-4">
            <textarea [(ngModel)]="userPrompt" (keydown.enter)="handleKeydown($event)" placeholder="Type your message... (Shift+Enter for new line)" rows="3" class="flex-1 resize-none p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"></textarea>
            <div class="flex flex-col gap-2">
              <button (click)="sendMessage(userPrompt())" [disabled]="!userPrompt().trim() || isGenerating() || isEnhancing()" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center w-36">
                @if(isGenerating() && !isEnhancing()){
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                } @else {
                  <span>Send</span>
                }
              </button>
              <button (click)="enhanceAndSendMessage()" [disabled]="!userPrompt().trim() || isGenerating() || isEnhancing()" class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 disabled:cursor-not-allowed flex items-center justify-center w-36">
                 @if(isEnhancing()){
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Enhancing...</span>
                  } @else {
                    <span>Enhance & Send</span>
                  }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .typing-indicator {
      display: flex;
      padding: 8px 0 0 0;
    }
    .typing-indicator span {
      height: 8px;
      width: 8px;
      background-color: #9E9EA1;
      border-radius: 50%;
      display: inline-block;
      margin: 0 2px;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .dark .typing-indicator span {
       background-color: #718096;
    }
    .typing-indicator span:nth-child(2) {
      animation-delay: -1.0s;
    }
    .typing-indicator span:nth-child(3) {
      animation-delay: -0.8s;
    }
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1.0);
      }
    }
  `]
})
export class ChatComponent {
  openSidebar = output<string>();
  
  private geminiService = inject(GeminiService);
  private messageContainer = viewChild<ElementRef<HTMLDivElement>>('messageContainer');

  messages = signal<ChatMessage[]>([]);
  settings = signal<ChatSettings>({
    model: 'gemini-2.5-flash',
    systemPrompt: 'You are a helpful and friendly AI assistant.'
  });
  availableModels: GeminiModel[] = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-live-2.5-flash-preview'];
  userPrompt = signal('');
  isGenerating = signal(false);
  isEnhancing = signal(false);
  error = this.geminiService.error;

  constructor() {
    this.messages.set([{
      role: 'model',
      content: 'Hello! How can I help you today?'
    }]);

    effect(() => {
      this.messages(); // a dependency on messages
      this.scrollToBottom();
    });
  }

  updateModel(model: GeminiModel) {
    this.settings.update(s => ({ ...s, model }));
  }

  updateSystemPrompt(prompt: string) {
    this.settings.update(s => ({ ...s, systemPrompt: prompt }));
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage(this.userPrompt());
    }
  }

  async sendMessage(prompt: string) {
    if (!prompt.trim() || this.isGenerating() || this.isEnhancing()) return;

    this.isGenerating.set(true);
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    this.messages.update(m => [...m, userMessage]);
    this.userPrompt.set('');

    const modelMessage: ChatMessage = { role: 'model', content: '', isGenerating: true };
    this.messages.update(m => [...m, modelMessage]);
    
    const history = this.messages().slice(0, -2);

    try {
      let fullResponse = '';
      const stream = this.geminiService.generateResponseStream(history, prompt, this.settings());

      for await (const chunk of stream) {
        fullResponse += chunk;
        this.messages.update(messages => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content = fullResponse;
          }
          return [...messages];
        });
      }
    } catch (e) {
      console.error(e);
      this.messages.update(messages => {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content = 'Sorry, an error occurred while generating the response.';
          }
          return [...messages];
      });
    } finally {
      this.messages.update(messages => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
          lastMessage.isGenerating = false;
        }
        return [...messages];
      });
      this.isGenerating.set(false);
    }
  }

  async enhanceAndSendMessage() {
    const prompt = this.userPrompt();
    if (!prompt.trim() || this.isGenerating() || this.isEnhancing()) return;
    
    this.isEnhancing.set(true);
    const enhancedPrompt = await this.geminiService.enhancePrompt(prompt);
    this.isEnhancing.set(false);

    if (this.error()) {
        return;
    }
    
    const enhancementInfo: ChatMessage = {
      role: 'system',
      content: `Using enhanced prompt: "${enhancedPrompt}"`
    };
    this.messages.update(m => [...m, enhancementInfo]);

    await this.sendMessage(enhancedPrompt);
  }

  onOpenSidebar(content: string) {
    this.openSidebar.emit(content);
  }

  formatMessageContent(content: string): string {
    if (!content) return '';
    // Basic sanitization
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const parts: string[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        const textPart = html.substring(lastIndex, match.index);
        parts.push(this.formatTextPart(textPart));
      }
      const lang = match[1] || 'plaintext';
      const code = match[2];
      const escapedCode = code; // Already sanitized '<' and '>'
      parts.push(`<pre class="bg-gray-200 dark:bg-gray-900 rounded p-4 text-sm overflow-x-auto"><code class="language-${lang}">${escapedCode}</code></pre>`);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < html.length) {
      parts.push(this.formatTextPart(html.substring(lastIndex)));
    }

    return parts.join('');
  }

  private formatTextPart(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\n/g, '<br>'); // Newlines
  }

  private scrollToBottom(): void {
    setTimeout(() => {
        const container = this.messageContainer()?.nativeElement;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
    }, 0);
  }
}
