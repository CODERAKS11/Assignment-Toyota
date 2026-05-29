import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isAdmin()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

export const salesGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.isSalesOfficer()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    const user = auth.getCurrentUser();
    if (user?.role === 'ADMIN') {
      router.navigate(['/admin']);
    } else if (user?.role === 'SALES_OFFICER') {
      router.navigate(['/sales-officer']);
    }
    return false;
  }

  return true;
};
