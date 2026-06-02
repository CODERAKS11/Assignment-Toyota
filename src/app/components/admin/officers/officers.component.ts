import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LucidePlus,
  LucideEdit2,
  LucideSave,
  LucideRefreshCw,
  LucideUsers,
  LucideX,
  LucideAlertTriangle,
  LucideSparkles
} from '@lucide/angular';
import { DatabaseService, User } from '../../../services/database.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-admin-officers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucidePlus,
    LucideEdit2,
    LucideSave,
    LucideRefreshCw,
    LucideUsers,
    LucideX,
    LucideAlertTriangle,
    LucideSparkles
  ],
  templateUrl: './officers.component.html',
  styleUrls: ['../admin.component.css']
})
export class AdminOfficersComponent {
  @Input() officers: User[] = [];
  @Input() analyticsMonth = '';
  @Input() isLoadingOfficers = false;

  @Output() monthChange = new EventEmitter<string>();
  @Output() officerSaved = new EventEmitter<void>();
  @Output() targetSaved = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<void>();

  // Modals state
  isOfficerModalOpen = false;
  editingOfficer: User | null = null;

  officerUsername = '';
  officerPassword = '';
  officerName = '';
  officerEmail = '';
  officerEmployeeId = '';
  officerBranchCode = 'BR-01';
  officerReportingManager = '';
  officerDateOfJoining = '';
  officerDesignation = 'Sales Executive';
  officerContactNumber = '';

  isStatusReasonModalOpen = false;
  statusToggleOfficer: User | null = null;
  statusToggleActive = false;
  statusDeactivationReason = 'Resigned';

  constructor(
    private db: DatabaseService,
    private notification: NotificationService
  ) {}

  onMonthChange(newMonth: string) {
    this.monthChange.emit(newMonth);
  }

  openAddOfficerModal() {
    this.editingOfficer = null;
    this.officerUsername = '';
    this.officerPassword = '';
    this.officerName = '';
    this.officerEmail = '';
    
    const year = new Date().getFullYear();
    const count = this.officers.length + 1;
    this.officerEmployeeId = `TKM-${year}-${String(count).padStart(3, '0')}`;
    
    this.officerBranchCode = 'BR-01';
    this.officerReportingManager = 'Dealership Admin';
    this.officerDateOfJoining = new Date().toISOString().substring(0, 10);
    this.officerDesignation = 'Sales Executive';
    this.officerContactNumber = '';
    this.isOfficerModalOpen = true;
  }

  openEditOfficerModal(officer: User) {
    this.editingOfficer = officer;
    this.officerUsername = officer.username;
    this.officerPassword = ''; 
    this.officerName = officer.name;
    this.officerEmail = officer.email || '';
    this.officerEmployeeId = officer.employee_id || '';
    this.officerBranchCode = officer.branch_code || 'BR-01';
    this.officerReportingManager = officer.reporting_manager || '';
    this.officerDateOfJoining = officer.date_of_joining || '';
    this.officerDesignation = officer.designation || '';
    this.officerContactNumber = officer.contact_number || '';
    this.isOfficerModalOpen = true;
  }

  async onSaveOfficer() {
    if (!this.officerUsername.trim() || !this.officerName.trim()) {
      this.notification.error('Username and Officer Name are required.');
      return;
    }

    if (this.officerEmployeeId && !/^TKM-\d{4}-\d{3}$/.test(this.officerEmployeeId)) {
      this.notification.error('Invalid Employee ID. Must match TKM-YYYY-XXX format.');
      return;
    }

    try {
      if (this.editingOfficer) {
        const payload: Partial<User> = {
          name: this.officerName.trim(),
          email: this.officerEmail.trim(),
          employee_id: this.officerEmployeeId.trim(),
          branch_code: this.officerBranchCode.trim(),
          reporting_manager: this.officerReportingManager.trim(),
          date_of_joining: this.officerDateOfJoining,
          designation: this.officerDesignation.trim(),
          contact_number: this.officerContactNumber.trim()
        };

        await this.db.updateOfficer(this.editingOfficer.id, payload);
        this.notification.success(`Successfully updated HR profile for ${this.officerName}`);
      } else {
        if (!this.officerPassword) {
          this.notification.error('Password is required for registration.');
          return;
        }

        const payload: Omit<User, 'id' | 'created_at'> = {
          username: this.officerUsername.trim().toLowerCase(),
          password: this.officerPassword,
          name: this.officerName.trim(),
          email: this.officerEmail.trim(),
          role: 'SALES_OFFICER',
          active: true,
          employee_id: this.officerEmployeeId.trim(),
          branch_code: this.officerBranchCode.trim(),
          reporting_manager: this.officerReportingManager.trim(),
          date_of_joining: this.officerDateOfJoining,
          designation: this.officerDesignation.trim(),
          contact_number: this.officerContactNumber.trim()
        };

        await this.db.createOfficer(payload);
        this.notification.success(`Registered new sales officer: ${this.officerName}`);
      }

      this.isOfficerModalOpen = false;
      this.officerSaved.emit();
    } catch (err) {
      console.error('Error saving sales officer:', err);
      this.notification.error('Failed to save officer profile.');
    }
  }

  onToggleOfficerStatusTrigger(officer: User, activeState: boolean) {
    if (activeState) {
      this.toggleOfficerStatusDirect(officer.id, true, '');
    } else {
      this.statusToggleOfficer = officer;
      this.statusToggleActive = false;
      this.statusDeactivationReason = 'Resigned';
      this.isStatusReasonModalOpen = true;
    }
  }

  async toggleOfficerStatusDirect(id: string, active: boolean, reason: string) {
    try {
      const updated = await this.db.toggleOfficerStatus(id, active, active ? undefined : reason);
      if (updated) {
        this.notification.success(`Status updated for ${updated.name}`);
        this.statusChanged.emit();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      this.notification.error('Failed to update officer status.');
    }
  }

  onConfirmStatusToggle() {
    if (!this.statusToggleOfficer) return;
    this.toggleOfficerStatusDirect(
      this.statusToggleOfficer.id,
      false,
      this.statusDeactivationReason
    );
    this.isStatusReasonModalOpen = false;
    this.statusToggleOfficer = null;
  }

  async onSaveOfficerTarget(officer: User, targetVol: any) {
    const vol = parseInt(targetVol) || 0;
    try {
      const saved = await this.db.saveTarget(officer.id, this.analyticsMonth, vol);
      if (saved) {
        this.notification.success(`Successfully saved target for ${officer.name}: ${vol} units`);
        this.targetSaved.emit();
      }
    } catch (err) {
      console.error('Error saving target:', err);
      this.notification.error('Failed to update monthly target.');
    }
  }

  formatPercentage(val: number): string {
    if (val === undefined || isNaN(val)) return 'N/A';
    return `${val}%`;
  }

  formatRupee(val: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
