import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { DatabaseService, User } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;
  private apiUrl = 'https://assignment-toyota-backend.vercel.app/api';

  constructor(
    private db: DatabaseService,
    private router: Router,
    private http: HttpClient
  ) {
    this.loadSession();
  }

  private loadSession() {
    if (typeof window === 'undefined') return;
    const session = localStorage.getItem('toyota_session');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
      } catch (e) {
        localStorage.removeItem('toyota_session');
        localStorage.removeItem('toyota_token');
      }
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const res = await lastValueFrom(
        this.http.post<{ token: string; user: any }>(`${this.apiUrl}/auth/login`, { username, password })
      );

      if (res && res.token && res.user) {
        this.currentUser = res.user as User;
        localStorage.setItem('toyota_token', res.token);
        localStorage.setItem('toyota_session', JSON.stringify(this.currentUser));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Toyota DMS Client: Credentials verification failed on backend:', err);
      return false;
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('toyota_session');
    localStorage.removeItem('toyota_token');
    this.router.navigate(['/']);
  }

  getCurrentUser(): User | null {
    if (!this.currentUser) {
      this.loadSession();
    }
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user !== null && user.role === 'ADMIN';
  }

  isSalesOfficer(): boolean {
    const user = this.getCurrentUser();
    return user !== null && user.role === 'SALES_OFFICER';
  }
}
