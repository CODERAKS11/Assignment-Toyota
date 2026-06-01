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
  LucideSparkles,
  LucideUsers,
  LucideAward
} from '@lucide/angular';
import { DatabaseService, Car as Vehicle, IncentiveSlab as Slab, User, SlabScheme, ModelOverride } from '../../services/database.service';
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
    LucideSparkles,
    LucideUsers,
    LucideAward
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  activeTab: 'inventory' | 'slabs' | 'dashboard' | 'officers' | 'reports' = 'inventory';
  user: User | null = null;

  reportsData: any = null;
  isLoadingReports = true;
  reportsYear = '2026';

  
  cars: Vehicle[] = [];
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

  
  slabs: Slab[] = [];
  isSavingSlabs = false;
  slabFeedback: { type: 'success' | 'error'; message: string } | null = null;

  
  schemes: SlabScheme[] = [];
  selectedSchemeId = '';
  selectedScheme: SlabScheme | null = null;

  
  overrides: ModelOverride[] = [];
  newOverrideCarId = '';
  newOverrideType: 'FLAT' | 'BONUS' = 'FLAT';
  newOverrideAmount = 1000;
  isSavingOverrides = false;

  
  isSchemeModalOpen = false;
  newSchemeName = '';
  newSchemeActivationDate = '';
  newSchemeCloneFromId = '';
  targetBonusType: 'FLAT' | 'PER_CAR' | 'NONE' = 'NONE';
  targetBonusAmount = 0;

  
  officers: User[] = [];
  isLoadingOfficers = true;
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
      this.fetchCars();
      this.fetchStats();
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
          this.fetchCars();
          this.fetchStats();
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

  

  async fetchSchemes() {
    try {
      this.schemes = await this.db.getSchemes();
      if (this.schemes.length > 0) {
        const nowStr = new Date().toISOString().substring(0, 10);
        // Default to first active scheme (activation_date <= today) or first available
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

      if (targetScheme) {
        this.targetBonusType = targetScheme.target_bonus_type || 'NONE';
        this.targetBonusAmount = Number(targetScheme.target_bonus_amount) || 0;
      }
    } catch (err) {
      console.error('Error fetching versioned slabs and overrides:', err);
    } finally {
      this.isLoadingSlabs = false;
    }
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
        await this.fetchSchemes();
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
        await this.fetchSchemes();
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

      await this.fetchSchemes();
      this.fetchStats();
    } catch (err) {
      console.error('Error saving scheme configurations:', err);
      this.notification.error('Connection failure while publishing active scheme settings.');
    } finally {
      this.isSavingSlabs = false;
    }
  }

  // Model overrides methods
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
    this.overrides = this.overrides.filter((_, i) => i !== index);
  }

  async onSaveOverrides() {
    if (this.isSchemeReadOnly) return;
    this.isSavingOverrides = true;

    try {
      const saved = await this.db.saveOverridesByScheme(this.selectedSchemeId, this.overrides);
      if (saved) {
        this.notification.success('Per-model slab overrides successfully published!');
        await this.fetchSlabsAndOverridesForScheme(this.selectedSchemeId);
        this.fetchStats();
      } else {
        this.notification.error('Failed to publish model overrides.');
      }
    } catch (err) {
      console.error('Error saving overrides:', err);
      this.notification.error('Connection failure while publishing model overrides.');
    } finally {
      this.isSavingOverrides = false;
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

  openAddOfficerModal() {
    this.editingOfficer = null;
    this.officerUsername = '';
    this.officerPassword = '';
    this.officerName = '';
    this.officerEmail = '';
    
    // Auto-generate employee ID format
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
    this.officerPassword = ''; // remains blank unless reset
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
      this.fetchOfficers();
      this.fetchStats();
    } catch (err) {
      console.error('Error saving sales officer:', err);
      this.notification.error('Failed to save officer profile.');
    }
  }

  onToggleOfficerStatusTrigger(officer: User, activeState: boolean) {
    if (activeState) {
      // Toggle to active immediately
      this.toggleOfficerStatusDirect(officer.id, true, '');
    } else {
      // Trigger deactivation reason modal
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
        this.fetchOfficers();
        this.fetchStats();
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
        this.fetchOfficers(); // reload to update inline snapshot
        this.fetchStats();
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

  exportYTDToCSV() {
    if (!this.reportsData || !this.reportsData.ytdSummary || this.reportsData.ytdSummary.length === 0) {
      this.notification.error('No YTD summary data available to export.');
      return;
    }

    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += `NIPPON TOYOTA - YEAR-TO-DATE PAYROLL REPORT - ${this.reportsYear}\n`;
      csvContent += 'Sales Officer,Username,YTD Volume Sold,Cumulative Payout (INR)\n';

      this.reportsData.ytdSummary.forEach((row: any) => {
        csvContent += `"${row.name}","${row.username}",${row.ytdVolume},${row.ytdPayout}\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Toyota_YTD_Payroll_Report_${this.reportsYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.notification.success('YTD payroll report exported successfully!');
    } catch (err) {
      this.notification.error('Failed to export YTD report.');
    }
  }
}
