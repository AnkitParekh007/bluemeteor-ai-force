import { Component, computed, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

import { AuthStore } from '../../core/services/auth.store';
import { ThemeMode, ThemeService } from '../../core/services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, Button, Menu],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private readonly router = inject(Router);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthStore);
  protected readonly env = environment;

  private readonly userMenu = viewChild<Menu>('userMenu');

  protected readonly accountLabel = computed(() => {
    if (this.env.enableMockAgents) return 'Catalog (mock)';
    const u = this.auth.user();
    if (!u) return 'Account';
    return u.name?.trim() || u.email;
  });

  protected readonly userMenuModel: MenuItem[] = [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.router.navigate(['/settings']),
    },
    { separator: true },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      command: () => {
        void this.auth.logout();
      },
    },
  ];

  protected openUserMenu(event: Event): void {
    this.userMenu()?.toggle(event);
  }

  protected setTheme(mode: ThemeMode): void {
    this.theme.setMode(mode);
  }

  protected isThemeActive(mode: ThemeMode): boolean {
    return this.theme.mode() === mode;
  }
}
