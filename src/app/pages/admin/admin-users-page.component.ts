import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { catchError, finalize, of } from 'rxjs';

import { AuthApiService } from '../../core/services/auth-api.service';
import { AuthStore } from '../../core/services/auth.store';

type UserRow = {
	id: string;
	email: string;
	name: string;
	status: string;
	department: string | null;
	jobTitle: string | null;
	createdAt: string;
	userRoles: Array<{ role: { key: string; name: string } }>;
};

type RoleRow = { id: string; key: string; name: string; description: string | null };

function extractApiMessage(err: unknown): string {
	if (err instanceof HttpErrorResponse) {
		const b = err.error as { message?: string | string[] } | null;
		if (typeof b?.message === 'string') return b.message;
		if (Array.isArray(b?.message)) return b.message.join(', ');
	}
	return 'Request failed';
}

@Component({
	selector: 'app-admin-users-page',
	standalone: true,
	imports: [CommonModule, FormsModule, Button, ConfirmDialog, Dialog, InputText, Password],
	template: `
		<div
			class="mx-auto max-w-6xl space-y-6 rounded-2xl border border-violet-200/60 bg-white/95 p-6 shadow-sm shadow-violet-500/5 backdrop-blur-sm dark:border-indigo-800/70 dark:bg-slate-900/85 dark:shadow-none sm:p-8"
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1
						class="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white"
					>
						Users
					</h1>
					<p
						class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400"
					>
						Create and update workspace accounts. Removing a user disables their login
						(there is no hard delete).
					</p>
				</div>
				@if (canCreate()) {
					<p-button label="Add user" icon="pi pi-plus" (onClick)="openCreate()" />
				}
			</div>

			@if (listError()) {
				<p
					class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
					role="alert"
				>
					{{ listError() }}
				</p>
			}

			@if (loadingList() && !rows()) {
				<p class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
			} @else if (rows()) {
				<div
					class="overflow-x-auto rounded-xl border border-violet-200/50 dark:border-indigo-800/60"
				>
					<table
						class="w-full min-w-[800px] text-left text-sm text-slate-800 dark:text-slate-200"
					>
						<thead
							class="bg-violet-50/80 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:bg-indigo-950/60 dark:text-violet-200"
						>
							<tr>
								<th class="px-3 py-2.5">Email</th>
								<th class="px-3 py-2.5">Name</th>
								<th class="px-3 py-2.5">Dept / Title</th>
								<th class="px-3 py-2.5">Status</th>
								<th class="px-3 py-2.5">Roles</th>
								<th class="px-3 py-2.5">Created</th>
								<th class="px-3 py-2.5 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							@for (u of rows(); track u.id) {
								<tr
									class="border-t border-violet-200/40 odd:bg-white/80 even:bg-slate-50/50 dark:border-indigo-900/50 dark:odd:bg-slate-900/50 dark:even:bg-slate-900/30"
								>
									<td class="px-3 py-2 font-mono text-xs">{{ u.email }}</td>
									<td class="px-3 py-2">{{ u.name }}</td>
									<td
										class="px-3 py-2 text-xs text-slate-600 dark:text-slate-400"
									>
										@if (u.department || u.jobTitle) {
											<span
												>{{ u.department || '—' }} /
												{{ u.jobTitle || '—' }}</span
											>
										} @else {
											—
										}
									</td>
									<td class="px-3 py-2 capitalize">{{ u.status }}</td>
									<td class="px-3 py-2 text-xs">
										{{ formatRoles(u) }}
									</td>
									<td
										class="px-3 py-2 text-xs text-slate-500 dark:text-slate-400"
									>
										{{ u.createdAt | date: 'medium' }}
									</td>
									<td class="px-3 py-2 text-right">
										<div class="flex flex-wrap justify-end gap-1">
											@if (canUpdate()) {
												<p-button
													label="Edit"
													[outlined]="true"
													size="small"
													(onClick)="openEdit(u)"
												/>
											}
											@if (canDisable()) {
												<p-button
													label="Disable"
													severity="danger"
													[outlined]="true"
													size="small"
													[disabled]="
														isSelf(u) || u.status === 'disabled'
													"
													(onClick)="confirmDisable(u)"
												/>
											}
										</div>
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			}

			<p-confirmDialog />

			<p-dialog
				header="Add user"
				[modal]="true"
				[style]="{ width: 'min(440px, 95vw)' }"
				[visible]="showCreate()"
				(visibleChange)="onCreateVisible($event)"
			>
				@if (createError()) {
					<p
						class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
						role="alert"
					>
						{{ createError() }}
					</p>
				}
				<div class="flex flex-col gap-3">
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-email"
							>Email</label
						>
						<input
							pInputText
							id="cu-email"
							class="w-full"
							type="email"
							autocomplete="off"
							[(ngModel)]="createEmail"
						/>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-pw"
							>Password</label
						>
						<p-password
							id="cu-pw"
							[style]="{ width: '100%' }"
							[inputStyle]="{ width: '100%' }"
							[feedback]="false"
							[toggleMask]="true"
							[(ngModel)]="createPassword"
							autocomplete="new-password"
						/>
						<p class="mt-1 text-xs text-slate-500">
							Minimum 8 characters (stronger rules may apply on the server).
						</p>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-name"
							>Display name</label
						>
						<input
							pInputText
							id="cu-name"
							class="w-full"
							[(ngModel)]="createName"
							autocomplete="name"
						/>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-dept"
							>Department</label
						>
						<input
							pInputText
							id="cu-dept"
							class="w-full"
							[(ngModel)]="createDepartment"
						/>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-title"
							>Job title</label
						>
						<input
							pInputText
							id="cu-title"
							class="w-full"
							[(ngModel)]="createJobTitle"
						/>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="cu-role"
							>Role</label
						>
						<select
							id="cu-role"
							class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
							[(ngModel)]="createRoleKey"
						>
							<option value="">— None —</option>
							@for (r of roles(); track r.id) {
								<option [value]="r.key">{{ r.name }} ({{ r.key }})</option>
							}
						</select>
					</div>
				</div>
				<ng-template #footer>
					<p-button
						label="Cancel"
						[text]="true"
						(onClick)="onCreateVisible(false)"
						[disabled]="savingCreate()"
					/>
					<p-button
						label="Create"
						(onClick)="submitCreate()"
						[loading]="savingCreate()"
					/>
				</ng-template>
			</p-dialog>

			<p-dialog
				header="Edit user"
				[modal]="true"
				[style]="{ width: 'min(440px, 95vw)' }"
				[visible]="showEdit()"
				(visibleChange)="onEditVisible($event)"
			>
				@if (editError()) {
					<p
						class="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
						role="alert"
					>
						{{ editError() }}
					</p>
				}
				<div class="flex flex-col gap-3">
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							>Email</label
						>
						<input pInputText class="w-full" [value]="editEmail" disabled />
						<p class="mt-1 text-xs text-slate-500">
							Email cannot be changed from this screen.
						</p>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="eu-name"
							>Display name</label
						>
						<input pInputText id="eu-name" class="w-full" [(ngModel)]="editName" />
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="eu-dept"
							>Department</label
						>
						<input
							pInputText
							id="eu-dept"
							class="w-full"
							[(ngModel)]="editDepartment"
						/>
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="eu-title"
							>Job title</label
						>
						<input pInputText id="eu-title" class="w-full" [(ngModel)]="editJobTitle" />
					</div>
					<div>
						<label
							class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
							for="eu-status"
							>Status</label
						>
						@if (editingId && editingId === currentUserId()) {
							<input
								pInputText
								class="w-full"
								value="active (your account)"
								disabled
							/>
							<p class="mt-1 text-xs text-slate-500">
								You cannot change your own status here.
							</p>
						} @else {
							<select
								id="eu-status"
								class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
								[(ngModel)]="editStatus"
							>
								<option value="active">Active</option>
								<option value="disabled">Disabled</option>
							</select>
						}
					</div>
				</div>
				<ng-template #footer>
					<p-button
						label="Cancel"
						[text]="true"
						(onClick)="onEditVisible(false)"
						[disabled]="savingEdit()"
					/>
					<p-button label="Save" (onClick)="submitEdit()" [loading]="savingEdit()" />
				</ng-template>
			</p-dialog>
		</div>
	`,
	providers: [ConfirmationService],
})
export class AdminUsersPageComponent implements OnInit {
	private readonly api = inject(AuthApiService);
	protected readonly auth = inject(AuthStore);
	private readonly confirm = inject(ConfirmationService);

	protected readonly rows = signal<UserRow[] | null>(null);
	protected readonly roles = signal<RoleRow[]>([]);
	protected readonly listError = signal<string | null>(null);
	protected readonly loadingList = signal(false);

	protected readonly showCreate = signal(false);
	protected readonly createError = signal<string | null>(null);
	protected readonly savingCreate = signal(false);
	createEmail = '';
	createPassword = '';
	createName = '';
	createDepartment = '';
	createJobTitle = '';
	createRoleKey = '';

	protected readonly showEdit = signal(false);
	protected readonly editError = signal<string | null>(null);
	protected readonly savingEdit = signal(false);
	protected editingId: string | null = null;
	editEmail = '';
	editName = '';
	editDepartment = '';
	editJobTitle = '';
	editStatus: string = 'active';

	ngOnInit(): void {
		this.refreshAll();
	}

	protected refreshAll(): void {
		this.loadUsers();
		this.loadRoles();
	}

	protected canCreate(): boolean {
		return this.auth.hasPermission('users.create');
	}

	protected canUpdate(): boolean {
		return this.auth.hasPermission('users.update');
	}

	protected canDisable(): boolean {
		return this.auth.hasPermission('users.disable');
	}

	protected formatRoles(u: UserRow): string {
		const keys = u.userRoles?.map((r) => r.role.key) ?? [];
		return keys.length ? keys.join(', ') : '—';
	}

	protected currentUserId(): string | undefined {
		return this.auth.user()?.id;
	}

	protected isSelf(u: UserRow): boolean {
		return !!this.currentUserId() && u.id === this.currentUserId();
	}

	private loadUsers(): void {
		this.loadingList.set(true);
		this.listError.set(null);
		this.api
			.listUsers()
			.pipe(
				catchError((e) => {
					this.listError.set(extractApiMessage(e));
					return of<UserRow[]>([]);
				}),
				finalize(() => this.loadingList.set(false)),
			)
			.subscribe((list) => this.rows.set(list));
	}

	private loadRoles(): void {
		if (!this.canCreate()) return;
		this.api
			.listRoles()
			.pipe(
				catchError(() => {
					return of<RoleRow[]>([]);
				}),
			)
			.subscribe((r) => this.roles.set(r));
	}

	protected openCreate(): void {
		this.createError.set(null);
		this.createEmail = '';
		this.createPassword = '';
		this.createName = '';
		this.createDepartment = '';
		this.createJobTitle = '';
		this.createRoleKey = '';
		this.showCreate.set(true);
	}

	protected onCreateVisible(visible: boolean): void {
		this.showCreate.set(visible);
		if (!visible) this.createError.set(null);
	}

	protected submitCreate(): void {
		const email = this.createEmail.trim();
		const password = this.createPassword;
		const name = this.createName.trim();
		if (!email || !password || !name) {
			this.createError.set('Email, password, and name are required.');
			return;
		}
		if (password.length < 8) {
			this.createError.set('Password must be at least 8 characters.');
			return;
		}
		this.savingCreate.set(true);
		this.createError.set(null);
		const body = {
			email,
			password,
			name,
			...(this.createDepartment.trim() ? { department: this.createDepartment.trim() } : {}),
			...(this.createJobTitle.trim() ? { jobTitle: this.createJobTitle.trim() } : {}),
			...(this.createRoleKey.trim() ? { roleKey: this.createRoleKey.trim() } : {}),
		};
		this.api
			.createUser(body)
			.pipe(finalize(() => this.savingCreate.set(false)))
			.subscribe({
				next: () => {
					this.showCreate.set(false);
					this.loadUsers();
				},
				error: (e) => this.createError.set(extractApiMessage(e)),
			});
	}

	protected openEdit(u: UserRow): void {
		this.editError.set(null);
		this.editingId = u.id;
		this.editEmail = u.email;
		this.editName = u.name;
		this.editDepartment = u.department ?? '';
		this.editJobTitle = u.jobTitle ?? '';
		this.editStatus = u.status === 'disabled' ? 'disabled' : 'active';
		this.showEdit.set(true);
	}

	protected onEditVisible(visible: boolean): void {
		this.showEdit.set(visible);
		if (!visible) {
			this.editError.set(null);
			this.editingId = null;
		}
	}

	protected submitEdit(): void {
		if (!this.editingId) return;
		const name = this.editName.trim();
		if (!name) {
			this.editError.set('Name is required.');
			return;
		}
		const self = this.editingId === this.currentUserId();
		const body: { name: string; department?: string; jobTitle?: string; status?: string } = {
			name,
			department: this.editDepartment.trim() || undefined,
			jobTitle: this.editJobTitle.trim() || undefined,
		};
		if (!self) {
			body.status = this.editStatus;
		}
		this.savingEdit.set(true);
		this.editError.set(null);
		this.api
			.updateUser(this.editingId, body)
			.pipe(finalize(() => this.savingEdit.set(false)))
			.subscribe({
				next: () => {
					this.showEdit.set(false);
					this.editingId = null;
					this.loadUsers();
				},
				error: (e) => this.editError.set(extractApiMessage(e)),
			});
	}

	protected confirmDisable(u: UserRow): void {
		if (this.isSelf(u) || u.status === 'disabled') return;
		this.confirm.confirm({
			message: `Disable ${u.email}? They will not be able to sign in.`,
			header: 'Disable user',
			icon: 'pi pi-exclamation-triangle',
			acceptButtonProps: { label: 'Disable', severity: 'danger' },
			rejectButtonProps: { label: 'Cancel' },
			accept: () => {
				this.api.disableUser(u.id).subscribe({
					next: () => this.loadUsers(),
					error: (e) => this.listError.set(extractApiMessage(e)),
				});
			},
		});
	}
}
