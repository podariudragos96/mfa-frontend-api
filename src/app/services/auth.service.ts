import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface LoginReq { realm: string; username: string; password: string; }
interface LoginResp { mfaRequired: boolean; methods: string[]; loginAttemptId: string; }
interface TokenResp { token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiRoot = 'http://localhost:8080/api';
  private readonly authBase = `${this.apiRoot}/auth`;
  private tokenKey = 'app_jwt';

  constructor(private http: HttpClient) {}

  login(realm: string, username: string, password: string): Observable<LoginResp> {
    const body: LoginReq = { realm, username, password };
    return this.http.post<LoginResp>(`${this.authBase}/login`, body);
  }

  sendEmailOtp(loginAttemptId: string): Observable<{sent: boolean}> {
    return this.http.post<{sent: boolean}>(`${this.authBase}/mfa/email/send`, { loginAttemptId });
  }
  verifyEmailOtp(loginAttemptId: string, code: string): Observable<string> {
    return this.http.post<TokenResp>(`${this.authBase}/mfa/email/verify`, { loginAttemptId, code })
      .pipe(map(resp => resp.token));
  }

  enrollTotp(loginAttemptId: string) {
    return this.http.post<{ emailSent?: boolean; alreadyConfigured?: boolean }>(
      `${this.authBase}/mfa/totp/enroll`,
      { loginAttemptId }
    );
  }
  verifyTotp(loginAttemptId: string, code: string): Observable<string> {
    return this.http.post<TokenResp>(`${this.authBase}/mfa/totp/verify`, { loginAttemptId, code })
      .pipe(map(resp => resp.token));
  }

  startTotpSession(loginAttemptId: string) {
  return this.http.post<{ redirectTo: string }>(
    'http://localhost:8080/api/auth/mfa/totp/start-session',
    { loginAttemptId }
  );
  }

  sendSmsOtp(loginAttemptId: string) {
    return this.http.post<{sent: boolean; cooldown?: number}>(`${this.authBase}/mfa/sms/send`, { loginAttemptId });
  }
  verifySmsOtp(loginAttemptId: string, code: string) {
    return this.http.post<{ token: string }>(`${this.authBase}/mfa/sms/verify`, { loginAttemptId, code })
      .pipe(map(r => r.token));
  }
  
  setEmail(loginAttemptId: string, email: string) {
  return this.http.post<{updated: boolean}>(`${this.authBase}/profile/email`, { loginAttemptId, email });
  }
  sendVerifyEmail(loginAttemptId: string) {
    return this.http.post<{emailSent: boolean}>(`${this.authBase}/profile/verify-email`, { loginAttemptId });
  }
  profileStatus(loginAttemptId: string) {
    return this.http.get<{ emailMissing: boolean; emailVerified: boolean; hasTotp: boolean }>(
      `${this.authBase}/profile/status`, { params: { loginAttemptId } as any }
    );
  }

  setToken(token: string) { localStorage.setItem(this.tokenKey, token); }
  clearToken() { localStorage.removeItem(this.tokenKey); }
  getToken(): string | null { return localStorage.getItem(this.tokenKey); }

  pingSecure(): Observable<any> {
    const token = this.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.get('http://localhost:8080/api/secure/ping', { headers });
  }
}