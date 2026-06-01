import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucidePlus,
  LucideEdit2,
  LucideTrash2,
  LucideLayers,
  LucideX,
  LucideAlertTriangle,
  LucideSave,
  LucideRefreshCw,
  LucideLogOut,
  LucideCar,
  LucideTrendingUp,
  LucideSearch,
  LucideDownload,
  LucideSparkles
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucidePlus,
    LucideEdit2,
    LucideTrash2,
    LucideLayers,
    LucideX,
    LucideAlertTriangle,
    LucideSave,
    LucideRefreshCw,
    LucideLogOut,
    LucideCar,
    LucideTrendingUp,
    LucideSearch,
    LucideDownload,
    LucideSparkles
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: 'inventory' | 'slabs' | 'dashboard' = 'inventory';
  user: User | null = null;

  
  cars: Vehicle[] = [];
  isCarModalOpen = false;
  editingCar: Vehicle | null = null;
  modelName = '';
  baseSuffix = '';
  variant = '';
  exShowroomPrice = '';
  isActive = true;

  
  slabs: Slab[] = [];
  isSavingSlabs = false;
  slabFeedback: { type: 'success' | 'error'; message: string } | null = null;

  
  stats: any = null;
  isLoadingStats = true;
  analyticsMonth = '';
  searchQuery = '';
  isGeneratingMock = false;

  
  isLoadingCars = true;
  isLoadingSlabs = true;

  constructor(
    private db: DatabaseService,
    private auth: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    const now = new Date();
    this.analyticsMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit() {
    this.user = this.auth.getCurrentUser();
    this.fetchCars();
    this.fetchSlabs();
    this.fetchStats();
  }

  async fetchStats() {
    this.isLoadingStats = true;
    try {
      this.stats = await this.db.getDetailedAnalytics(this.analyticsMonth);
    } catch (err) {
      console.error('Error fetching detailed analytics:', err);
      this.notification.error('Failed to compute dealership analytics.');
    } finally {
      this.isLoadingStats = false;
    }
  }

  async onMonthChange(newMonth: string) {
    this.analyticsMonth = newMonth;
    await this.fetchStats();
    this.notification.info(`Synced analytics dashboard with month: ${newMonth}`);
  }

  async onGenerateMockData() {
    this.isGeneratingMock = true;
    try {
      const seeded = await this.db.seedMockSalesData(this.analyticsMonth);
      if (seeded) {
        this.notification.success(`Generated rich demo sales volumes for ${this.analyticsMonth}!`);
        await this.fetchStats();
      } else {
        this.notification.error('No active models or sales officers available to seed.');
      }
    } catch (err) {
      console.error('Error seeding mock data:', err);
      this.notification.error('Failure while generating simulation logs.');
    } finally {
      this.isGeneratingMock = false;
    }
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

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  onLogout() {
    this.auth.logout();
  }

  

  async fetchCars() {
    this.isLoadingCars = true;
    try {
      this.cars = await this.db.getCars();
    } catch (err) {
      console.error('Error fetching cars:', err);
    } finally {
      this.isLoadingCars = false;
    }
  }

  openAddCarModal() {
    this.editingCar = null;
    this.modelName = '';
    this.baseSuffix = '';
    this.variant = '';
    this.exShowroomPrice = '';
    this.isActive = true;
    this.isCarModalOpen = true;
  }

  openEditCarModal(car: Vehicle) {
    this.editingCar = car;
    this.modelName = car.model_name;
    this.baseSuffix = car.base_suffix;
    this.variant = car.variant;
    this.exShowroomPrice = car.ex_showroom_price || '';
    this.isActive = car.active;
    this.isCarModalOpen = true;
  }

  async onSaveCar() {
    if (!this.modelName.trim() || !this.baseSuffix.trim() || !this.variant.trim()) return;

    try {
      if (this.editingCar) {
        await this.db.updateCar(
          this.editingCar.id,
          this.modelName.trim(),
          this.baseSuffix.trim(),
          this.variant.trim(),
          this.isActive,
          this.exShowroomPrice.trim()
        );
        this.notification.success(`Successfully updated specifications for ${this.modelName}`);
      } else {
        await this.db.addCar(
          this.modelName.trim(),
          this.baseSuffix.trim(),
          this.variant.trim(),
          this.exShowroomPrice.trim()
        );
        this.notification.success(`Successfully registered new vehicle model: ${this.modelName}`);
      }
      this.isCarModalOpen = false;
      this.fetchCars();
      this.fetchStats();
    } catch (err) {
      console.error('Error saving car:', err);
      this.notification.error('Failed to save vehicle specifications.');
    }
  }

  async onDeleteCar(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle model from inventory? This will also remove its associated sales logs.')) return;

    try {
      const deleted = await this.db.deleteCar(id);
      if (deleted) {
        this.notification.success('Vehicle successfully removed from registry inventory.');
        this.fetchCars();
        this.fetchStats();
      } else {
        this.notification.error('Vehicle could not be found or deleted.');
      }
    } catch (err) {
      console.error('Error deleting car:', err);
      this.notification.error('Connection failure while removing vehicle model.');
    }
  }

  

  async fetchSlabs() {
    this.isLoadingSlabs = true;
    try {
      this.slabs = await this.db.getSlabs();
    } catch (err) {
      console.error('Error fetching slabs:', err);
    } finally {
      this.isLoadingSlabs = false;
    }
  }

  onUpdateSlab(index: number, fields: Partial<Slab>) {
    this.slabs[index] = { ...this.slabs[index], ...fields };

    
    if (fields.max_volume !== undefined) {
      const currentMax = fields.max_volume;
      
      if (currentMax !== null && currentMax >= this.slabs[index].min_volume) {
        
        if (index + 1 < this.slabs.length) {
          this.slabs[index + 1].min_volume = currentMax + 1;
          
          
          if (this.slabs[index + 1].max_volume !== null && this.slabs[index + 1].max_volume! < this.slabs[index + 1].min_volume) {
            this.slabs[index + 1].max_volume = this.slabs[index + 1].min_volume + 2;
          }
        }
      }
    }
  }

  onAddSlab() {
    const len = this.slabs.length;
    if (len === 0) {
      this.slabs.push({
        id: crypto.randomUUID(),
        min_volume: 1,
        max_volume: null,
        payout_per_car: 1000,
        label: 'Base Tier',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      const lastSlab = this.slabs[len - 1];
      const prevMin = lastSlab.min_volume;
      
      
      lastSlab.max_volume = prevMin + 2;

      
      this.slabs.push({
        id: crypto.randomUUID(),
        min_volume: lastSlab.max_volume + 1,
        max_volume: null,
        payout_per_car: lastSlab.payout_per_car + 1000,
        label: 'New Tier',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  onRemoveSlab(index: number) {
    this.slabs = this.slabs.filter((_, i) => i !== index);

    if (this.slabs.length > 0) {
      
      this.slabs[0].min_volume = 1;

      
      for (let i = 0; i < this.slabs.length; i++) {
        if (i > 0) {
          const prevMax = this.slabs[i - 1].max_volume;
          if (prevMax !== null) {
            this.slabs[i].min_volume = prevMax + 1;
          }
        }
        if (this.slabs[i].max_volume !== null && this.slabs[i].max_volume! < this.slabs[i].min_volume) {
          this.slabs[i].max_volume = this.slabs[i].min_volume + 2;
        }
      }

      
      this.slabs[this.slabs.length - 1].max_volume = null;
    }
  }

  async onSaveSlabs() {
    this.isSavingSlabs = true;
    this.slabFeedback = null;

    try {
      
      for (let i = 0; i < this.slabs.length; i++) {
        const s = this.slabs[i];
        if (s.min_volume < 0 || s.payout_per_car < 0) {
          this.notification.error(`Slab ${i+1}: Specifications cannot be negative.`);
          this.isSavingSlabs = false;
          return;
        }
        if (s.max_volume !== null && s.max_volume < s.min_volume) {
          this.notification.error(`Slab ${i+1}: Maximum limit must exceed minimum milestone.`);
          this.isSavingSlabs = false;
          return;
        }
      }

      
      await this.db.saveSlabs(this.slabs);
      this.notification.success('Dealership incentive slabs configuration successfully published!');
      this.fetchSlabs();
      this.fetchStats();
    } catch (err) {
      console.error('Error saving slabs:', err);
      this.notification.error('Connection failure while saving dynamic slabs.');
    } finally {
      this.isSavingSlabs = false;
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
