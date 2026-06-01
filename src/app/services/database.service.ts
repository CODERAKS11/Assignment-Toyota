import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface User {
  id: string;
  username: string;
  password?: string;
  password_hash?: string;
  name: string;
  role: 'ADMIN' | 'SALES_OFFICER';
  email?: string;
  active?: boolean;
  employee_id?: string;
  branch_code?: string;
  reporting_manager?: string;
  date_of_joining?: string;
  designation?: string;
  contact_number?: string;
  deactivation_reason?: string;
  created_at: string;
  
  // Inline snapshot data for finance manager lookup
  snapshot?: {
    carsSold: number;
    incentiveEarned: number;
    targetVolume: number;
    targetProgressPct: number;
    targetBonusUnlocked: boolean;
  };
}

export interface Car {
  id: string;
  model_name: string;
  base_suffix: string;
  variant: string;
  ex_showroom_price?: string;
  segment: 'SUV' | 'MUV' | 'Sedan' | 'Hatchback' | 'Pickup';
  launch_status: 'ACTIVE' | 'DISCONTINUED' | 'UPCOMING';
  eligible_for_incentive: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncentiveSlab {
  id: string;
  min_volume: number;
  max_volume: number | null;
  payout_per_car: number;
  label?: string;
  created_at: string;
  updated_at: string;
}

export interface SalesLog {
  id: string;
  user_id: string;
  car_id: string;
  volume: number;
  month: string;
  created_at: string;
  updated_at: string;
}

export interface SlabScheme {
  id: string;
  name: string;
  activation_date: string;
  target_bonus_type: 'FLAT' | 'PER_CAR' | 'NONE';
  target_bonus_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModelOverride {
  id?: string;
  scheme_id: string;
  car_id: string;
  override_type: 'FLAT' | 'BONUS';
  amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyTarget {
  id?: string;
  user_id: string;
  month: string;
  target_volume: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReportsAndAudits {
  auditLogs: {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    adminUsername: string;
  }[];
  ytdSummary: {
    id: string;
    name: string;
    username: string;
    ytdVolume: number;
    ytdPayout: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {
    console.log('Toyota DMS Client: Initialized REST client proxy coordination.');
  }

  
  private getHeaders(): HttpHeaders {
    const token = typeof window !== 'undefined' ? localStorage.getItem('toyota_token') : '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  

  async getUserByUsername(username: string): Promise<User | null> {
    
    
    return null;
  }

  async getCars(): Promise<Car[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<Car[]>(`${this.apiUrl}/cars`, { headers: this.getHeaders() })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying cars from Node.js server:', err);
      return [];
    }
  }

  async addCar(
    modelName: string,
    baseSuffix: string,
    variant: string,
    exShowroomPrice: string = '',
    segment: string = 'SUV',
    launchStatus: string = 'ACTIVE',
    eligibleForIncentive: boolean = true
  ): Promise<Car> {
    const payload = {
      model_name: modelName,
      base_suffix: baseSuffix,
      variant,
      ex_showroom_price: exShowroomPrice,
      segment,
      launch_status: launchStatus,
      eligible_for_incentive: eligibleForIncentive
    };
    return lastValueFrom(
      this.http.post<Car>(`${this.apiUrl}/cars`, payload, { headers: this.getHeaders() })
    );
  }

  async updateCar(
    id: string,
    modelName: string,
    baseSuffix: string,
    variant: string,
    active: boolean,
    exShowroomPrice: string = '',
    segment: string = 'SUV',
    launchStatus: string = 'ACTIVE',
    eligibleForIncentive: boolean = true
  ): Promise<Car> {
    const payload = {
      model_name: modelName,
      base_suffix: baseSuffix,
      variant,
      active,
      ex_showroom_price: exShowroomPrice,
      segment,
      launch_status: launchStatus,
      eligible_for_incentive: eligibleForIncentive
    };
    return lastValueFrom(
      this.http.put<Car>(`${this.apiUrl}/cars/${id}`, payload, { headers: this.getHeaders() })
    );
  }

  async bulkImportCars(carsArray: any[]): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.post(`${this.apiUrl}/cars/bulk-import`, { cars: carsArray }, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error bulk importing vehicle variants:', err);
      return false;
    }
  }

  async deleteCar(id: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.delete(`${this.apiUrl}/cars/${id}`, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error deleting car model:', err);
      return false;
    }
  }

  async getSlabs(schemeId?: string, month?: string): Promise<IncentiveSlab[]> {
    try {
      const params: any = {};
      if (schemeId) params.schemeId = schemeId;
      if (month) params.month = month;

      const res = await lastValueFrom(
        this.http.get<IncentiveSlab[]>(`${this.apiUrl}/slabs`, {
          headers: this.getHeaders(),
          params
        })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying incentive slabs:', err);
      return [];
    }
  }

  async saveSlabs(schemeId: string, slabs: Omit<IncentiveSlab, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.put(`${this.apiUrl}/slabs`, { schemeId, slabs }, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error writing incentive slabs:', err);
      return false;
    }
  }

  async getSchemes(): Promise<SlabScheme[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<SlabScheme[]>(`${this.apiUrl}/slabs/schemes`, { headers: this.getHeaders() })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying slab schemes:', err);
      return [];
    }
  }

  async createScheme(name: string, activationDate: string, cloneFromId?: string): Promise<SlabScheme | null> {
    try {
      const payload = { name, activation_date: activationDate, cloneFromId };
      return await lastValueFrom(
        this.http.post<SlabScheme>(`${this.apiUrl}/slabs/schemes`, payload, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error creating slab scheme:', err);
      return null;
    }
  }

  async updateScheme(id: string, name: string, activationDate: string, targetBonusType?: string, targetBonusAmount?: number): Promise<SlabScheme | null> {
    try {
      const payload = { name, activation_date: activationDate, target_bonus_type: targetBonusType, target_bonus_amount: targetBonusAmount };
      return await lastValueFrom(
        this.http.put<SlabScheme>(`${this.apiUrl}/slabs/schemes/${id}`, payload, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error updating slab scheme:', err);
      return null;
    }
  }

  async deleteScheme(id: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.delete(`${this.apiUrl}/slabs/schemes/${id}`, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error deleting slab scheme:', err);
      return false;
    }
  }

  async getOverridesByScheme(schemeId: string): Promise<ModelOverride[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<ModelOverride[]>(`${this.apiUrl}/slabs/overrides/${schemeId}`, { headers: this.getHeaders() })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying overrides by scheme:', err);
      return [];
    }
  }

  async saveOverridesByScheme(schemeId: string, overrides: ModelOverride[]): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.put(`${this.apiUrl}/slabs/overrides/${schemeId}`, overrides, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error writing overrides by scheme:', err);
      return false;
    }
  }

  async getSalesLogs(userId: string, month: string): Promise<SalesLog[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<SalesLog[]>(`${this.apiUrl}/sales-logs`, {
          headers: this.getHeaders(),
          params: { userId, month }
        })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying monthly sales logs:', err);
      return [];
    }
  }

  async saveSalesLogs(userId: string, month: string, logs: { carId: string; volume: number }[]): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.post(`${this.apiUrl}/sales-logs`, { userId, month, logs }, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error saving sales logs:', err);
      return false;
    }
  }

  async getDashboardStats(): Promise<{
    totalActiveCars: number;
    totalSlabTiers: number;
    totalSalesOfficers: number;
    currentMonthVolume: number;
    currentMonth: string;
  }> {
    const cars = await this.getCars();
    const activeCarsCount = cars.filter(c => c.active).length;

    const slabs = await this.getSlabs();
    const slabTiersCount = slabs.length;

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthlyVolume = 0;
    let salesOfficersCount = 0;

    try {
      const analytics = await this.getDetailedAnalytics(currentMonthStr);
      monthlyVolume = analytics.currentMonthVolume;
      salesOfficersCount = analytics.totalSalesOfficers;
    } catch (e) {
      console.warn('Toyota DMS Client: Failure reading analytics statistics for dashboard stats.');
    }

    return {
      totalActiveCars: activeCarsCount,
      totalSlabTiers: slabTiersCount,
      totalSalesOfficers: salesOfficersCount || 2,
      currentMonthVolume: monthlyVolume,
      currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };
  }

  

  async getDetailedAnalytics(month: string): Promise<any> {
    try {
      return await lastValueFrom(
        this.http.get<any>(`${this.apiUrl}/analytics/detailed`, {
          headers: this.getHeaders(),
          params: { month }
        })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error fetching detailed analytics:', err);
      throw err;
    }
  }

  

  async seedMockSalesData(month: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.post(`${this.apiUrl}/analytics/simulate`, { month }, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error seeding simulated sales logs:', err);
      return false;
    }
  }

  

  async getAnnouncements(): Promise<any[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/announcements`, { headers: this.getHeaders() })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying corporate announcements:', err);
      return [];
    }
  }

  async createAnnouncement(title: string, content: string): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.post(`${this.apiUrl}/announcements`, { title, content }, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error creating corporate announcement:', err);
      return false;
    }
  }

  // ==========================================
  // SALES OFFICER HR PROFILE & STATUS ENDPOINTS
  // ==========================================

  async getOfficers(month?: string): Promise<User[]> {
    try {
      const params: any = {};
      if (month) params.month = month;
      
      const res = await lastValueFrom(
        this.http.get<User[]>(`${this.apiUrl}/users`, {
          headers: this.getHeaders(),
          params
        })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying sales officers:', err);
      return [];
    }
  }

  async createOfficer(profile: Omit<User, 'id' | 'created_at'>): Promise<User | null> {
    try {
      return await lastValueFrom(
        this.http.post<User>(`${this.apiUrl}/users`, profile, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error registering sales officer:', err);
      return null;
    }
  }

  async updateOfficer(id: string, profile: Partial<User>): Promise<User | null> {
    try {
      return await lastValueFrom(
        this.http.put<User>(`${this.apiUrl}/users/${id}`, profile, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error updating sales officer profile:', err);
      return null;
    }
  }

  async toggleOfficerStatus(id: string, active: boolean, deactivation_reason?: string): Promise<User | null> {
    try {
      const payload = { active, deactivation_reason };
      return await lastValueFrom(
        this.http.put<User>(`${this.apiUrl}/users/${id}/status`, payload, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error toggling officer status:', err);
      return null;
    }
  }

  // ==========================================
  // MONTHLY TARGET ASSIGNMENT ENDPOINTS
  // ==========================================

  async getTargets(month: string): Promise<MonthlyTarget[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<MonthlyTarget[]>(`${this.apiUrl}/targets`, {
          headers: this.getHeaders(),
          params: { month }
        })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying monthly targets:', err);
      return [];
    }
  }

  async saveTarget(userId: string, month: string, targetVolume: number): Promise<MonthlyTarget | null> {
    try {
      const payload = { userId, month, targetVolume };
      return await lastValueFrom(
        this.http.put<MonthlyTarget>(`${this.apiUrl}/targets`, payload, { headers: this.getHeaders() })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error saving monthly target:', err);
      return null;
    }
  }

  async getReportsAndAudits(year?: string): Promise<ReportsAndAudits | null> {
    try {
      const params: any = {};
      if (year) params.year = year;
      return await lastValueFrom(
        this.http.get<ReportsAndAudits>(`${this.apiUrl}/analytics/reports`, { headers: this.getHeaders(), params })
      );
    } catch (err) {
      console.error('Toyota DMS Client: Error fetching reports and audit logs:', err);
      return null;
    }
  }
}
