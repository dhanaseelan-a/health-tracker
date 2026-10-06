// ============================================================
// Daily Health — Database Layer (Turso/libsql storage)
// Multi-Tenant Cloud Architecture
// ============================================================

import { createClient } from '@libsql/client';
import type {
  FoodEntry,
  WeightEntry,
  BMIEntry,
  UserProfile,
  DailyTargets,
  WeightGoal,
  AISettings,
  WaterEntry,
} from '@/types';
import { generateId, now } from './utils';

// Connect to Turso Cloud DB (or local fallback if URL is file:)
export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:.data/daily-health.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize Tables for Multi-Tenant Architecture
export async function initializeDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      foodName TEXT NOT NULL,
      portion TEXT,
      calories REAL NOT NULL,
      protein REAL,
      fat REAL,
      carbohydrates REAL,
      fiber REAL,
      sugar REAL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      notes TEXT,
      source TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(userId, date);

    CREATE TABLE IF NOT EXISTS weight_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      weight REAL NOT NULL,
      unit TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(userId, date);

    CREATE TABLE IF NOT EXISTS bmi_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      bmi REAL NOT NULL,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      weightUnit TEXT NOT NULL,
      heightUnit TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_entries (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries(userId, date);

    CREATE TABLE IF NOT EXISTS singletons (
      key TEXT,
      userId TEXT NOT NULL,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      PRIMARY KEY (key, userId)
    );
  `);
}

// Call init. In production this should ideally be part of a deployment script, 
// but we call it here to ensure tables exist.
initializeDatabase().catch(console.error);


async function getSingleton<T>(userId: string, key: string): Promise<T | null> {
  const result = await db.execute({
    sql: 'SELECT value FROM singletons WHERE key = ? AND userId = ?',
    args: [key, userId]
  });
  if (result.rows.length === 0) return null;
  try {
    return JSON.parse(result.rows[0].value as string) as T;
  } catch {
    return null;
  }
}

async function setSingleton<T>(userId: string, key: string, data: T): Promise<void> {
  const value = JSON.stringify(data);
  await db.execute({
    sql: `
      INSERT INTO singletons (key, userId, value, updatedAt) 
      VALUES (?, ?, ?, ?) 
      ON CONFLICT(key, userId) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `,
    args: [key, userId, value, now()]
  });
}

async function deleteSingleton(userId: string, key: string): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM singletons WHERE key = ? AND userId = ?',
    args: [key, userId]
  });
}

// ============================================================
// Food Entries
// ============================================================
export const foodDB = {
  async getAll(userId: string): Promise<FoodEntry[]> {
    const res = await db.execute({
      sql: 'SELECT * FROM food_entries WHERE userId = ? ORDER BY createdAt DESC',
      args: [userId]
    });
    return res.rows as unknown as FoodEntry[];
  },

  async getByDate(userId: string, date: string): Promise<FoodEntry[]> {
    const res = await db.execute({
      sql: 'SELECT * FROM food_entries WHERE userId = ? AND date = ? ORDER BY createdAt DESC',
      args: [userId, date]
    });
    return res.rows as unknown as FoodEntry[];
  },

  async getById(userId: string, id: string): Promise<FoodEntry | null> {
    const res = await db.execute({
      sql: 'SELECT * FROM food_entries WHERE userId = ? AND id = ?',
      args: [userId, id]
    });
    return res.rows.length ? (res.rows[0] as unknown as FoodEntry) : null;
  },

  async create(userId: string, entry: Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<FoodEntry> {
    const newEntry: FoodEntry = {
      ...entry,
      id: generateId(),
      createdAt: now(),
      updatedAt: now(),
    };
    
    await db.execute({
      sql: `
        INSERT INTO food_entries (id, userId, foodName, portion, calories, protein, fat, carbohydrates, fiber, sugar, date, time, notes, source, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        newEntry.id, userId, newEntry.foodName, newEntry.portion || '', newEntry.calories, 
        newEntry.protein || 0, newEntry.fat || 0, newEntry.carbohydrates || 0, newEntry.fiber || 0, 
        newEntry.sugar || 0, newEntry.date, newEntry.time, newEntry.notes || '', newEntry.source || '', 
        newEntry.createdAt, newEntry.updatedAt
      ]
    });
    return newEntry;
  },

  async update(userId: string, id: string, data: Partial<FoodEntry>): Promise<FoodEntry | null> {
    const existing = await this.getById(userId, id);
    if (!existing) return null;
    
    const updated = { ...existing, ...data, updatedAt: now() };
    await db.execute({
      sql: `
        UPDATE food_entries SET
          foodName = ?, portion = ?, calories = ?, protein = ?,
          fat = ?, carbohydrates = ?, fiber = ?, sugar = ?,
          date = ?, time = ?, notes = ?, source = ?, updatedAt = ?
        WHERE id = ? AND userId = ?
      `,
      args: [
        updated.foodName, updated.portion || '', updated.calories, updated.protein,
        updated.fat, updated.carbohydrates, updated.fiber || 0, updated.sugar || 0,
        updated.date, updated.time, updated.notes || '', updated.source || '', updated.updatedAt,
        id, userId
      ]
    });
    return updated;
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'DELETE FROM food_entries WHERE id = ? AND userId = ?',
      args: [id, userId]
    });
    return result.rowsAffected > 0;
  },

  async deleteAll(userId: string): Promise<void> {
    await db.execute({ sql: 'DELETE FROM food_entries WHERE userId = ?', args: [userId] });
  },
};

// ============================================================
// Weight Entries
// ============================================================
export const weightDB = {
  async getAll(userId: string): Promise<WeightEntry[]> {
    const res = await db.execute({ sql: 'SELECT * FROM weight_entries WHERE userId = ? ORDER BY date DESC LIMIT 90', args: [userId] });
    return res.rows as unknown as WeightEntry[];
  },

  async getLatest(userId: string): Promise<WeightEntry | null> {
    const res = await db.execute({ sql: 'SELECT * FROM weight_entries WHERE userId = ? ORDER BY date DESC LIMIT 1', args: [userId] });
    return res.rows.length ? (res.rows[0] as unknown as WeightEntry) : null;
  },

  async create(userId: string, entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<WeightEntry> {
    const newEntry: WeightEntry = { ...entry, id: generateId(), createdAt: now(), updatedAt: now() };
    await db.execute({
      sql: `INSERT INTO weight_entries (id, userId, weight, unit, date, note, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newEntry.id, userId, newEntry.weight, newEntry.unit, newEntry.date, newEntry.note || '', newEntry.createdAt, newEntry.updatedAt]
    });
    return newEntry;
  },

  async update(userId: string, id: string, data: Partial<WeightEntry>): Promise<WeightEntry | null> {
    await db.execute({
      sql: `UPDATE weight_entries SET weight = ?, unit = ?, date = ?, note = ?, updatedAt = ? WHERE id = ? AND userId = ?`,
      args: [data.weight ?? 0, data.unit ?? 'kg', data.date ?? '', data.note ?? '', now(), id, userId]
    });
    const res = await db.execute({ sql: 'SELECT * FROM weight_entries WHERE id = ? AND userId = ?', args: [id, userId] });
    return res.rows.length ? (res.rows[0] as unknown as WeightEntry) : null;
  },
  
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'DELETE FROM weight_entries WHERE id = ? AND userId = ?',
      args: [id, userId]
    });
    return result.rowsAffected > 0;
  },

  async deleteAll(userId: string): Promise<void> {
    await db.execute({ sql: 'DELETE FROM weight_entries WHERE userId = ?', args: [userId] });
  },
};

// ============================================================
// Water Entries
// ============================================================
export const waterDB = {
  async getAll(userId: string): Promise<WaterEntry[]> {
    const res = await db.execute({ sql: 'SELECT * FROM water_entries WHERE userId = ? ORDER BY date DESC', args: [userId] });
    return res.rows as unknown as WaterEntry[];
  },

  async getByDate(userId: string, date: string): Promise<WaterEntry[]> {
    const res = await db.execute({ sql: 'SELECT * FROM water_entries WHERE userId = ? AND date = ?', args: [userId, date] });
    return res.rows as unknown as WaterEntry[];
  },

  async create(userId: string, entry: Omit<WaterEntry, 'id' | 'createdAt'>): Promise<WaterEntry> {
    const newEntry: WaterEntry = { ...entry, id: generateId(), createdAt: now() };
    await db.execute({
      sql: 'INSERT INTO water_entries (id, userId, amount, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [newEntry.id, userId, newEntry.amount, newEntry.date, newEntry.createdAt]
    });
    return newEntry;
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'DELETE FROM water_entries WHERE id = ? AND userId = ?',
      args: [id, userId]
    });
    return result.rowsAffected > 0;
  },
  
  async deleteAll(userId: string): Promise<void> {
    await db.execute({ sql: 'DELETE FROM water_entries WHERE userId = ?', args: [userId] });
  },
};

// ============================================================
// Singletons (Profile, Targets, Settings)
// ============================================================
export const profileDB = {
  async get(userId: string): Promise<UserProfile | null> {
    return getSingleton<UserProfile>(userId, 'profile');
  },
  async save(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const existing = await this.get(userId);
    const data: UserProfile = {
      id: existing?.id || generateId(),
      name: profile.name || existing?.name || '',
      height: profile.height ?? existing?.height ?? 170,
      heightUnit: profile.heightUnit || existing?.heightUnit || 'cm',
      heightInches: profile.heightInches ?? existing?.heightInches ?? 0,
      age: profile.age ?? existing?.age,
      gender: profile.gender ?? existing?.gender ?? '',
      preferredUnits: profile.preferredUnits || existing?.preferredUnits || 'metric',
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
    await setSingleton(userId, 'profile', data);
    return data;
  }
};

export const targetsDB = {
  async get(userId: string): Promise<DailyTargets> {
    const data = await getSingleton<DailyTargets>(userId, 'daily_targets');
    return data || {
      id: generateId(), calories: 2000, protein: 50, fat: 65, carbohydrates: 250,
      fiber: 30, sugar: 50, water: 2500, trackCarbs: true, updatedAt: now(),
    };
  },
  async save(userId: string, targets: Partial<DailyTargets>): Promise<DailyTargets> {
    const existing = await this.get(userId);
    const data: DailyTargets = { ...existing, ...targets, updatedAt: now() };
    await setSingleton(userId, 'daily_targets', data);
    return data;
  }
};

export const weightGoalDB = {
  async get(userId: string): Promise<WeightGoal | null> {
    return getSingleton<WeightGoal>(userId, 'weight_goal');
  },
  async save(userId: string, goal: Partial<WeightGoal>): Promise<WeightGoal> {
    const existing = await this.get(userId);
    const data: WeightGoal = {
      id: existing?.id || generateId(),
      startWeight: goal.startWeight ?? existing?.startWeight ?? 0,
      targetWeight: goal.targetWeight ?? existing?.targetWeight ?? 0,
      unit: goal.unit || existing?.unit || 'kg',
      startDate: goal.startDate || existing?.startDate || new Date().toISOString().split('T')[0],
      updatedAt: now(),
    };
    await setSingleton(userId, 'weight_goal', data);
    return data;
  }
};

export const aiSettingsDB = {
  async get(userId: string): Promise<AISettings | null> {
    return getSingleton<AISettings>(userId, 'ai_settings');
  },
  async save(userId: string, settings: Partial<AISettings>): Promise<AISettings> {
    const existing = await this.get(userId);
    const data: AISettings = {
      id: existing?.id || generateId(),
      baseUrl: settings.baseUrl ?? existing?.baseUrl ?? '',
      apiKey: settings.apiKey ?? existing?.apiKey ?? '',
      modelId: settings.modelId ?? existing?.modelId ?? '',
      inputTokenLimit: settings.inputTokenLimit ?? existing?.inputTokenLimit ?? 4096,
      outputTokenLimit: settings.outputTokenLimit ?? existing?.outputTokenLimit ?? 1024,
      textBaseUrl: settings.textBaseUrl ?? existing?.textBaseUrl ?? '',
      textApiKey: settings.textApiKey ?? existing?.textApiKey ?? '',
      textModelId: settings.textModelId ?? existing?.textModelId ?? '',
      textInputTokenLimit: settings.textInputTokenLimit ?? existing?.textInputTokenLimit ?? 4096,
      textOutputTokenLimit: settings.textOutputTokenLimit ?? existing?.textOutputTokenLimit ?? 1024,
      updatedAt: now(),
    };
    await setSingleton(userId, 'ai_settings', data);
    return data;
  }
};

// ============================================================
// BMI Entries
// ============================================================
export const bmiDB = {
  async getAll(userId: string): Promise<BMIEntry[]> {
    const res = await db.execute({ sql: 'SELECT * FROM bmi_entries WHERE userId = ? ORDER BY date DESC LIMIT 90', args: [userId] });
    return res.rows as unknown as BMIEntry[];
  },

  async create(userId: string, entry: Omit<BMIEntry, 'id' | 'createdAt'>): Promise<BMIEntry> {
    const newEntry: BMIEntry = { ...entry, id: generateId(), createdAt: now() };
    await db.execute({
      sql: `INSERT INTO bmi_entries (id, userId, bmi, weight, height, weightUnit, heightUnit, date, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [newEntry.id, userId, newEntry.bmi, newEntry.weight, newEntry.height, newEntry.weightUnit, newEntry.heightUnit, newEntry.date, newEntry.createdAt]
    });
    return newEntry;
  },
  
  async delete(userId: string, id: string): Promise<boolean> {
    const result = await db.execute({
      sql: 'DELETE FROM bmi_entries WHERE id = ? AND userId = ?',
      args: [id, userId]
    });
    return result.rowsAffected > 0;
  },

  async deleteAll(userId: string): Promise<void> {
    await db.execute({ sql: 'DELETE FROM bmi_entries WHERE userId = ?', args: [userId] });
  },
};

// ============================================================
// Backup / Restore
// ============================================================
export const backupDB = {
  async exportAll(userId: string) {
    const [foodEntries, weightEntries, waterEntries, profile, dailyTargets, weightGoal, aiSettings] = await Promise.all([
      foodDB.getAll(userId),
      weightDB.getAll(userId),
      db.execute({ sql: 'SELECT * FROM water_entries WHERE userId = ?', args: [userId] }),
      profileDB.get(userId),
      targetsDB.get(userId),
      weightGoalDB.get(userId),
      aiSettingsDB.get(userId),
    ]);
    
    return {
      version: '3.0.0', // Updated version for Turso Multi-Tenant schema
      exportedAt: now(),
      profile,
      dailyTargets,
      weightGoal,
      aiSettings,
      foodEntries,
      weightEntries,
      bmiEntries: [],
      waterEntries: waterEntries.rows,
    };
  },

  async importAll(userId: string, data: any): Promise<void> {
    if (data.profile) await profileDB.save(userId, data.profile);
    if (data.dailyTargets) await targetsDB.save(userId, data.dailyTargets);
    if (data.weightGoal) await weightGoalDB.save(userId, data.weightGoal);
    if (data.aiSettings) await aiSettingsDB.save(userId, data.aiSettings);
    
    if (data.foodEntries) {
      await db.execute({ sql: 'DELETE FROM food_entries WHERE userId = ?', args: [userId] });
      for (const entry of data.foodEntries) await foodDB.create(userId, entry);
    }
    if (data.weightEntries) {
      await db.execute({ sql: 'DELETE FROM weight_entries WHERE userId = ?', args: [userId] });
      for (const entry of data.weightEntries) await weightDB.create(userId, entry);
    }
    if (data.waterEntries) {
      await db.execute({ sql: 'DELETE FROM water_entries WHERE userId = ?', args: [userId] });
      for (const entry of data.waterEntries) await waterDB.create(userId, entry);
    }
  },

  async eraseAll(userId: string): Promise<void> {
    await foodDB.deleteAll(userId);
    await weightDB.deleteAll(userId);
    await waterDB.deleteAll(userId);
    await deleteSingleton(userId, 'profile');
    await deleteSingleton(userId, 'daily_targets');
    await deleteSingleton(userId, 'weight_goal');
    await deleteSingleton(userId, 'ai_settings');
  },
};
