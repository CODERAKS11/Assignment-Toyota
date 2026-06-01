import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();

  show(type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 4000) {
    const id = crypto.randomUUID();
    const newToast: Toast = { id, type, message };
    const currentToasts = this.toastsSubject.value;
    
    
    this.toastsSubject.next([...currentToasts, newToast]);

    
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(message: string) {
    this.show('success', message);
  }

  error(message: string) {
    this.show('error', message);
  }

  warning(message: string) {
    this.show('warning', message);
  }

  info(message: string) {
    this.show('info', message);
  }

  remove(id: string) {
    const currentToasts = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(currentToasts);
  }
}
