import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthStore } from '../../core/services/auth.store';

export interface NavItem {
  label: string;
  route: string[];
  icon: string;
  linkExact: boolean;
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidenav.component.html',
})
export class SidenavComponent {
  private readonly auth = inject(AuthStore);

  readonly items = computed((): NavItem[] => {
    const base: NavItem[] = [
      {
        label: 'Dashboard',
        route: ['/dashboard'],
        icon: 'pi pi-chart-bar',
        linkExact: true,
      },
      {
        label: 'Pilot',
        route: ['/pilot'],
        icon: 'pi pi-flag',
        linkExact: false,
      },
    ];
    if (this.auth.hasPermission('agents.view')) {
      base.push({
        label: 'Agents',
        route: ['/agents'],
        icon: 'pi pi-users',
        linkExact: false,
      });
    }
    if (this.auth.hasPermission('audit.view')) {
      base.push({
        label: 'Logs',
        route: ['/logs'],
        icon: 'pi pi-list',
        linkExact: false,
      });
    }
    if (
      this.auth.hasAnyPermission(
        'system.admin',
        'system.debug.view',
        'agents.manage',
        'users.view',
        'audit.view',
        'tools.view',
        'tools.approve',
        'agents.readiness.view',
        'tools.manage',
      )
    ) {
      base.push({
        label: 'Admin',
        route: ['/admin', 'overview'],
        icon: 'pi pi-shield',
        linkExact: false,
      });
    }
    if (this.auth.hasPermission('system.debug.view')) {
      base.push({
        label: 'Ops',
        route: ['/ops'],
        icon: 'pi pi-server',
        linkExact: true,
      });
    }
    if (this.auth.hasPermission('agents.runtime_debug.view')) {
      base.push({
        label: 'Runtime debug',
        route: ['/agent-runtime-debug'],
        icon: 'pi pi-cog',
        linkExact: true,
      });
    }
    if (this.auth.hasPermission('agents.readiness.view')) {
      base.push({
        label: 'Readiness',
        route: ['/agent-readiness'],
        icon: 'pi pi-check-circle',
        linkExact: true,
      });
      base.push({
        label: 'Agent intelligence',
        route: ['/agent-intelligence'],
        icon: 'pi pi-database',
        linkExact: true,
      });
    }
    return base;
  });

  /** When true, sidebar stays wide even without hover. */
  readonly pinnedOpen = signal(false);
  readonly hoverOpen = signal(false);

  protected readonly expanded = computed(
    () => this.pinnedOpen() || this.hoverOpen(),
  );

  protected onEnter(): void {
    this.hoverOpen.set(true);
  }

  protected onLeave(): void {
    this.hoverOpen.set(false);
  }

  protected togglePinned(event: Event): void {
    event.stopPropagation();
    this.pinnedOpen.update((v) => !v);
  }
}
