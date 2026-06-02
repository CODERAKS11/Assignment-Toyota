import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideCalendar } from '@lucide/angular';

@Component({
  selector: 'app-sales-officer-ledger',
  standalone: true,
  imports: [
    CommonModule,
    LucideCalendar
  ],
  templateUrl: './ledger.component.html',
  styleUrls: ['../sales-officer.component.css']
})
export class SalesOfficerLedgerComponent {
  @Input() historyLogs: any[] = [];
  @Input() sparklineData: number[] = [];
  @Input() ytdEarningsTotal = 0;

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }
}
