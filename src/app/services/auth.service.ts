import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService, User } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: User | null = null;

  constructor(
    private db: DatabaseService,
    private router: Router
  ) {
    this.loadSession();
  }

  /**
   * Browser-native SHA-256 password hashing.
   * Leverages browser Web Crypto APIs. Fast and completely client-side.
   */
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private loadSession() {
    if (typeof window === 'undefined') return;
    const session = localStorage.getItem('toyota_session');
    if (session) {
      try {
        this.currentUser = JSON.parse(session);
      } catch (e) {
        localStorage.removeItem('toyota_session');
      }
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    const user = await this.db.getUserByUsername(username);
    if (!user) return false;

    // Hash password and compare
    const hashedInput = await this.hashPassword(password);
    if (hashedInput === user.password) {
      // Exclude password from session storage for security
      const { password: _, ...userSession } = user;
      this.currentUser = userSession as User;
      localStorage.setItem('toyota_session', JSON.stringify(this.currentUser));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('toyota_session');
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
