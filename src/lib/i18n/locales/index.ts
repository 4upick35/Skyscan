export interface Locale {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  messages: Record<string, string>;
  archiveProtocols: {
    sunny: string[];
    cloudy: string[];
    rain: string[];
    snow: string[];
    storm: string[];
    fog: string[];
    general: string[];
  };
  lethalMarkers: string[];
  corporateFacts: string[];
  weatherExplanations: {
    wind: { high: string; normal: string };
    humidity: { high: string; normal: string };
    pressure: { high: string; normal: string };
    magnetic: { high: string; normal: string };
  };
  weatherConditions: Record<string, string>;
}

export type LanguageCode = 'ru' | 'en' | 'de' | 'fr' | 'es' | 'zh' | 'ar' | 'hi';

export const LANGUAGES: { code: LanguageCode; name: string; nativeName: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
];

const localeModules: Record<string, Locale> = {};

export async function loadLocale(code: LanguageCode): Promise<Locale> {
  if (localeModules[code]) return localeModules[code];
  const mod = await import(`./${code}`);
  localeModules[code] = mod.default;
  return mod.default;
}

export function getLocaleSync(code: LanguageCode): Locale | null {
  return localeModules[code] || null;
}
