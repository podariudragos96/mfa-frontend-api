import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealmSelectorComponent } from './realm-selector/realm-selector.component';
import { UserListComponent } from './user-list/user-list.component';
import { LoginPanelComponent } from './login-panel/login-panel.component';
import { Realm } from './models/realm.model';

type View = 'admin' | 'user';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RealmSelectorComponent, UserListComponent, LoginPanelComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  view: View = 'admin';
  selectedRealm: Realm | null = null;

  switchView(v: View) { this.view = v; }
  onRealmSelected(r: Realm | null) { this.selectedRealm = r; }
}