import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Shield, AlertCircle, User, Lock, ArrowRight, Key } from '@lucide/angular';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  error: string | null = null;
  isLoading = false;

  readonly shield = Shield;
  readonly alertCircle = AlertCircle;
  readonly user = User;
  readonly lock = Lock;
  readonly arrowRight = ArrowRight;
  readonly key = Key;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error = 'Please fill in all fields.';
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Small simulated delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = await this.auth.login(this.username.trim(), this.password);
      if (success) {
        const currentUser = this.auth.getCurrentUser();
        if (currentUser?.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (currentUser?.role === 'SALES_OFFICER') {
          this.router.navigate(['/sales-officer']);
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
