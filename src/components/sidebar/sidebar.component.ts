import { ChangeDetectionStrategy, Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ContentBlock {
  type: 'text' | 'code';
  content: string;
  language?: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SidebarComponent {
  isOpen = input.required<boolean>();
  content = input.required<string>();
  closeSidebar = output<void>();

  parsedContent = signal<ContentBlock[]>([]);
  copyStatus = signal<{[key: number]: boolean}>({});

  constructor() {
    effect(() => {
      this.parseContent(this.content());
    });
  }

  private parseContent(content: string) {
    const blocks: ContentBlock[] = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({ type: 'text', content: content.substring(lastIndex, match.index) });
      }
      blocks.push({ type: 'code', content: match[2], language: match[1] || 'code' });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      blocks.push({ type: 'text', content: content.substring(lastIndex) });
    }

    this.parsedContent.set(blocks);
  }

  onClose() {
    this.closeSidebar.emit();
  }

  copyCode(text: string, index: number) {
    navigator.clipboard.writeText(text).then(() => {
      this.copyStatus.update(statuses => ({...statuses, [index]: true }));
      setTimeout(() => {
        this.copyStatus.update(statuses => ({...statuses, [index]: false }));
      }, 2000);
    });
  }

  formatText(content: string): string {
    return content.replace(/\n/g, '<br>');
  }
}
