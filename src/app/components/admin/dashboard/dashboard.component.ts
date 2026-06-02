import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideCar,
  LucideLayers,
  LucideTrendingUp,
  LucideRefreshCw,
  LucideSparkles,
  LucideDownload,
  LucideSearch
} from '@lucide/angular';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideCar,
    LucideLayers,
    LucideTrendingUp,
    LucideRefreshCw,
    LucideSparkles,
    LucideDownload,
    LucideSearch
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../admin.component.css']
})
export class AdminDashboardComponent {
  @Input() stats: any = null;
  @Input() analyticsMonth = '';
  @Input() isLoadingStats = false;
  @Input() isGeneratingMock = false;

  @Output() monthChange = new EventEmitter<string>();
  @Output() generateMockData = new EventEmitter<void>();

  searchQuery = '';

  constructor(private notification: NotificationService) {}

  onMonthChange(newMonth: string) {
    this.monthChange.emit(newMonth);
  }

  onGenerateMockData() {
    this.generateMockData.emit();
  }

  get filteredLeaderboard() {
    if (!this.stats || !this.stats.officerLeaderboard) return [];
    if (!this.searchQuery.trim()) return this.stats.officerLeaderboard;
    const query = this.searchQuery.toLowerCase().trim();
    return this.stats.officerLeaderboard.filter((officer: any) => 
      officer.name.toLowerCase().includes(query) || 
      officer.username.toLowerCase().includes(query)
    );
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
