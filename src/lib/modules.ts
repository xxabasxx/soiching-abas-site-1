import { DEFAULT_MODULES, type CalculationModule } from '../types';

function safePath(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().startsWith('#')) return fallback;
  try {
    const url = new URL(value.trim(), document.baseURI);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? value.trim() : fallback;
  } catch {
    return fallback;
  }
}

// These are ordinary document links. No browser storage or iframe sits between a card and its HTML file.
export async function loadModules(signal: AbortSignal): Promise<CalculationModule[]> {
  if (window.location.protocol === 'file:') return DEFAULT_MODULES;
  try {
    const response = await fetch('./workspace.json', { signal, cache: 'no-cache' });
    if (!response.ok) return DEFAULT_MODULES;
    const config: unknown = await response.json();
    if (!config || typeof config !== 'object' || !('modules' in config) || !Array.isArray(config.modules)) return DEFAULT_MODULES;
    const items = config.modules;
    return DEFAULT_MODULES.map((module) => {
      const item = items.find((entry: unknown) => entry && typeof entry === 'object' && 'id' in entry && entry.id === module.id);
      if (!item) return module;
      return {
        ...module,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 70) : module.title,
        english: typeof item.english === 'string' && item.english.trim() ? item.english.trim().slice(0, 50) : module.english,
        description: typeof item.description === 'string' && item.description.trim() ? item.description.trim().slice(0, 180) : module.description,
        titleEn: typeof item.titleEn === 'string' && item.titleEn.trim() ? item.titleEn.trim().slice(0, 70) : module.titleEn,
        descriptionEn: typeof item.descriptionEn === 'string' && item.descriptionEn.trim() ? item.descriptionEn.trim().slice(0, 180) : module.descriptionEn,
        path: safePath(item.path, module.path),
      };
    });
  } catch {
    return DEFAULT_MODULES;
  }
}