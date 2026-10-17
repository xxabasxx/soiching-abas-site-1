import '../../public/i18n.js';
import '../../public/calculations/engine.js';
import '../../public/calculations/workbook.js';
import arabicFont from '@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2?inline';
import latinFont from '@fontsource-variable/vazirmatn/files/vazirmatn-latin-wght-normal.woff2?inline';
import monoFont from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?inline';

export function cacheCalculatorFonts() {
  try {
    sessionStorage.setItem('volta-calculator-fonts', JSON.stringify({ arabic: arabicFont, latin: latinFont, mono: monoFont }));
  } catch {
    // The calculators and offline downloads do not require session storage.
  }
}

interface CalculatorEngine {
  version: string;
  defaults: Record<string, number>;
  selfTest: () => { ok: boolean; count: number };
  calculate: (values: Record<string, number>, module?: string) => {
    valid: boolean;
    modelValid: boolean;
    scope: string;
    rows: Array<{ key: string; value: number }>;
    displayRows: Array<{ key: string; value: number }>;
    supportRows: Array<{ key: string; value: number }>;
  };
}

export function getCalculatorRuntime() {
  const runtime = globalThis as typeof globalThis & {
    VoltaEngine: CalculatorEngine;
    VoltaReports: { workbook: (result: unknown, project: { name: string; notes: string }, module: string) => Blob; crc32: (bytes: Uint8Array) => number };
  };
  return { engine: runtime.VoltaEngine, reports: runtime.VoltaReports };
}