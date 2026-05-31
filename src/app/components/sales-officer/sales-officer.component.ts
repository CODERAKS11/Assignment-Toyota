import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Award,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ShoppingBag,
  Gift,
  LogOut
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sales-officer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './sales-officer.component.html',
  styleUrls: ['./sales-officer.component.css']
})
export class SalesOfficerComponent implements OnInit {
  user: User | null = null;
  cars: Vehicle[] = [];
  slabs: Slab[] = [];

  // Monthly Date Picker
  month = '';
  
  // Volumes state map (carId -> volume)
  volumes: { [carId: string]: number } = {};

  // Action/Loading States
  isLoading = true;
  isSaving = false;
  feedback: { type: 'success' | 'error'; message: string } | null = null;

  // Icons
  readonly award = Award;
  readonly calendar = Calendar;
  readonly chevronLeft = ChevronLeft;
  readonly chevronRight = ChevronRight;
  readonly save = Save;
  readonly trendingUp = TrendingUp;
  readonly refreshCw = RefreshCw;
  readonly alertCircle = AlertCircle;
  readonly shoppingBag = ShoppingBag;
  readonly gift = Gift;
  readonly logOut = LogOut;

  constructor(
    private db: DatabaseService,
    private auth: AuthService,
    private router: Router
  ) {
    const d = new Date();
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit() {
    this.user = this.auth.getCurrentUser();
    this.loadPortalConfig();
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

  async loadPortalConfig() {
    this.isLoading = true;
    try {
      const [carsData, slabsData] = await Promise.all([
        this.db.getCars(),
        this.db.getSlabs()
      ]);

      // Display active showroom cars
      this.cars = carsData.filter(c => c.active);
      this.slabs = slabsData;

      // Default volumes
      const initialVols: { [key: string]: number } = {};
      this.cars.forEach(c => {
        initialVols[c.id] = 0;
      });
      this.volumes = initialVols;

      // Load logged logs
      await this.fetchMonthlyLogs(this.month, initialVols);
    } catch (err) {
      console.error('Failed to load configuration:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async fetchMonthlyLogs(selectedMonth: string, baseVols: { [key: string]: number }) {
    if (!this.user) return;
    try {
      const logs = await this.db.getSalesLogs(this.user.id, selectedMonth);
      const loaded = { ...baseVols };
      logs.forEach(l => {
        if (loaded[l.car_id] !== undefined) {
          loaded[l.car_id] = l.volume;
        }
      });
      this.volumes = loaded;
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  }

  async onMonthChange(newMonth: string) {
    this.feedback = null;
    const baseVols: { [key: string]: number } = {};
    this.cars.forEach(c => {
      baseVols[c.id] = 0;
    });
    this.volumes = baseVols;

    this.isLoading = true;
    await this.fetchMonthlyLogs(newMonth, baseVols);
    this.isLoading = false;
  }

  updateVolume(carId: string, val: number) {
    this.feedback = null;
    const current = this.volumes[carId] || 0;
    this.volumes[carId] = Math.max(0, current + val);
  }

  updateVolumeDirect(carId: string, val: any) {
    this.feedback = null;
    const parsed = parseInt(val) || 0;
    this.volumes[carId] = Math.max(0, parsed);
  }

  async onSaveLogs() {
    if (!this.user) return;
    this.isSaving = true;
    this.feedback = null;

    try {
      const payload = Object.entries(this.volumes).map(([carId, vol]) => ({
        carId,
        volume: vol
      }));

      await this.db.saveSalesLogs(this.user.id, this.month, payload);
      this.feedback = { type: 'success', message: 'Monthly sales volumes logged successfully!' };
    } catch (err) {
      console.error('Error saving volumes:', err);
      this.feedback = { type: 'error', message: 'Network connection failure while saving volumes.' };
    } finally {
      this.isSaving = false;
    }
  }

  // --- MATH CALCULATION ENGINE ---

  get totalVolume(): number {
    return Object.values(this.volumes).reduce((a, b) => a + b, 0);
  }

  get activeSlab(): Slab | null {
    const total = this.totalVolume;
    return this.slabs.find(s => total >= s.min_volume && (s.max_volume === null || total <= s.max_volume)) || null;
  }

  get activePayoutRate(): number {
    return this.activeSlab ? Number(this.activeSlab.payout_per_car) : 0;
  }

  get totalPayout(): number {
    return this.totalVolume * this.activePayoutRate;
  }

  get nextSlab(): Slab | null {
    const active = this.activeSlab;
    if (!active) {
      return this.slabs.length > 0 ? this.slabs[0] : null;
    }
    const idx = this.slabs.findIndex(s => s.id === active.id);
    return idx !== -1 && idx + 1 < this.slabs.length ? this.slabs[idx + 1] : null;
  }

  get carsNeededForNext(): number {
    const next = this.nextSlab;
    return next ? next.min_volume - this.totalVolume : 0;
  }

  get progressPercentage(): number {
    const next = this.nextSlab;
    if (!next) return 100;
    
    const active = this.activeSlab;
    const prevMilestone = active ? active.max_volume || 0 : 0;
    const span = next.min_volume - prevMilestone;
    const currentProgress = this.totalVolume - prevMilestone;
    return Math.min(100, Math.max(0, (currentProgress / span) * 100));
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }
}
