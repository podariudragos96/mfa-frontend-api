import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Realm } from '../models/realm.model';
import { AuthService } from '../services/auth.service';

type Phase = 'creds' | 'email-setup' | 'email-verify' | 'mfa-select' | 'mfa-email' | 'mfa-sms' | 'mfa-totp' | 'success';

interface Needs {
  emailMissing: boolean;
  verifyEmail: boolean;
  configureTotp: boolean;
}

interface LoginResp {
  mfaRequired: boolean;
  methods: string[];
  loginAttemptId: string;
  needs?: Needs;
}

@Component({
  selector: 'app-login-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-panel.component.html',
  styleUrls: ['./login-panel.component.css']
})
export class LoginPanelComponent {
  @Input() realm: Realm | null = null;

  username = '';
  password = '';
  loginAttemptId: string | null = null;

  phase: Phase = 'creds';
  loginError: string | null = null;

  chosenMfa: 'email' | 'totp' | 'msft_totp' | 'sms' | null = null;
  info = '';
  otp = '';

  needs: Needs | null = null;
  emailInput = '';

  constructor(private auth: AuthService) {}

get realmName(): string | null {
  return this.realm?.name ?? null;
}

  allowedMethods: string[] = [];
  smsCooldownLeft = 0;
  private smsTimerRef: any = null;

  allowed(m: string) { return this.allowedMethods.includes(m); }

  onSubmit(form: NgForm) {
    this.loginError = null;
    this.info = '';
    if (!this.realmName) {
      this.loginError = 'Please select a realm first.';
      return;
    }
    if (form.invalid) {
      this.loginError = 'Please provide username and password.';
      return;
    }

    this.auth.login(this.realmName!, this.username.trim(), this.password).subscribe({
      next: (resp: LoginResp) => {
        this.loginAttemptId = resp.loginAttemptId;
        this.allowedMethods = resp.methods ?? [];
        this.needs = resp.needs ?? null;

        if (this.needs?.emailMissing) {
          this.phase = 'email-setup';
          return;
        }
        if (this.needs?.verifyEmail) {
          this.phase = 'email-verify';
          return;
        }
        this.phase = 'mfa-select';
      },
      error: (err) => {
        const code = (err?.error?.error || '').toUpperCase();
        if (code === 'USER_NOT_FOUND') this.loginError = 'User does not exist.';
        else if (code === 'INVALID_PASSWORD') this.loginError = 'Wrong password.';
        else if (code === 'INVALID_REALM') this.loginError = 'Invalid realm.';
        else this.loginError = 'Login failed.';
      }
    });
  }

startTotpInSession() {
    if (!this.loginAttemptId) return;
    this.auth.startTotpSession(this.loginAttemptId).subscribe({
      next: (res) => {
        // open Keycloak OTP setup in a NEW TAB and keep the current screen
        window.open(res.redirectTo, '_blank', 'noopener,noreferrer');
        // ensure the user is on the TOTP code entry screen
        this.phase = 'mfa-totp';
        this.info = 'Setup opened in a new tab. Finish setup, then enter a code here.';
      },
      error: () => this.info = 'Failed to start in-session setup.'
    });
  }

    checkOtpSetup() {
    if (!this.loginAttemptId) return;
    this.auth.profileStatus(this.loginAttemptId).subscribe({
    next: (s) => {
      this.info = s.hasTotp
        ? 'Authenticator configured. Enter a 6-digit code from your app.'
        : 'Still not detected. Complete setup in the other tab, wait a few seconds, then try again.';
    },
    error: () => this.info = 'Could not check setup status. Try again.'
    });
  }

  chooseMfa(method: 'email' | 'totp' | 'msft_totp' | 'sms') {
    this.chosenMfa = method;
    this.info = '';
    this.otp = '';
    this.phase = method === 'email' ? 'mfa-email'
               : method === 'sms'   ? 'mfa-sms'
               : 'mfa-totp';
  }

  // ----- EMAIL OTP -----
  sendEmailCode() {
    if (!this.loginAttemptId) return;
    this.auth.sendEmailOtp(this.loginAttemptId).subscribe({
      next: () => this.info = 'Email code sent. Check your inbox.',
      error: () => this.info = 'Failed to send email code.'
    });
  }
  verifyEmailCode() {
    if (!this.loginAttemptId) return;
    if (!this.otp || this.otp.trim().length !== 6) {
      this.info = 'Please enter the 6-digit code.';
      return;
    }
    this.auth.verifyEmailOtp(this.loginAttemptId, this.otp.trim()).subscribe({
      next: (token) => { this.auth.setToken(token); this.phase = 'success'; this.info = ''; },
      error: () => this.info = 'Invalid or expired code.'
    });
  }

  sendSmsCode() {
    if (!this.loginAttemptId || this.smsCooldownLeft > 0) return;
    this.auth.sendSmsOtp(this.loginAttemptId).subscribe({
      next: (res) => {
        const cd = typeof res.cooldown === 'number' ? res.cooldown : 30;
        this.startSmsCooldown(cd);
        this.info = 'SMS sent. Enter the 6-digit code.';
      },
      error: (err) => {
        const code = (err?.error?.error || '').toUpperCase();
        this.info = code === 'SMS_COOLDOWN' ? 'Please wait before resending.' : 'Failed to send SMS.';
      }
    });
  }

  private startSmsCooldown(sec: number) {
    this.smsCooldownLeft = sec;
    if (this.smsTimerRef) clearInterval(this.smsTimerRef);
    this.smsTimerRef = setInterval(() => {
      this.smsCooldownLeft = Math.max(0, this.smsCooldownLeft - 1);
      if (this.smsCooldownLeft <= 0) clearInterval(this.smsTimerRef);
    }, 1000);
  }

  verifySmsCode() {
    if (!this.loginAttemptId) return;
    const code = (this.otp || '').trim();
    if (code.length !== 6) { this.info = 'Please enter the 6-digit code.'; return; }
    this.auth.verifySmsOtp(this.loginAttemptId, code).subscribe({
      next: (token) => { this.auth.setToken(token); this.phase = 'success'; this.info = ''; },
      error: (err) => {
        const code = (err?.error?.error || '').toUpperCase();
        if (code === 'TOO_MANY_ATTEMPTS') this.info = 'Too many attempts. Start over.';
        else this.info = 'Invalid or expired code.';
      }
    });
  }

  doProtectedAction() {
  this.auth.pingSecure().subscribe({
    next: (res) => { 
      this.info = 'CONGRATULATIONS:' + (res?.message || 'Success'); 
    },
    error: () => { 
      this.info = 'Not authorized (are you logged in?)'; 
    }
  });
}

  // ----- TOTP (Google Authenticator) -----
  sendTotpEnroll() {
    if (!this.loginAttemptId) return;
    this.auth.enrollTotp(this.loginAttemptId).subscribe({
      next: (res) => {
        if (res.alreadyConfigured) this.info = 'Authenticator already configured. Enter a code.';
        else this.info = 'Setup link sent by email. Complete setup, then enter a code.';
      },
      error: () => this.info = 'Failed to send setup link.'
    });
  }
  verifyTotp() {
    if (!this.loginAttemptId) return;
    if (!this.otp || this.otp.trim().length !== 6) {
      this.info = 'Please enter the 6-digit code.';
      return;
    }
    this.auth.verifyTotp(this.loginAttemptId, this.otp.trim()).subscribe({
      next: (token) => { this.auth.setToken(token); this.phase = 'success'; this.info = ''; },
      error: () => this.info = 'Invalid code. Please try again.'
    });
  }

  saveEmail() {
    if (!this.loginAttemptId) return;
    const email = (this.emailInput || '').trim();
    if (!email || !email.includes('@')) { this.info = 'Please enter a valid email'; return; }
    this.auth.setEmail(this.loginAttemptId, email).subscribe({
      next: () => { this.info = 'Email saved. Now verify it.'; this.phase = 'email-verify'; },
      error: () => { this.info = 'Failed to save email.'; }
    });
  }

  sendVerifyEmail() {
    if (!this.loginAttemptId) return;
    this.auth.sendVerifyEmail(this.loginAttemptId).subscribe({
      next: () => this.info = 'Verification email sent. Please check your inbox.',
      error: () => this.info = 'Failed to send verification email.'
    });
  }

  checkVerified() {
    if (!this.loginAttemptId) return;
    this.auth.profileStatus(this.loginAttemptId).subscribe({
      next: (s) => {
        if (s.emailVerified) {
          this.info = 'Email verified. Continue to MFA.';
          this.phase = 'mfa-select';
        } else {
          this.info = 'Still not verified.';
        }
      },
      error: () => this.info = 'Failed to check status.'
    });
  }

  logout() {
    this.auth.clearToken();
    this.phase = 'creds';
    this.username = '';
    this.password = '';
    this.loginAttemptId = null;
    this.chosenMfa = null;
    this.otp = '';
    this.info = '';
    this.loginError = null;
  }
}