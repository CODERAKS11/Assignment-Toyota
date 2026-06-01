import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAlertCircle, LucideUser, LucideLock, LucideArrowRight, LucideKey } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAlertCircle,
    LucideUser,
    LucideLock,
    LucideArrowRight,
    LucideKey
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  error: string | null = null;
  isLoading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {}

  async onSubmit() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await this.auth.login(this.username.trim(), this.password);
      if (success) {
        const currentUser = this.auth.getCurrentUser();
        if (currentUser) {
          this.notification.success(`Welcome back, ${currentUser.name}! Directing you to ${currentUser.role === 'ADMIN' ? 'Admin console' : 'sales tracker'}.`);
          if (currentUser.role === 'ADMIN') {
            this.router.navigate(['/admin']);
          } else if (currentUser.role === 'SALES_OFFICER') {
            this.router.navigate(['/sales-officer']);
          }
        }
      } else {
        this.error = 'Invalid username or password.';
        this.isLoading = false;
      }
    } catch (err) {
      this.error = 'An unexpected authentication error occurred.';
      this.isLoading = false;
    }
  }
}
