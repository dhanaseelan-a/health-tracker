// ============================================================
// Daily Health — Type Definitions
// ============================================================

// ---------- Food ----------
export interface FoodEntry {
  id: string;
  foodName: string;
  portion: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber?: number;
  sugar?: number;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  notes?: string;
  source: 'manual' | 'ai';
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

export interface FoodEntryInput {
  foodName: string;
  portion: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber?: number;
  sugar?: number;
  date: string;
  time: string;
  notes?: string;
  source?: 'manual' | 'ai';
}

// ---------- Weight ----------
export interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;        // YYYY-MM-DD
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeightEntryInput {
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  note?: string;
}

// ---------- BMI ----------
export interface BMIEntry {
  id: string;
  bmi: number;
  weight: number;
  height: number;
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  date: string;
  createdAt: string;
}

export interface BMIInput {
  weight: number;
  height: number;
  heightInches?: number;  // for imperial (ft + in)
  weightUnit: 'kg' | 'lbs';
  heightUnit: 'cm' | 'ft';
  age?: number;
  gender?: 'male' | 'female' | 'other' | '';
}

// ---------- Water ----------
export interface WaterEntry {
  id: string;
  amount: number; // in ml
  date: string;   // YYYY-MM-DD
  createdAt: string;
}

export interface WaterEntryInput {
  amount: number;
  date: string;
}

// ---------- Profile ----------
export interface UserProfile {
  id: string;
  name: string;
  height: number;
  heightUnit: 'cm' | 'ft';
  heightInches?: number;
  age?: number;
  gender?: 'male' | 'female' | 'other' | '';
  preferredUnits: 'metric' | 'imperial';
  createdAt: string;
  updatedAt: string;
}

// ---------- Daily Targets ----------
export interface DailyTargets {
  id: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber?: number;
  sugar?: number;
  water?: number; // Target water in ml
  trackCarbs: boolean;
  updatedAt: string;
}

// ---------- Weight Goal ----------
export interface WeightGoal {
  id: string;
  startWeight: number;
  targetWeight: number;
  unit: 'kg' | 'lbs';
  startDate: string;
  updatedAt: string;
}

// ---------- AI Settings ----------
export interface AISettings {
  id: string;
  // Photo Scan API (Vision)
  baseUrl: string;
  apiKey: string;
  modelId: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  
  // Text Analysis API (Health Advice / Manual Entry)
  textBaseUrl: string;
  textApiKey: string;
  textModelId: string;
  textInputTokenLimit: number;
  textOutputTokenLimit: number;
  
  updatedAt: string;
}

export interface AISettingsInput {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  
  textBaseUrl: string;
  textApiKey: string;
  textModelId: string;
  textInputTokenLimit: number;
  textOutputTokenLimit: number;
}

// ---------- AI Analysis ----------
export interface AIAnalysisResult {
  foodName: string;
  portion: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber?: number;
  sugar?: number;
  confidence: number;
  notes: string;
}

// ---------- Backup ----------
export interface BackupData {
  version: string;
  exportedAt: string;
  profile: UserProfile | null;
  dailyTargets: DailyTargets | null;
  weightGoal: WeightGoal | null;
  foodEntries: FoodEntry[];
  weightEntries: WeightEntry[];
  bmiEntries: BMIEntry[];
  waterEntries: WaterEntry[];
}

export interface BackupMetadata {
  id: string;
  source: 'local' | 'google_drive';
  fileName: string;
  fileSize: number;
  createdAt: string;
  driveFileId?: string;
}

// ---------- Google Drive ----------
export interface DriveConnection {
  connected: boolean;
  email?: string;
  lastBackup?: string;
}

// ---------- API Responses ----------
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---------- Nutrition Summary ----------
export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalFiber: number;
  totalSugar: number;
  entries: FoodEntry[];
}

// ---------- Weight Progress ----------
export interface WeightProgress {
  currentWeight: number;
  startWeight: number;
  targetWeight: number;
  totalChange: number;
  remainingChange: number;
  progressPercentage: number;
  direction: 'loss' | 'gain';
  unit: 'kg' | 'lbs';
}

// ---------- Navigation ----------
export type NavSection = 'today' | 'food' | 'progress' | 'bmi' | 'settings';
