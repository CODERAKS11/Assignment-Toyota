import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucideEdit2,
  LucideTrash2,
  LucideX,
  LucideCar,
  LucideRefreshCw
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle } from '../../../services/database.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideEdit2,
    LucideTrash2,
    LucideX,
    LucideCar,
    LucideRefreshCw
  ],
  templateUrl: './inventory.component.html',
  styleUrls: ['../admin.component.css']
})
export class AdminInventoryComponent {
  @Input() cars: Vehicle[] = [];
  @Input() isLoadingCars = false;
  
  @Output() carSaved = new EventEmitter<void>();
  @Output() carDeleted = new EventEmitter<void>();

  isCarModalOpen = false;
  editingCar: Vehicle | null = null;
  modelName = '';
  baseSuffix = '';
  variant = '';
  exShowroomPrice = '';
  segment = 'SUV';
  launchStatus = 'ACTIVE';
  eligibleForIncentive = true;
  isActive = true;

  constructor(
    private db: DatabaseService,
    private notification: NotificationService
  ) {}

  openAddCarModal() {
    this.editingCar = null;
    this.modelName = '';
    this.baseSuffix = '';
    this.variant = '';
    this.exShowroomPrice = '';
    this.segment = 'SUV';
    this.launchStatus = 'ACTIVE';
    this.eligibleForIncentive = true;
    this.isActive = true;
    this.isCarModalOpen = true;
  }

  openEditCarModal(car: Vehicle) {
    this.editingCar = car;
    this.modelName = car.model_name;
    this.baseSuffix = car.base_suffix;
    this.variant = car.variant;
    this.exShowroomPrice = car.ex_showroom_price || '';
    this.segment = car.segment || 'SUV';
    this.launchStatus = car.launch_status || 'ACTIVE';
    this.eligibleForIncentive = car.eligible_for_incentive !== undefined ? car.eligible_for_incentive : true;
    this.isActive = car.active;
    this.isCarModalOpen = true;
  }

  async onSaveCar() {
    if (!this.modelName.trim() || !this.baseSuffix.trim() || !this.variant.trim() || !this.segment) return;

    try {
      if (this.editingCar) {
        await this.db.updateCar(
          this.editingCar.id,
          this.modelName.trim(),
          this.baseSuffix.trim(),
          this.variant.trim(),
          this.isActive,
          this.exShowroomPrice.trim(),
          this.segment,
          this.launchStatus,
          this.eligibleForIncentive
        );
        this.notification.success(`Successfully updated specifications for ${this.modelName}`);
      } else {
        await this.db.addCar(
          this.modelName.trim(),
          this.baseSuffix.trim(),
          this.variant.trim(),
          this.exShowroomPrice.trim(),
          this.segment,
          this.launchStatus,
          this.eligibleForIncentive
        );
        this.notification.success(`Successfully registered new vehicle model: ${this.modelName}`);
      }
      this.isCarModalOpen = false;
      this.carSaved.emit();
    } catch (err) {
      console.error('Error saving car:', err);
      this.notification.error('Failed to save vehicle specifications.');
    }
  }

  onCSVSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        const carsToImport: any[] = [];
        
        const startIdx = (lines[0].toLowerCase().includes('model') || lines[0].toLowerCase().includes('suffix')) ? 1 : 0;
        
        for (let i = startIdx; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const parts = line.split(',').map((p: string) => p.trim());
          if (parts.length < 3) continue;
          
          const eligibleRaw = parts[6] ? parts[6].toLowerCase() : 'true';
          const eligible = eligibleRaw === 'true' || eligibleRaw === 'yes' || eligibleRaw === '1';

          carsToImport.push({
            model_name: parts[0],
            base_suffix: parts[1],
            variant: parts[2],
            ex_showroom_price: parts[3] || '',
            segment: parts[4] || 'SUV',
            launch_status: parts[5] || 'ACTIVE',
            eligible_for_incentive: eligible,
            active: true
          });
        }

        if (carsToImport.length === 0) {
          this.notification.error('No valid rows found in the CSV file.');
          return;
        }

        const success = await this.db.bulkImportCars(carsToImport);
        if (success) {
          this.notification.success(`Successfully bulk imported ${carsToImport.length} showroom models!`);
          this.carSaved.emit();
        } else {
          this.notification.error('Failed to save imported variants to database.');
        }
      } catch (err) {
        console.error('Error parsing CSV file:', err);
        this.notification.error('Invalid CSV format. Please ensure correct columns.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  async onDeleteCar(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle model from inventory? This will also remove its associated sales logs.')) return;

    try {
      const deleted = await this.db.deleteCar(id);
      if (deleted) {
        this.notification.success('Vehicle successfully removed from registry inventory.');
        this.carDeleted.emit();
      } else {
        this.notification.error('Vehicle could not be found or deleted.');
      }
    } catch (err) {
      console.error('Error deleting car:', err);
      this.notification.error('Connection failure while removing vehicle model.');
    }
  }
}
