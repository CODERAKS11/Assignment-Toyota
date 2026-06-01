import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Toast } from '../../../services/notification.service';
import { 
  LucideCheckCircle, 
  LucideAlertCircle, 
  LucideInfo, 
  LucideX 
} from '@lucide/angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [
    CommonModule, 
    LucideCheckCircle, 
    LucideAlertCircle, 
    LucideInfo, 
    LucideX
  ],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css']
})
export class ToastComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(private notification: NotificationService) {}

  ngOnInit() {
    this.notification.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  onRemove(id: string) {
    this.notification.remove(id);
  }
}
