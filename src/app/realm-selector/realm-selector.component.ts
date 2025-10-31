import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealmService } from '../services/realm.service';
import { Realm } from '../models/realm.model';

@Component({
  selector: 'app-realm-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './realm-selector.component.html',
  styleUrls: ['./realm-selector.component.css']
})
export class RealmSelectorComponent implements OnInit {
  @Input() mode: 'admin' | 'picker' = 'admin';

  realms: Realm[] = [];
  selectedRealm: Realm | null = null;

  // admin-only fields
  newRealmName = '';
  newDisplayName = '';
  message = '';

  @Output() realmSelected = new EventEmitter<Realm>();

  constructor(private realmService: RealmService) {}

  ngOnInit(): void { this.loadRealms(); }

  loadRealms(): void {
    this.realmService.getRealms().subscribe({
      next: (data) => (this.realms = data),
      error: (err) => console.error('Error fetching realms:', err)
    });
  }

  refresh(): void {
    this.message = '';
    this.loadRealms();
  }

  onSelectRealm(event: Event): void {
    const realmId = (event.target as HTMLSelectElement).value;
    const selected = this.realms.find(r => r.id === realmId) || null;
    this.selectedRealm = selected;
    if (selected) this.realmSelected.emit(selected);
  }

  // admin-only actions
  createRealm(): void {
    if (this.mode !== 'admin') return;
    const realmName = this.newRealmName.trim();
    const displayName = this.newDisplayName?.trim() || undefined;
    if (!realmName) return;

    this.realmService.createRealm({ realmName, displayName }).subscribe({
      next: () => {
        this.message = `Realm "${realmName}" created.`;
        this.newRealmName = ''; this.newDisplayName = '';
        this.loadRealms();
      },
      error: (err) => { console.error('Error creating realm:', err); this.message = 'Failed to create realm.'; }
    });
  }

  deleteSelectedRealm(): void {
    if (this.mode !== 'admin') return;
    if (!this.selectedRealm) return;
    const id = this.selectedRealm.name;
    if (!confirm(`Delete realm "${id}"? This cannot be undone.`)) return;

    this.realmService.deleteRealm(id).subscribe({
      next: () => { this.message = `Realm "${id}" deleted.`; this.selectedRealm = null; this.realmSelected.emit(null as any); this.loadRealms(); },
      error: (err) => { console.error('Error deleting realm:', err); this.message = `Failed to delete realm "${id}".`; }
    });
  }
}
