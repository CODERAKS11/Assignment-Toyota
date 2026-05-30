import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Layers,
  X,
  AlertTriangle,
  Save,
  RefreshCw,
  LogOut,
  Car
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: 'inventory' | 'slabs' = 'inventory';
  user: User | null = null;

  // Inventory State
  cars: Vehicle[] = [];
  isCarModalOpen = false;
  editingCar: Vehicle | null = null;
  modelName = '';
  baseSuffix = '';
  variant = '';
  isActive = true;

  // Slabs State
  slabs: Slab[] = [];
  isSavingSlabs = false;
  slabFeedback: { type: 'success' | 'error'; message: string } | null = null;

  // Loading States
  isLoadingCars = true;
  isLoadingSlabs = true;

  // Icons
  readonly shield = Shield;
  readonly plus = Plus;
  readonly edit2 = Edit2;
  readonly trash2 = Trash2;
  readonly layers = Layers;
  readonly x = X;
  readonly alertTriangle = AlertTriangle;
  readonly save = Save;
  readonly refreshCw = RefreshCw;
  readonly logOut = LogOut;
  readonly car = Car;

  constructor(
    private db: DatabaseService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.auth.getCurrentUser();
    this.fetchCars();
    this.fetchSlabs();
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

  // --- INVENTORY OPERATIONS ---

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
    this.isActive = true;
    this.isCarModalOpen = true;
  }

  openEditCarModal(car: Vehicle) {
    this.editingCar = car;
    this.modelName = car.model_name;
    this.baseSuffix = car.base_suffix;
    this.variant = car.variant;
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
          this.isActive
        );
      } else {
        await this.db.addCar(
          this.modelName.trim(),
          this.baseSuffix.trim(),
          this.variant.trim()
        );
      }
      this.isCarModalOpen = false;
      this.fetchCars();
    } catch (err) {
      console.error('Error saving car:', err);
      alert('Failed to save vehicle specs.');
    }
  }

  async onDeleteCar(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle model from inventory? This will also remove its associated sales logs.')) return;

    try {
      const deleted = await this.db.deleteCar(id);
      if (deleted) {
        this.fetchCars();
      }
    } catch (err) {
      console.error('Error deleting car:', err);
    }
  }

  // --- INCENTIVE SLABS CONFIGURATIONS ---

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
    // Merge update
    this.slabs[index] = { ...this.slabs[index], ...fields };

    // Cascade range adjustments to guarantee continuity (No overlapping boundaries or gaps)
    if (fields.max_volume !== undefined) {
      const currentMax = fields.max_volume;
      
      if (currentMax !== null && currentMax >= this.slabs[index].min_volume) {
        // Sequentially adjust the next slab's minimum
        if (index + 1 < this.slabs.length) {
          this.slabs[index + 1].min_volume = currentMax + 1;
          
          // Recheck if adjacent bounds were violated
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      const lastSlab = this.slabs[len - 1];
      const prevMin = lastSlab.min_volume;
      
      // Give the previous last slab a fixed range limit
      lastSlab.max_volume = prevMin + 2;

      // Append new unlimited slab
      this.slabs.push({
        id: crypto.randomUUID(),
        min_volume: lastSlab.max_volume + 1,
        max_volume: null,
        payout_per_car: lastSlab.payout_per_car + 1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  onRemoveSlab(index: number) {
    this.slabs = this.slabs.filter((_, i) => i !== index);

    if (this.slabs.length > 0) {
      // Force first slab to start at 1
      this.slabs[0].min_volume = 1;

      // Recalculate ranges sequentially
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

      // Final slab must always capture infinity (null)
      this.slabs[this.slabs.length - 1].max_volume = null;
    }
  }

  async onSaveSlabs() {
    this.isSavingSlabs = true;
    this.slabFeedback = null;

    try {
      // Basic validation checks
      for (let i = 0; i < this.slabs.length; i++) {
        const s = this.slabs[i];
        if (s.min_volume < 0 || s.payout_per_car < 0) {
          this.slabFeedback = { type: 'error', message: `Slab ${i+1}: Cannot have negative specifications.` };
          this.isSavingSlabs = false;
          return;
        }
        if (s.max_volume !== null && s.max_volume < s.min_volume) {
          this.slabFeedback = { type: 'error', message: `Slab ${i+1}: Maximum limit must exceed minimum milestone.` };
          this.isSavingSlabs = false;
          return;
        }
      }

      // Save to database service
      await this.db.saveSlabs(this.slabs);
      this.slabFeedback = { type: 'success', message: 'Incentive slabs configuration successfully published!' };
      this.fetchSlabs();
    } catch (err) {
      console.error('Error saving slabs:', err);
      this.slabFeedback = { type: 'error', message: 'Connection failure while saving dynamic slabs.' };
    } finally {
      this.isSavingSlabs = false;
    }
  }
}
