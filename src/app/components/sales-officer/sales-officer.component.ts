import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAward,
  LucideCalendar,
  LucideTrendingUp,
  LucideLogOut
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User, SlabScheme, ModelOverride } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

import { SalesOfficerDashboardComponent } from './dashboard/dashboard.component';
import { SalesOfficerSchemeComponent } from './scheme/scheme.component';
import { SalesOfficerLedgerComponent } from './ledger/ledger.component';

@Component({
  selector: 'app-sales-officer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAward,
    LucideCalendar,
    LucideTrendingUp,
    LucideLogOut,
    SalesOfficerDashboardComponent,
    SalesOfficerSchemeComponent,
    SalesOfficerLedgerComponent
  ],
  templateUrl: './sales-officer.component.html',
  styleUrls: ['./sales-officer.component.css']
})
export class SalesOfficerComponent implements OnInit {
  user: User | null = null;
  cars: Vehicle[] = [];
  allCars: Vehicle[] = [];
  slabs: Slab[] = [];
  announcements: any[] = [];
  overrides: ModelOverride[] = [];
  activeScheme: SlabScheme | null = null;
  targetVolume = 0;

  month = '';
  volumes: { [carId: string]: number } = {};

  isLoading = true;
  isSaving = false;
  feedback: { type: 'success' | 'error'; message: string } | null = null;

  lastLoginTime = '';
  lastMonthVolume = 0;
  lastMonthIncentive = 0;

  historyLogs: any[] = [];
  ytdEarningsTotal = 0;
  bestMonthLabel = '';
  bestMonthIncentive = 0;
  bestMonthVolume = 0;
  sparklineData: number[] = [];
  
  isSlabsExpanded = true;
  isPayoutExpanded = true;
  activeTab: 'dashboard' | 'scheme' | 'ledger' = 'dashboard';

  constructor(
    private db: DatabaseService,
    private auth: AuthService,
    private router: Router,
    private notification: NotificationService
  ) {
    const d = new Date();
    this.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit() {
    this.user = this.auth.getCurrentUser();
    
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(10, 32, 0, 0);
    this.lastLoginTime = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(' am', ' AM').replace(' pm', ' PM');

    this.loadPortalConfig();
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

  get unreadAnnouncements() {
    if (!this.user) return this.announcements;
    const readIds = JSON.parse(localStorage.getItem(`read_announcements_${this.user.id}`) || '[]');
    return this.announcements.filter(a => !readIds.includes(a.id));
  }

  markAnnouncementAsRead(id: string) {
    if (!this.user) return;
    const key = `read_announcements_${this.user.id}`;
    const readIds = JSON.parse(localStorage.getItem(key) || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem(key, JSON.stringify(readIds));
    }
  }

  async loadPortalConfig() {
    this.isLoading = true;
    try {
      const [carsData, schemesData, announcementsData, targetsData] = await Promise.all([
        this.db.getCars(),
        this.db.getSchemes(),
        this.db.getAnnouncements(),
        this.db.getTargets(this.month)
      ]);

      this.allCars = carsData;
      this.announcements = announcementsData;

      if (this.user) {
        const userTarget = targetsData.find(t => t.user_id === this.user?.id);
        this.targetVolume = userTarget ? userTarget.target_volume : 0;
      }

      const targetDate = `${this.month}-31`;
      const activeScheme = schemesData
        .filter(s => s.activation_date <= targetDate)
        .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0];

      this.activeScheme = activeScheme || null;

      if (activeScheme) {
        const [slabsData, overridesData] = await Promise.all([
          this.db.getSlabs(activeScheme.id),
          this.db.getOverridesByScheme(activeScheme.id)
        ]);
        this.slabs = slabsData;
        this.overrides = overridesData;
      } else {
        this.slabs = [];
        this.overrides = [];
      }

      const initialVols: { [key: string]: number } = {};
      this.allCars.forEach(c => {
        initialVols[c.id] = 0;
      });
      this.volumes = initialVols;

      await this.fetchMonthlyLogs(this.month, initialVols);
      this.filterCarsForDisplay();
      await this.fetchLastMonthStats();
      await this.fetchHistoryStats();
    } catch (err) {
      console.error('Failed to load configuration:', err);
    } finally {
      this.isLoading = false;
    }
  }

  filterCarsForDisplay() {
    this.cars = this.allCars.filter(c => 
      (c.active && c.eligible_for_incentive && c.launch_status !== 'DISCONTINUED') || 
      (this.volumes[c.id] > 0)
    );
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
    this.month = newMonth;
    const baseVols: { [key: string]: number } = {};
    this.allCars.forEach(c => {
      baseVols[c.id] = 0;
    });
    this.volumes = baseVols;

    this.isLoading = true;
    try {
      await this.fetchMonthlyLogs(newMonth, baseVols);

      const [schemesData, targetsData] = await Promise.all([
        this.db.getSchemes(),
        this.db.getTargets(newMonth)
      ]);

      if (this.user) {
        const userTarget = targetsData.find(t => t.user_id === this.user?.id);
        this.targetVolume = userTarget ? userTarget.target_volume : 0;
      }

      const targetDate = `${newMonth}-31`;
      const activeScheme = schemesData
        .filter(s => s.activation_date <= targetDate)
        .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0];

      this.activeScheme = activeScheme || null;

      if (activeScheme) {
        const [slabsData, overridesData] = await Promise.all([
          this.db.getSlabs(activeScheme.id),
          this.db.getOverridesByScheme(activeScheme.id)
        ]);
        this.slabs = slabsData;
        this.overrides = overridesData;
      } else {
        this.slabs = [];
        this.overrides = [];
      }

      this.filterCarsForDisplay();
      await this.fetchLastMonthStats();
      await this.fetchHistoryStats();
      this.notification.info(`Switched billing month to ${newMonth} and synced sales logs.`);
    } catch (err) {
      this.notification.error('Failed to sync sales logs for the selected month.');
    } finally {
      this.isLoading = false;
    }
  }

  onVolumeChanged(event: { carId: string; delta: number }) {
    const current = this.volumes[event.carId] || 0;
    this.volumes[event.carId] = Math.max(0, current + event.delta);
  }

  onVolumeDirectChanged(event: { carId: string; value: number }) {
    this.volumes[event.carId] = Math.max(0, event.value);
  }

  async onSaveLogs() {
    if (!this.user) return;
    this.isSaving = true;

    try {
      const payload = Object.entries(this.volumes).map(([carId, vol]) => ({
        carId,
        volume: vol
      }));

      await this.db.saveSalesLogs(this.user.id, this.month, payload);
      this.notification.success(`Successfully logged sales volumes for ${this.month}!`);
    } catch (err) {
      console.error('Error saving volumes:', err);
      this.notification.error('Connection failure while saving monthly volumes.');
    } finally {
      this.isSaving = false;
    }
  }

  get totalVolume(): number {
    return Object.values(this.volumes).reduce((a, b) => a + b, 0);
  }

  get eligibleVolume(): number {
    let sum = 0;
    Object.entries(this.volumes).forEach(([carId, vol]) => {
      const car = this.allCars.find(c => c.id === carId);
      if (car && car.eligible_for_incentive) {
        sum += vol;
      }
    });
    return sum;
  }

  get activeSlab(): Slab | null {
    const total = this.eligibleVolume;
    return this.slabs.find(s => total >= s.min_volume && (s.max_volume === null || total <= s.max_volume)) || null;
  }

  get activePayoutRate(): number {
    return this.activeSlab ? Number(this.activeSlab.payout_per_car) : 0;
  }

  get targetBonusUnlocked(): boolean {
    return this.targetVolume > 0 && this.eligibleVolume >= this.targetVolume;
  }

  get targetBonusAmountEarned(): number {
    if (!this.targetBonusUnlocked || !this.activeScheme) return 0;
    const bonusAmount = Number(this.activeScheme.target_bonus_amount) || 0;
    if (this.activeScheme.target_bonus_type === 'FLAT') {
      return bonusAmount;
    } else if (this.activeScheme.target_bonus_type === 'PER_CAR') {
      return this.eligibleVolume * bonusAmount;
    }
    return 0;
  }

  get targetAchievementPct(): number {
    if (!this.targetVolume || this.targetVolume <= 0) return 0;
    return Math.round((this.eligibleVolume / this.targetVolume) * 100);
  }

  get totalPayout(): number {
    let payout = 0;
    const rate = this.activePayoutRate;
    
    Object.entries(this.volumes).forEach(([carId, vol]) => {
      const car = this.allCars.find(c => c.id === carId);
      if (!car || !car.eligible_for_incentive || vol === 0) return;
      
      const override = this.overrides.find(o => o.car_id === carId);
      if (override) {
        if (override.override_type === 'FLAT') {
          payout += vol * Number(override.amount);
        } else if (override.override_type === 'BONUS') {
          payout += vol * (rate + Number(override.amount));
        }
      } else {
        payout += vol * rate;
      }
    });

    if (this.targetBonusUnlocked && this.activeScheme) {
      payout += this.targetBonusAmountEarned;
    }

    return payout;
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
    return next ? next.min_volume - this.eligibleVolume : 0;
  }

  get progressPercentage(): number {
    const next = this.nextSlab;
    if (!next) return 100;
    
    const active = this.activeSlab;
    const prevMilestone = active ? active.max_volume || 0 : 0;
    const span = next.min_volume - prevMilestone;
    const currentProgress = this.eligibleVolume - prevMilestone;
    return Math.min(100, Math.max(0, (currentProgress / span) * 100));
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  get isMonthLocked(): boolean {
    if (!this.month) return false;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const [selYear, selMonth] = this.month.split('-').map(Number);

    if (selYear === currentYear && selMonth === currentMonth) {
      return false;
    }

    let isPrevMonth = false;
    if (selYear === currentYear && selMonth === currentMonth - 1) {
      isPrevMonth = true;
    } else if (selYear === currentYear - 1 && currentMonth === 1 && selMonth === 12) {
      isPrevMonth = true;
    }

    if (isPrevMonth) {
      return currentDay > 5;
    }

    return true;
  }

  get incentiveColorClass(): string {
    const total = this.eligibleVolume;
    if (this.slabs.length === 0 || total < this.slabs[0].min_volume) {
      return 'incentive-red';
    }
    const idx = this.activeSlab ? this.slabs.findIndex(s => s.id === this.activeSlab?.id) : -1;
    if (idx === 0) {
      return 'incentive-amber';
    }
    return 'incentive-green';
  }

  get targetProgressText(): string {
    if (this.targetVolume <= 0) return 'Monthly target not assigned yet.';
    const diff = this.targetVolume - this.eligibleVolume;
    if (diff > 0) {
      return `${diff} more to hit target.`;
    }
    return 'Target achieved! Dynamic bonus tier unlocked.';
  }

  get nextTierPrompt(): string {
    if (this.slabs.length === 0) return 'Slab structures not configured for this month.';
    const rate = this.activePayoutRate;
    const next = this.nextSlab;
    if (!next) {
      return 'Congratulations! You are already in the highest payout milestone tier.';
    }
    
    const currentTierLabel = this.activeSlab ? `₹${rate}/car` : 'no tier';
    const nextRate = Number(next.payout_per_car);
    const diffCars = this.carsNeededForNext;
    
    const currentProj = this.totalPayout;
    const newProj = (this.eligibleVolume + diffCars) * nextRate; 
    const earningsOpportunity = newProj - currentProj;
    
    return `You are currently in the ${currentTierLabel} tier. Sell ${diffCars} more cars to unlock the ₹${nextRate}/car tier — that unlocks ${this.formatRupee(earningsOpportunity)} in additional earnings!`;
  }

  get trendDirectionClass(): string {
    return this.totalPayout >= this.lastMonthIncentive ? 'trend-up' : 'trend-down';
  }

  async fetchLastMonthStats() {
    if (!this.user || !this.month) return;
    const [year, m] = this.month.split('-').map(Number);
    let lastYear = year;
    let lastM = m - 1;
    if (lastM === 0) {
      lastM = 12;
      lastYear = year - 1;
    }
    const lastMonthStr = `${lastYear}-${String(lastM).padStart(2, '0')}`;
    
    try {
      const [logs, schemesData] = await Promise.all([
        this.db.getSalesLogs(this.user.id, lastMonthStr),
        this.db.getSchemes()
      ]);
      
      const totalVol = logs.reduce((sum, l) => sum + Number(l.volume), 0);
      
      const targetDate = `${lastMonthStr}-31`;
      const activeScheme = schemesData
        .filter(s => s.activation_date <= targetDate)
        .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0];
      
      let payout = 0;
      if (activeScheme) {
        const [slabs, overrides] = await Promise.all([
          this.db.getSlabs(activeScheme.id),
          this.db.getOverridesByScheme(activeScheme.id)
        ]);
        
        const eligibleLogs = logs.filter(l => {
          const car = this.allCars.find(c => c.id === l.car_id);
          return car && car.eligible_for_incentive;
        });
        const eligibleVol = eligibleLogs.reduce((sum, l) => sum + Number(l.volume), 0);
        
        const activeSlab = (slabs || []).find(s => eligibleVol >= s.min_volume && (s.max_volume === null || eligibleVol <= s.max_volume)) || null;
        const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;
        
        logs.forEach(l => {
          const car = this.allCars.find(c => c.id === l.car_id);
          if (!car || !car.eligible_for_incentive || Number(l.volume) === 0) return;
          
          const override = (overrides || []).find(o => o.car_id === car.id);
          if (override) {
            if (override.override_type === 'FLAT') {
              payout += Number(l.volume) * Number(override.amount);
            } else if (override.override_type === 'BONUS') {
              payout += Number(l.volume) * (rate + Number(override.amount));
            }
          } else {
            payout += Number(l.volume) * rate;
          }
        });
        
        const targets = await this.db.getTargets(lastMonthStr);
        const targetObj = targets.find(t => t.user_id === this.user?.id);
        const targetVol = targetObj ? targetObj.target_volume : 0;
        if (targetVol > 0 && eligibleVol >= targetVol) {
          const targetBonusType = activeScheme.target_bonus_type || 'NONE';
          const targetBonusAmount = Number(activeScheme.target_bonus_amount) || 0;
          if (targetBonusType === 'FLAT') {
            payout += targetBonusAmount;
          } else if (targetBonusType === 'PER_CAR') {
            payout += targetBonusAmount * eligibleVol;
          }
        }
      }
      
      this.lastMonthVolume = totalVol;
      this.lastMonthIncentive = payout;
    } catch (err) {
      console.error('Error fetching last month stats:', err);
      this.lastMonthVolume = 0;
      this.lastMonthIncentive = 0;
    }
  }

  async fetchHistoryStats() {
    if (!this.user) return;
    const currentYear = new Date().getFullYear();
    
    try {
      const reports = await this.db.getReportsAndAudits(String(currentYear));
      if (reports && reports.ytdSummary) {
        const userYtd = reports.ytdSummary.find(u => u.id === this.user?.id);
        this.ytdEarningsTotal = userYtd ? userYtd.ytdPayout : 0;
      }

      const history = [];
      const schemesData = await this.db.getSchemes();
      const yearLogs = await this.db.getSalesLogs(this.user.id, '');
      
      const monthlyGroups: { [m: string]: any[] } = {};
      (yearLogs || []).forEach(l => {
        if (!monthlyGroups[l.month]) monthlyGroups[l.month] = [];
        monthlyGroups[l.month].push(l);
      });

      const activeMonths = Object.keys(monthlyGroups).sort((a,b) => b.localeCompare(a));
      const sparkVols: number[] = [];

      for (const m of activeMonths) {
        const mLogs = monthlyGroups[m];
        const totalVol = mLogs.reduce((sum, l) => sum + Number(l.volume), 0);
        
        const eligibleLogs = mLogs.filter(l => {
          const car = this.allCars.find(c => c.id === l.car_id);
          return car && car.eligible_for_incentive;
        });
        const eligibleVol = eligibleLogs.reduce((sum, l) => sum + Number(l.volume), 0);

        const targetDate = `${m}-31`;
        const activeScheme = schemesData
          .filter(s => s.activation_date <= targetDate)
          .sort((a, b) => b.activation_date.localeCompare(a.activation_date))[0];

        let payout = 0;
        let activeTierLabel = 'No Tier';
        if (activeScheme) {
          const slabs = await this.db.getSlabs(activeScheme.id);
          const overrides = await this.db.getOverridesByScheme(activeScheme.id);
          
          const activeSlab = (slabs || []).find(s => eligibleVol >= s.min_volume && (s.max_volume === null || eligibleVol <= s.max_volume)) || null;
          const rate = activeSlab ? Number(activeSlab.payout_per_car) : 0;
          if (activeSlab) {
            activeTierLabel = activeSlab.label || 'Standard';
          }

          mLogs.forEach(l => {
            const car = this.allCars.find(c => c.id === l.car_id);
            if (!car || !car.eligible_for_incentive || Number(l.volume) === 0) return;
            
            const override = (overrides || []).find(o => o.car_id === car.id);
            if (override) {
              if (override.override_type === 'FLAT') {
                payout += Number(l.volume) * Number(override.amount);
              } else if (override.override_type === 'BONUS') {
                payout += Number(l.volume) * (rate + Number(override.amount));
              }
            } else {
              payout += Number(l.volume) * rate;
            }
          });

          const userTarget = await this.db.getTargets(m);
          const targetObj = userTarget.find(t => t.user_id === this.user?.id);
          const targetVol = targetObj ? targetObj.target_volume : 0;
          if (targetVol > 0 && eligibleVol >= targetVol) {
            const targetBonusType = activeScheme.target_bonus_type || 'NONE';
            const targetBonusAmount = Number(activeScheme.target_bonus_amount) || 0;
            if (targetBonusType === 'FLAT') {
              payout += targetBonusAmount;
            } else if (targetBonusType === 'PER_CAR') {
              payout += targetBonusAmount * eligibleVol;
            }
          }
        }

        history.push({
          month: m,
          totalCars: totalVol,
          slabAchieved: activeTierLabel,
          incentiveEarned: payout
        });

        sparkVols.push(totalVol);
      }

      this.historyLogs = history;
      this.sparklineData = sparkVols.reverse();

      if (history.length > 0) {
        const sortedBest = [...history].sort((a,b) => b.incentiveEarned - a.incentiveEarned);
        const best = sortedBest[0];
        this.bestMonthLabel = best.month;
        this.bestMonthIncentive = best.incentiveEarned;
        this.bestMonthVolume = best.totalCars;
      } else {
        this.bestMonthLabel = 'N/A';
        this.bestMonthIncentive = 0;
        this.bestMonthVolume = 0;
      }

    } catch (err) {
      console.error('Error fetching history logs:', err);
    }
  }
}
