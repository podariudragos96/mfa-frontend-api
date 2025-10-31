import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Realm } from '../models/realm.model';
import { CreateRealmRequest } from '../models/create-realm-request.model';

@Injectable({ providedIn: 'root' })
export class RealmService {
  private baseUrl = 'http://localhost:8080/api/realms';
  private themeAdminBase = 'http://localhost:8080/api/themes';
  
  constructor(private http: HttpClient) { }

  getRealms(): Observable<Realm[]> {
    return this.http.get<Realm[]>(this.baseUrl);
  }

   createRealm(req: CreateRealmRequest): Observable<void> {
    return this.http.post<void>(this.baseUrl, req);
  }

  deleteRealm(realmId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${realmId}`);
  }
}