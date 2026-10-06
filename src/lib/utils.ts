// ============================================================
// Daily Health — Utility Functions
// ============================================================

/** Generate a unique ID */
export function generateId(): string {
  // Simple ID generator that doesn't require uuid package
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Get current ISO timestamp */
export function now(): string {
  return new Date().toISOString();
}

/** Get today's date as YYYY-MM-DD */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Get current time as HH:mm */
export function currentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

/** Format a date string for display */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format a date for short display */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Format number with commas */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/** Calculate BMI */
export function calculateBMI(
  weight: number,
  height: number,
  weightUnit: 'kg' | 'lbs',
  heightUnit: 'cm' | 'ft',
  heightInches?: number
): number {
  let weightKg = weightUnit === 'lbs' ? weight * 0.453592 : weight;
  let heightM: number;

  if (heightUnit === 'ft') {
    const totalInches = height * 12 + (heightInches || 0);
    heightM = totalInches * 0.0254;
  } else {
    heightM = height / 100;
  }

  if (heightM <= 0) return 0;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/** Get BMI category */
export function getBMICategory(bmi: number): {
  label: string;
  color: string;
  description: string;
} {
  if (bmi < 18.5) {
    return {
      label: 'Underweight',
      color: '#3b82f6',
      description: 'Below 18.5',
    };
  } else if (bmi < 25) {
    return {
      label: 'Normal weight',
      color: '#22c55e',
      description: '18.5 – 24.9',
    };
  } else if (bmi < 30) {
    return {
      label: 'Overweight',
      color: '#f59e0b',
      description: '25.0 – 29.9',
    };
  } else {
    return {
      label: 'Obese',
      color: '#ef4444',
      description: '30.0 and above',
    };
  }
}

/** Calculate weight progress */
export function calculateWeightProgress(
  startWeight: number,
  targetWeight: number,
  currentWeight: number,
  unit: 'kg' | 'lbs'
): {
  totalChange: number;
  remainingChange: number;
  progressPercentage: number;
  direction: 'loss' | 'gain';
} {
  const totalRequired = Math.abs(targetWeight - startWeight);
  const direction: 'loss' | 'gain' = targetWeight < startWeight ? 'loss' : 'gain';

  if (totalRequired === 0) {
    return {
      totalChange: 0,
      remainingChange: 0,
      progressPercentage: 100,
      direction,
    };
  }

  let achieved: number;
  if (direction === 'loss') {
    achieved = startWeight - currentWeight;
  } else {
    achieved = currentWeight - startWeight;
  }

  const remaining = Math.max(0, totalRequired - achieved);
  const percentage = Math.min(100, Math.max(0, (achieved / totalRequired) * 100));

  return {
    totalChange: Math.round(achieved * 10) / 10,
    remainingChange: Math.round(remaining * 10) / 10,
    progressPercentage: Math.round(percentage),
    direction,
  };
}

/** Validate file type for image upload */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
}

/** Max image size: 10MB */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

/** Validate image size */
export function isValidImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE;
}

/** Compress image to base64 */
export async function compressImage(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Convert weight between units */
export function convertWeight(weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return weight;
  if (from === 'kg') return Math.round(weight * 2.20462 * 10) / 10;
  return Math.round(weight * 0.453592 * 10) / 10;
}

/** Convert height between units */
export function convertHeight(
  value: number,
  inches: number,
  from: 'cm' | 'ft',
  to: 'cm' | 'ft'
): { value: number; inches: number } {
  if (from === to) return { value, inches };
  if (from === 'cm') {
    const totalInches = value / 2.54;
    return {
      value: Math.floor(totalInches / 12),
      inches: Math.round(totalInches % 12),
    };
  }
  return {
    value: Math.round((value * 12 + inches) * 2.54),
    inches: 0,
  };
}

/** Clamp a number */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Simple encryption for API keys at rest (not cryptographically strong, but obfuscates) */
export function obfuscate(text: string): string {
  if (!text) return '';
  return Buffer.from(text).toString('base64');
}

/** Deobfuscate */
export function deobfuscate(encoded: string): string {
  if (!encoded) return '';
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

/** Parse numeric input safely */
export function parseNum(value: string | number, fallback = 0): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(n) ? fallback : n;
}

/** Truncate string */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
