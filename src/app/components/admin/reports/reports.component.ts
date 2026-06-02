import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAward,
  LucideDownload,
  LucideRefreshCw,
  LucideAlertTriangle,
  LucideTrendingUp
} from '@lucide/angular';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAward,
    LucideDownload,
    LucideRefreshCw,
    LucideAlertTriangle,
    LucideTrendingUp
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['../admin.component.css']
})
export class AdminReportsComponent {
  @Input() reportsData: any = null;
  @Input() reportsYear = '2026';
  @Input() analyticsMonth = '';
  @Input() leaderboard: any[] = [];
  @Input() stats: any = null;
  @Input() isLoadingReports = false;
  @Input() isLoadingStats = false;

  @Output() reportsYearChange = new EventEmitter<string>();

  constructor(private notification: NotificationService) {}

  onReportsYearChange(newYear: string) {
    this.reportsYearChange.emit(newYear);
  }

  exportYTDToCSV() {
    if (!this.reportsData || !this.reportsData.ytdSummary || this.reportsData.ytdSummary.length === 0) {
      this.notification.error('No YTD summary data available to export.');
      return;
    }

    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += `NIPPON TOYOTA - YEAR-TO-DATE PAYROLL REPORT - ${this.reportsYear}\n`;
      csvContent += 'Sales Officer,Username,YTD Volume Sold,Cumulative Payout (INR)\n';

      this.reportsData.ytdSummary.forEach((row: any) => {
        csvContent += `"${row.name}","${row.username}",${row.ytdVolume},${row.ytdPayout}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Toyota_YTD_Payroll_Report_${this.reportsYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notification.success('YTD payroll report exported successfully!');
    } catch (err) {
      this.notification.error('Failed to export YTD report.');
    }
  }

  exportAnalyticsToCSV() {
    if (!this.stats || !this.stats.officerLeaderboard || this.stats.officerLeaderboard.length === 0) {
      this.notification.error('No performance records available to export.');
      return;
    }

    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += `NIPPON TOYOTA - PERFORMANCE REPORT - ${this.analyticsMonth}\n`;
      csvContent += 'Sales Officer,Username,Volume Sold,Current Active Slab,Incentive Payout (INR)\n';

      this.stats.officerLeaderboard.forEach((officer: any) => {
        csvContent += `"${officer.name}","${officer.username}",${officer.totalVolume},"${officer.activeTierLabel}",${officer.totalPayout}\n`;
      });

      csvContent += `\nDealership Summaries\n`;
      csvContent += `Total Sales Volume,${this.stats.currentMonthVolume} units sold\n`;
      csvContent += `Total Payout Disbursed,INR ${this.stats.totalPayoutDisbursed}\n`;
      csvContent += `Average Payout,INR ${this.stats.averagePayout}\n`;
      csvContent += `Top Officer,${this.stats.topOfficerName} (${this.stats.topOfficerVolume} units)\n`;
      csvContent += `Top Selling Model,${this.stats.topCarModel} (${this.stats.topCarVolume} units)\n`;

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Toyota_Performance_Report_${this.analyticsMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notification.success('Performance analytics CSV exported successfully!');
    } catch (err) {
      this.notification.error('Failed to export CSV report.');
    }
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }
}
