import { Component, OnChanges, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserFormComponent } from '../user-form/user-form.component';
import { UserService, ExportUser } from '../services/user.service';
import { User } from '../models/user.model';
import { Realm } from '../models/realm.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserFormComponent],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnChanges {
  @Input() realm!: Realm;
  users: User[] = [];
  editingUser: User | null = null;
  message = '';

  constructor(private userService: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['realm'] && this.realm) {
      this.loadUsers();
      this.message = '';
      this.editingUser = null;
    }
  }

  private loadUsers(): void {
    this.userService.getUsers(this.realm.name).subscribe({
      next: (data) => (this.users = data),
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  addUser(): void {
    this.editingUser = { username: '', email: '', firstName: '', lastName: '' };
  }

  editUser(user: User): void {
    this.editingUser = { ...user, password: '' };
  }

  deleteUser(user: User): void {
    if (!confirm(`Delete "${user.username}"?`)) return;
    this.userService.deleteUser(this.realm.name, user.id!).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.message = `User "${user.username}" was deleted.`;
      },
      error: (err) => console.error('Error deleting user:', err)
    });
  }

  resetPassword(user: User): void {
    if (!user.email) return;
    this.userService.resetPassword(this.realm.name, user.id!).subscribe({
      next: () => (this.message = `Password reset email sent for "${user.username}".`),
      error: (err) => console.error('Error sending reset:', err)
    });
  }

  verifyEmail(user: User): void {
    if (!user.email || user.emailVerified) return;
    this.userService.verifyEmail(this.realm.name, user.id!).subscribe({
      next: () => (this.message = `Verification email sent to "${user.email}".`),
      error: (err) => console.error('Error sending verify email:', err)
    });
  }

  onUserSaved(updated: User): void {
    const idx = this.users.findIndex(u => u.id === updated.id);
    if (idx >= 0) this.users[idx] = updated; else this.users.push(updated);
    this.editingUser = null;
    this.message = `User "${updated.username}" saved.`;
  }

  onUserFormCanceled(): void {
    this.editingUser = null;
  }

    // NEW: export and download JSON
  exportUsers(): void {
    if (!this.realm?.name) return;
    this.userService.exportUsers(this.realm.name).subscribe({
      next: (data: ExportUser[]) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const file = `${this.realm.name}-users.json`;
        a.download = file;
        a.click();
        URL.revokeObjectURL(url);
        this.message = `Exported ${data.length} users to ${file}.`;
      },
      error: (err) => {
        console.error('Export failed:', err);
        this.message = 'Export failed.';
      }
    });
  }
}