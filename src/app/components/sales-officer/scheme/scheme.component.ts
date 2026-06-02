import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  LucideAward,
  LucideTrendingUp,
  LucideShoppingBag,
  LucideAlertCircle,
  LucideGift
} from '@lucide/angular';
import { SlabScheme, IncentiveSlab as Slab, Car as Vehicle, ModelOverride } from '../../../services/database.service';

@Component({
  selector: 'app-sales-officer-scheme',
  standalone: true,
  imports: [
    CommonModule,
    LucideAward,
    LucideTrendingUp,
    LucideShoppingBag,
    LucideAlertCircle,
    LucideGift
  ],
  templateUrl: './scheme.component.html',
  styleUrls: ['../sales-officer.component.css']
})
export class SalesOfficerSchemeComponent {
  @Input() activeScheme: SlabScheme | null = null;
  @Input() slabs: Slab[] = [];
  @Input() allCars: Vehicle[] = [];
  @Input() overrides: ModelOverride[] = [];
  @Input() month = '';
  @Input() targetVolume = 0;
  @Input() eligibleVolume = 0;
  @Input() activeSlab: Slab | null = null;

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  getOverrideForCar(carId: string): ModelOverride | null {
    return this.overrides.find(o => o.car_id === carId) || null;
  }
}
