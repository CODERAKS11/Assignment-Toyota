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
  created_at: string;
}

export interface Car {
  id: string;
  model_name: string;
  base_suffix: string;
  variant: string;
  ex_showroom_price?: string;
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

  async addCar(modelName: string, baseSuffix: string, variant: string, exShowroomPrice: string = ''): Promise<Car> {
    const payload = {
      model_name: modelName,
      base_suffix: baseSuffix,
      variant,
      ex_showroom_price: exShowroomPrice
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
    exShowroomPrice: string = ''
  ): Promise<Car> {
    const payload = {
      model_name: modelName,
      base_suffix: baseSuffix,
      variant,
      active,
      ex_showroom_price: exShowroomPrice
    };
    return lastValueFrom(
      this.http.put<Car>(`${this.apiUrl}/cars/${id}`, payload, { headers: this.getHeaders() })
    );
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

  async getSlabs(): Promise<IncentiveSlab[]> {
    try {
      const res = await lastValueFrom(
        this.http.get<IncentiveSlab[]>(`${this.apiUrl}/slabs`, { headers: this.getHeaders() })
      );
      return res || [];
    } catch (err) {
      console.error('Toyota DMS Client: Error querying incentive slabs:', err);
      return [];
    }
  }

  async saveSlabs(slabs: Omit<IncentiveSlab, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    try {
      await lastValueFrom(
        this.http.put(`${this.apiUrl}/slabs`, slabs, { headers: this.getHeaders() })
      );
      return true;
    } catch (err) {
      console.error('Toyota DMS Client: Error writing incentive slabs:', err);
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
}
