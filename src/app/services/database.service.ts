import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'ADMIN' | 'SALES_OFFICER';
  created_at: string;
}

export interface Car {
  id: string;
  model_name: string;
  base_suffix: string;
  variant: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IncentiveSlab {
  id: string;
  min_volume: number;
  max_volume: number | null;
  payout_per_car: number;
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
  private supabase: SupabaseClient | null = null;
  private isSupabaseConfigured = false;

  constructor() {
    // You can define Supabase environment variables below
    const supabaseUrl = ''; // e.g., 'https://your-project.supabase.co'
    const supabaseKey = ''; // e.g., 'your-anon-key'

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isSupabaseConfigured = true;
    } else {
      this.initLocalStorageSeed();
    }
  }

  // --- LOCALSTORAGE SEED ENGINE ---
  private initLocalStorageSeed() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem('toyota_users')) {
      // Seed default accounts (passwords hashed using SHA-256)
      // admin123 -> 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
      // sales123 -> 9857d42cf38a0f0d235889ff22cb434e3416ffdf4fa87679cfb6fa0f19c99616
      localStorage.setItem('toyota_users', JSON.stringify([
        {
          id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          username: 'admin',
          password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
          name: 'Toyota Admin Portal',
          role: 'ADMIN',
          created_at: new Date().toISOString()
        },
        {
          id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
          username: 'officer1',
          password: '9857d42cf38a0f0d235889ff22cb434e3416ffdf4fa87679cfb6fa0f19c99616',
          name: 'John Doe (Sales Officer)',
          role: 'SALES_OFFICER',
          created_at: new Date().toISOString()
        },
        {
          id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
          username: 'officer2',
          password: '9857d42cf38a0f0d235889ff22cb434e3416ffdf4fa87679cfb6fa0f19c99616',
          name: 'Sarah Smith (Sales Officer)',
          role: 'SALES_OFFICER',
          created_at: new Date().toISOString()
        }
      ]));
    }

    if (!localStorage.getItem('toyota_cars')) {
      localStorage.setItem('toyota_cars', JSON.stringify([
        {
          id: 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
          model_name: 'Camry',
          base_suffix: 'SE',
          variant: 'Hybrid',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
          model_name: 'RAV4',
          base_suffix: 'XLE',
          variant: 'Hybrid',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
          model_name: 'Corolla',
          base_suffix: 'LE',
          variant: 'Gas',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d',
          model_name: 'Highlander',
          base_suffix: 'Limited',
          variant: 'PHEV',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]));
    }

    if (!localStorage.getItem('toyota_slabs')) {
      localStorage.setItem('toyota_slabs', JSON.stringify([
        {
          id: '11111111-2222-3333-4444-555555555555',
          min_volume: 1,
          max_volume: 3,
          payout_per_car: 1000.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '22222222-3333-4444-5555-666666666666',
          min_volume: 4,
          max_volume: 7,
          payout_per_car: 2000.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '33333333-4444-5555-6666-777777777777',
          min_volume: 8,
          max_volume: null,
          payout_per_car: 3500.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]));
    }

    if (!localStorage.getItem('toyota_sales_logs')) {
      localStorage.setItem('toyota_sales_logs', JSON.stringify([]));
    }
  }

  // --- CORE REPOSITORY METHODS ---

  async getUserByUsername(username: string): Promise<User | null> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as User | null;
    } else {
      const users: User[] = JSON.parse(localStorage.getItem('toyota_users') || '[]');
      const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
      return user || null;
    }
  }

  async getCars(): Promise<Car[]> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Car[];
    } else {
      return JSON.parse(localStorage.getItem('toyota_cars') || '[]');
    }
  }

  async addCar(modelName: string, baseSuffix: string, variant: string): Promise<Car> {
    const newCar: Car = {
      id: crypto.randomUUID(),
      model_name: modelName,
      base_suffix: baseSuffix,
      variant: variant,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('cars')
        .insert([newCar])
        .select()
        .single();
      if (error) throw error;
      return data as Car;
    } else {
      const cars = JSON.parse(localStorage.getItem('toyota_cars') || '[]');
      cars.push(newCar);
      localStorage.setItem('toyota_cars', JSON.stringify(cars));
      return newCar;
    }
  }

  async updateCar(id: string, modelName: string, baseSuffix: string, variant: string, active: boolean): Promise<Car> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('cars')
        .update({
          model_name: modelName,
          base_suffix: baseSuffix,
          variant: variant,
          active: active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Car;
    } else {
      const cars: Car[] = JSON.parse(localStorage.getItem('toyota_cars') || '[]');
      const index = cars.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Car not found');
      const updated = {
        ...cars[index],
        model_name: modelName,
        base_suffix: baseSuffix,
        variant: variant,
        active: active,
        updated_at: new Date().toISOString()
      };
      cars[index] = updated;
      localStorage.setItem('toyota_cars', JSON.stringify(cars));
      return updated;
    }
  }

  async deleteCar(id: string): Promise<boolean> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { error } = await this.supabase.from('cars').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      let cars: Car[] = JSON.parse(localStorage.getItem('toyota_cars') || '[]');
      const initLen = cars.length;
      cars = cars.filter(c => c.id !== id);
      localStorage.setItem('toyota_cars', JSON.stringify(cars));
      
      // Cleanup logs
      let logs: SalesLog[] = JSON.parse(localStorage.getItem('toyota_sales_logs') || '[]');
      logs = logs.filter(l => l.car_id !== id);
      localStorage.setItem('toyota_sales_logs', JSON.stringify(logs));
      
      return cars.length < initLen;
    }
  }

  async getSlabs(): Promise<IncentiveSlab[]> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('incentive_slabs')
        .select('*')
        .order('min_volume', { ascending: true });
      if (error) throw error;
      return data as IncentiveSlab[];
    } else {
      const slabs: IncentiveSlab[] = JSON.parse(localStorage.getItem('toyota_slabs') || '[]');
      return slabs.sort((a, b) => a.min_volume - b.min_volume);
    }
  }

  async saveSlabs(slabs: Omit<IncentiveSlab, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { error: deleteError } = await this.supabase.from('incentive_slabs').delete().neq('id', 'placeholder-uuid-unmatched');
      if (deleteError) throw deleteError;

      if (slabs.length === 0) return true;

      const newSlabs = slabs.map((s, idx) => ({
        id: crypto.randomUUID(),
        min_volume: s.min_volume,
        max_volume: s.max_volume,
        payout_per_car: s.payout_per_car,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: insertError } = await this.supabase.from('incentive_slabs').insert(newSlabs);
      if (insertError) throw insertError;
      return true;
    } else {
      const newSlabs = slabs.map((s, idx) => ({
        id: crypto.randomUUID(),
        min_volume: Number(s.min_volume),
        max_volume: s.max_volume === null ? null : Number(s.max_volume),
        payout_per_car: Number(s.payout_per_car),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      localStorage.setItem('toyota_slabs', JSON.stringify(newSlabs));
      return true;
    }
  }

  async getSalesLogs(userId: string, month: string): Promise<SalesLog[]> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { data, error } = await this.supabase
        .from('sales_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month);
      if (error) throw error;
      return data as SalesLog[];
    } else {
      const logs: SalesLog[] = JSON.parse(localStorage.getItem('toyota_sales_logs') || '[]');
      return logs.filter(l => l.user_id === userId && l.month === month);
    }
  }

  async saveSalesLogs(userId: string, month: string, logs: { carId: string; volume: number }[]): Promise<boolean> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { error: deleteError } = await this.supabase
        .from('sales_logs')
        .delete()
        .eq('user_id', userId)
        .eq('month', month);
      if (deleteError) throw deleteError;

      const newLogs = logs
        .filter(l => l.volume > 0)
        .map(l => ({
          id: crypto.randomUUID(),
          user_id: userId,
          car_id: l.carId,
          volume: l.volume,
          month: month,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

      if (newLogs.length === 0) return true;

      const { error: insertError } = await this.supabase.from('sales_logs').insert(newLogs);
      if (insertError) throw insertError;
      return true;
    } else {
      let salesLogs: SalesLog[] = JSON.parse(localStorage.getItem('toyota_sales_logs') || '[]');
      // Filter out existing logs
      salesLogs = salesLogs.filter(s => !(s.user_id === userId && s.month === month));

      // Append new logs
      logs.forEach(l => {
        if (l.volume > 0) {
          salesLogs.push({
            id: crypto.randomUUID(),
            user_id: userId,
            car_id: l.carId,
            volume: Number(l.volume),
            month: month,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });

      localStorage.setItem('toyota_sales_logs', JSON.stringify(salesLogs));
      return true;
    }
  }
}
