import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  LucideLayers,
  LucideLogOut,
  LucideCar,
  LucideTrendingUp,
  LucideUsers,
  LucideAward
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User, SlabScheme, ModelOverride } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

import { AdminInventoryComponent } from './inventory/inventory.component';
import { AdminSlabsComponent } from './slabs/slabs.component';
import { AdminDashboardComponent } from './dashboard/dashboard.component';
import { AdminOfficersComponent } from './officers/officers.component';
import { AdminReportsComponent } from './reports/reports.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    LucideLayers,
    LucideLogOut,
    LucideCar,
    LucideTrendingUp,
    LucideUsers,
    LucideAward,
    AdminInventoryComponent,
    AdminSlabsComponent,
    AdminDashboardComponent,
    AdminOfficersComponent,
    AdminReportsComponent
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  @ViewChild('inventoryComp') inventoryComp!: AdminInventoryComponent;

  openAddCarModal() {
    this.inventoryComp?.openAddCarModal();
  }

  onCSVSelected(event: any) {
    this.inventoryComp?.onCSVSelected(event);
  }

  activeTab: 'inventory' | 'slabs' | 'dashboard' | 'officers' | 'reports' = 'inventory';
  user: User | null = null;

  reportsData: any = null;
  isLoadingReports = true;
  reportsYear = '2026';

  cars: Vehicle[] = [];
  isLoadingCars = true;

  slabs: Slab[] = [];
  isLoadingSlabs = true;

  schemes: SlabScheme[] = [];
  selectedSchemeId = '';
  selectedScheme: SlabScheme | null = null;
  overrides: ModelOverride[] = [];

  officers: User[] = [];
  isLoadingOfficers = true;

  stats: any = null;
  isLoadingStats = true;
  analyticsMonth = '';
  isGeneratingMock = false;

  constructor(
    private db: DatabaseService,
    private auth: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    const now = new Date();
    this.analyticsMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async ngOnInit() {
    this.user = this.auth.getCurrentUser();
    await this.fetchSchemes();
    this.fetchCars();
    this.fetchStats();
    this.fetchOfficers();
    this.fetchReports();
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
    await this.fetchOfficers();
    this.notification.info(`Synced analytics dashboard with month: ${newMonth}`);
  }

  async onGenerateMockData() {
    this.isGeneratingMock = true;
    try {
      const seeded = await this.db.seedMockSalesData(this.analyticsMonth);
      if (seeded) {
        this.notification.success(`Generated rich demo sales volumes for ${this.analyticsMonth}!`);
        await this.fetchStats();
        await this.fetchOfficers();
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

  getInitials(name: string): string {
    if (!name) return 'SO';
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

  async fetchSchemes() {
    try {
      this.schemes = await this.db.getSchemes();
      if (this.schemes.length > 0) {
        const nowStr = new Date().toISOString().substring(0, 10);
        const active = this.schemes
          .filter(s => s.activation_date <= nowStr)
          .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0] || this.schemes[0];
        
        await this.fetchSlabsAndOverridesForScheme(active.id);
      }
    } catch (err) {
      console.error('Error fetching schemes:', err);
    }
  }

  async fetchSlabsAndOverridesForScheme(schemeId: string) {
    this.isLoadingSlabs = true;
    try {
      const targetScheme = this.schemes.find(s => s.id === schemeId);
      this.selectedScheme = targetScheme || null;
      this.selectedSchemeId = schemeId;

      const [slabsData, overridesData] = await Promise.all([
        this.db.getSlabs(schemeId),
        this.db.getOverridesByScheme(schemeId)
      ]);

      this.slabs = slabsData;
      this.overrides = overridesData;
    } catch (err) {
      console.error('Error fetching versioned slabs and overrides:', err);
    } finally {
      this.isLoadingSlabs = false;
    }
  }

  async fetchOfficers() {
    this.isLoadingOfficers = true;
    try {
      this.officers = await this.db.getOfficers(this.analyticsMonth);
    } catch (err) {
      console.error('Error fetching officers list:', err);
    } finally {
      this.isLoadingOfficers = false;
    }
  }

  async fetchReports() {
    this.isLoadingReports = true;
    try {
      this.reportsData = await this.db.getReportsAndAudits(this.reportsYear);
    } catch (err) {
      console.error('Error fetching reports:', err);
      this.notification.error('Failed to load payroll report database.');
    } finally {
      this.isLoadingReports = false;
    }
  }

  async onReportsYearChange(newYear: string) {
    this.reportsYear = newYear;
    await this.fetchReports();
    this.notification.info(`Synced reports with year: ${newYear}`);
  }

  onSlabsModified() {
    this.fetchSchemes();
    this.fetchStats();
    this.fetchOfficers();
    this.fetchReports();
  }

  onOfficersModified() {
    this.fetchOfficers();
    this.fetchStats();
    this.fetchReports();
  }
}
