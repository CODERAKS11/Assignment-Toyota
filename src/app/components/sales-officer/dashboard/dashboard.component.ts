import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideAward,
  LucideTrendingUp,
  LucideRefreshCw,
  LucideCircleAlert,
  LucideShoppingBag,
  LucideGift,
  LucideSave,
  LucideChevronLeft,
  LucideChevronRight,
  LucideX
} from '@lucide/angular';
import { User, Car as Vehicle, IncentiveSlab as Slab, ModelOverride } from '../../../services/database.service';

@Component({
  selector: 'app-sales-officer-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAward,
    LucideTrendingUp,
    LucideRefreshCw,
    LucideCircleAlert,
    LucideShoppingBag,
    LucideGift,
    LucideSave,
    LucideChevronLeft,
    LucideChevronRight,
    LucideX
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../sales-officer.component.css']
})
export class SalesOfficerDashboardComponent {
  @Input() user: User | null = null;
  @Input() cars: Vehicle[] = [];
  @Input() allCars: Vehicle[] = [];
  @Input() volumes: { [carId: string]: number } = {};
  @Input() unreadAnnouncements: any[] = [];
  @Input() overrides: ModelOverride[] = [];
  
  @Input() totalVolume = 0;
  @Input() eligibleVolume = 0;
  @Input() activeSlab: Slab | null = null;
  @Input() activePayoutRate = 0;
  @Input() targetVolume = 0;
  @Input() totalPayout = 0;
  @Input() lastMonthIncentive = 0;
  @Input() lastMonthVolume = 0;
  @Input() bestMonthLabel = 'N/A';
  @Input() bestMonthIncentive = 0;
  @Input() bestMonthVolume = 0;
  
  @Input() targetProgressText = '';
  @Input() targetAchievementPct = 0;
  @Input() targetBonusUnlocked = false;
  @Input() targetBonusAmountEarned = 0;
  @Input() progressPercentage = 100;
  @Input() nextTierPrompt = '';
  @Input() incentiveColorClass = '';
  @Input() isMonthLocked = false;
  @Input() isSaving = false;
  @Input() slabs: Slab[] = [];

  @Output() volumeChanged = new EventEmitter<{ carId: string; delta: number }>();
  @Output() volumeDirectChanged = new EventEmitter<{ carId: string; value: number }>();
  @Output() dismissAnnouncement = new EventEmitter<string>();
  @Output() submitLogs = new EventEmitter<void>();

  isConfirmSubmitModalOpen = false;

  updateVolume(carId: string, delta: number) {
    this.volumeChanged.emit({ carId, delta });
  }

  updateVolumeDirect(carId: string, value: any) {
    const parsed = parseInt(value) || 0;
    this.volumeDirectChanged.emit({ carId, value: parsed });
  }

  markAnnouncementAsRead(id: string) {
    this.dismissAnnouncement.emit(id);
  }

  onSaveLogsConfirm() {
    if (this.isMonthLocked) return;
    this.isConfirmSubmitModalOpen = true;
  }

  onConfirmSubmit() {
    this.isConfirmSubmitModalOpen = false;
    this.submitLogs.emit();
  }

  getOverrideForCar(carId: string): ModelOverride | null {
    return this.overrides.find(o => o.car_id === carId) || null;
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  toNumber(val: any): number {
    return Number(val) || 0;
  }

  getCarName(carId: string): string {
    const car = this.allCars.find(c => c.id === carId);
    return car ? `${car.model_name} ${car.base_suffix} (${car.variant})` : 'Unknown Model';
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
}
