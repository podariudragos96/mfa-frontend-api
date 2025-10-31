import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface ExportUser {
  username: string;
  displayName: string;
  password: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  // If you use a proxy, change to '/api/realms'
  private baseUrl = 'http://localhost:8080/api/realms';

  constructor(private http: HttpClient) {}

  getUsers(realmName: string): Observable<User[]> {
  return this.http.get<User[]>(`${this.baseUrl}/${realmName}/users`);
}

createUser(realmName: string, user: User): Observable<User> {
  return this.http.post<User>(`${this.baseUrl}/${realmName}/users`, user);
}

updateUser(realmName: string, userId: string, user: User): Observable<User> {
  return this.http.put<User>(`${this.baseUrl}/${realmName}/users/${userId}`, user);
}

deleteUser(realmName: string, userId: string): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${realmName}/users/${userId}`);
}

resetPassword(realmName: string, userId: string): Observable<void> {
  return this.http.post<void>(`${this.baseUrl}/${realmName}/users/${userId}/reset-password`, {});
}

verifyEmail(realmName: string, userId: string): Observable<void> {
  return this.http.post<void>(`${this.baseUrl}/${realmName}/users/${userId}/verify-email`, {});
}

exportUsers(realmName: string): Observable<ExportUser[]> {
    return this.http.get<ExportUser[]>(`${this.baseUrl}/${realmName}/users/export`);
}

}