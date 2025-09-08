
import { ChangeDetectionStrategy, Component, signal, effect, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ChatComponent } from './components/chat/chat.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ChatComponent, SidebarComponent],
})
export class AppComponent {
  isSidebarOpen = signal(false);
  sidebarContent = signal('');
  
  theme = signal<'light' | 'dark'>('light');

  constructor(private renderer: Renderer2) {
    this.initializeTheme();

    effect(() => {
      if (this.theme() === 'dark') {
        this.renderer.addClass(document.documentElement, 'dark');
      } else {
        this.renderer.removeClass(document.documentElement, 'dark');
      }
      localStorage.setItem('theme', this.theme());
    });
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme.set(savedTheme || (prefersDark ? 'dark' : 'light'));
  }

  toggleTheme() {
    this.theme.update(current => (current === 'light' ? 'dark' : 'light'));
  }

  handleOpenSidebar(content: string) {
    this.sidebarContent.set(content);
    this.isSidebarOpen.set(true);
  }

  handleCloseSidebar() {
    this.isSidebarOpen.set(false);
  }
}
