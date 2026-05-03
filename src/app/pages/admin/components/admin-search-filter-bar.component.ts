import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
	selector: 'app-admin-search-filter-bar',
	standalone: true,
	imports: [FormsModule],
	template: `
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="search"
				class="min-w-[200px] flex-1 rounded-md border border-slate-300/80 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
				placeholder="Search…"
				[ngModel]="query()"
				(ngModelChange)="onQuery($event)"
			/>
			<ng-content />
		</div>
	`,
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSearchFilterBarComponent {
	readonly queryChange = output<string>();

	protected readonly query = signal('');

	protected onQuery(v: string): void {
		this.query.set(v);
		this.queryChange.emit(v.trim());
	}
}
