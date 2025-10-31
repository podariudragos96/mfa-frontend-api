import { Component, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';
import { Realm } from '../models/realm.model';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnChanges {
  @Input() realm!: Realm;
  @Input() user!: User | null;              // null when creating
  @Output() saved = new EventEmitter<User>();
  @Output() cancel = new EventEmitter<void>();

  userData: User = { username: '', email: '', firstName: '', lastName: '', password: '', phoneNumber: '' };

  constructor(private userService: UserService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      if (this.user) {
        const { id, username, email, firstName, lastName, phoneNumber } = this.user;
        this.userData = { id, username, email, firstName, lastName, phoneNumber, password: '' };
      } else {
        this.userData = { username: '', email: '', firstName: '', lastName: '', password: '', phoneNumber: '' };
      }
    }
  }

onSubmit(form: NgForm): void {
    if (form.invalid || !this.realm) return;

    const realmName = this.realm.name;

    if (this.user && this.user.id) {
      const { username, email, firstName, lastName, password, phoneNumber } = this.userData;
      const payload: User = { username, email, firstName, lastName, phoneNumber };
      if (password && password.trim().length > 0) payload.password = password;

      this.userService.updateUser(realmName, this.user.id, payload).subscribe({
        next: (updated) => this.saved.emit(updated),
        error: (err) => console.error('Error updating user:', err)
      });
    } else {
      this.userService.createUser(realmName, this.userData).subscribe({
        next: (created) => this.saved.emit(created),
        error: (err) => console.error('Error creating user:', err)
      });
    }
  }

  onCancel(): void { this.cancel.emit(); }
}