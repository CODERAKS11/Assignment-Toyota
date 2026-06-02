import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePlus,
  LucideLayers,
  LucideTrash2,
  LucideAlertTriangle,
  LucideSparkles,
  LucideCar,
  LucideSave,
  LucideRefreshCw,
  LucideX
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, SlabScheme, ModelOverride } from '../../../services/database.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-slabs',
  standalone: true,
  imports: [
    CommonModule,
    CommonModule,
    FormsModule,
    LucidePlus,
    LucideLayers,
    LucideTrash2,
    LucideAlertTriangle,
    LucideSparkles,
    LucideCar,
    LucideSave,
    LucideRefreshCw,
    LucideX
  ],
  templateUrl: './slabs.component.html',
  styleUrls: ['../admin.component.css']
})
export class AdminSlabsComponent implements OnChanges {
  @Input() cars: Vehicle[] = [];
  @Input() schemes: SlabScheme[] = [];
  @Input() selectedSchemeId = '';
  @Input() selectedScheme: SlabScheme | null = null;
  @Input() slabs: Slab[] = [];
  @Input() overrides: ModelOverride[] = [];
  @Input() isLoadingSlabs = false;

  @Output() schemeSelected = new EventEmitter<string>();
  @Output() schemeDeleted = new EventEmitter<void>();
  @Output() schemeSaved = new EventEmitter<void>();

  isSavingSlabs = false;
  slabFeedback: { type: 'success' | 'error'; message: string } | null = null;
  
  // Scheme Modal local state
  isSchemeModalOpen = false;
  newSchemeName = '';
  newSchemeActivationDate = '';
  newSchemeCloneFromId = '';

  // Local configuration state matching current scheme properties
  targetBonusType: 'FLAT' | 'PER_CAR' | 'NONE' = 'NONE';
  targetBonusAmount = 0;

  // New Override local state
  newOverrideCarId = '';
  newOverrideType: 'FLAT' | 'BONUS' = 'FLAT';
  newOverrideAmount = 1000;
  isSavingOverrides = false;

  constructor(
    private db: DatabaseService,
    private notification: NotificationService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedScheme'] && this.selectedScheme) {
      this.targetBonusType = this.selectedScheme.target_bonus_type || 'NONE';
      this.targetBonusAmount = Number(this.selectedScheme.target_bonus_amount) || 0;
    }
  }

  onSchemeSelected(schemeId: string) {
    this.schemeSelected.emit(schemeId);
  }

  get isHistoricalScheme(): boolean {
    if (!this.selectedScheme) return false;
    const nowStr = new Date().toISOString().substring(0, 10);
    return this.selectedScheme.activation_date < nowStr;
  }

  get isSchemeReadOnly(): boolean {
    return false;
  }

  openAddSchemeModal() {
    this.newSchemeName = '';
    const now = new Date();
    this.newSchemeActivationDate = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`;
    this.newSchemeCloneFromId = this.selectedSchemeId;
    this.isSchemeModalOpen = true;
  }

  async onSaveScheme() {
    if (!this.newSchemeName.trim() || !this.newSchemeActivationDate) return;

    try {
      const created = await this.db.createScheme(
        this.newSchemeName.trim(),
        this.newSchemeActivationDate,
        this.newSchemeCloneFromId || undefined
      );

      if (created) {
        this.notification.success(`Slab scheme version "${this.newSchemeName}" successfully created!`);
        this.isSchemeModalOpen = false;
        this.schemeSaved.emit();
      } else {
        this.notification.error('Failed to create slab scheme.');
      }
    } catch (err) {
      console.error('Error creating scheme:', err);
      this.notification.error('Connection failure while creating scheme.');
    }
  }

  async onDeleteScheme() {
    if (!this.selectedSchemeId || this.isSchemeReadOnly) return;
    if (!confirm(`Are you sure you want to delete the slab scheme "${this.selectedScheme?.name}"? This will also remove all associated slabs and overrides. This action cannot be undone.`)) return;

    try {
      const success = await this.db.deleteScheme(this.selectedSchemeId);
      if (success) {
        this.notification.success('Slab scheme version deleted successfully.');
        this.schemeDeleted.emit();
      } else {
        this.notification.error('Failed to delete slab scheme.');
      }
    } catch (err) {
      console.error('Error deleting scheme:', err);
      this.notification.error('Connection failure while deleting scheme.');
    }
  }

  onUpdateSlab(index: number, fields: Partial<Slab>) {
    if (this.isSchemeReadOnly) return;
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

  async onPublishSchemeSettings() {
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

      let targetSchemeId = this.selectedSchemeId;
      const wasReadOnly = this.isSchemeReadOnly;
      
      if (wasReadOnly && this.selectedScheme) {
        const currentName = this.selectedScheme.name;
        const versionMatch = currentName.match(/v(\d+)$/i);
        let newName = '';
        if (versionMatch) {
          const vNum = parseInt(versionMatch[1], 10) + 1;
          newName = currentName.replace(/v\d+$/i, `v${vNum}`);
        } else {
          newName = `${currentName} v2`;
        }

        const d = new Date();
        const activationDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        const newScheme = await this.db.createScheme(newName, activationDate, this.selectedSchemeId);
        if (newScheme) {
           targetSchemeId = newScheme.id;
           this.selectedScheme = newScheme;
           this.selectedSchemeId = newScheme.id;
        }
      }

      // Save scheme bonuses metadata
      if (this.selectedScheme) {
        await this.db.updateScheme(
          targetSchemeId,
          this.selectedScheme.name,
          this.selectedScheme.activation_date,
          this.targetBonusType,
          this.targetBonusAmount
        );
      }

      // Save progressive slabs
      await this.db.saveSlabs(targetSchemeId, this.slabs);

      // Save model-level overrides under the correct scheme version ID
      const overridesToSave = this.overrides.map(o => ({
        ...o,
        scheme_id: targetSchemeId
      }));
      await this.db.saveOverridesByScheme(targetSchemeId, overridesToSave);
      
      if (wasReadOnly) {
         this.notification.success('New scheme version with all configurations successfully published!');
         await this.db.createAnnouncement(
           `New Incentive Scheme: ${this.selectedScheme?.name}`,
           `A new incentive scheme version (slabs, target bonuses, and overrides) has been published and is active.`
         );
      } else {
         this.notification.success('Incentive scheme configurations (slabs, target, and overrides) published!');
      }

      this.schemeSaved.emit();
    } catch (err) {
      console.error('Error saving scheme configurations:', err);
      this.notification.error('Connection failure while publishing active scheme settings.');
    } finally {
      this.isSavingSlabs = false;
    }
  }

  get eligibleOverrideCars(): Vehicle[] {
    return this.cars.filter(c => c.active && c.eligible_for_incentive && c.launch_status !== 'DISCONTINUED');
  }

  getCarLabel(carId: string): string {
    const car = this.cars.find(c => c.id === carId);
    return car ? `${car.model_name} ${car.base_suffix} (${car.variant})` : 'Unknown Model';
  }

  onAddOverride() {
    if (!this.newOverrideCarId || this.isSchemeReadOnly) return;

    if (this.overrides.some(o => o.car_id === this.newOverrideCarId)) {
      this.notification.error('An override already exists for this vehicle model in this scheme.');
      return;
    }

    const newOverride: ModelOverride = {
      scheme_id: this.selectedSchemeId,
      car_id: this.newOverrideCarId,
      override_type: this.newOverrideType,
      amount: Number(this.newOverrideAmount)
    };

    this.overrides.push(newOverride);
    this.newOverrideCarId = '';
    this.newOverrideAmount = 1000;
  }

  onRemoveOverride(index: number) {
    if (this.isSchemeReadOnly) return;
    this.overrides.splice(index, 1);
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }
}
