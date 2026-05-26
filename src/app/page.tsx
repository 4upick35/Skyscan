"use client";

import React, { useState, useEffect, useCallback } from "react";
import WeatherBackground from "@/components/weather/WeatherBackground";
import SearchBox from "@/components/weather/SearchBox";
import WeatherDashboard from "@/components/weather/WeatherDashboard";
import { getWeatherData, geolocateUser, type WeatherData } from "@/lib/weather-service";
import { UmbrellaLogo } from "@/components/weather/UmbrellaLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Unlock, RefreshCw, Unplug, Volume2, VolumeX, ShieldCheck, Settings, Share2, FileText, Clock as ClockIcon, Calendar as CalendarIcon, ShieldAlert, Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { audioEngine } from "@/lib/audio-engine";
import WeatherHistoryDrawer from "@/components/weather/WeatherHistoryDrawer";
import WeatherMapsDrawer from "@/components/weather/WeatherMapsDrawer";
import Screensaver from "@/components/weather/Screensaver";
import { useFirebase, initiateAnonymousSignIn } from "@/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n/context";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/locales";

const LAST_LOCATION_KEY = "sky_scan_last_location";
const IS_LOCKED_KEY = "sky_scan_is_locked";
const WEATHER_CACHE_KEY = "sky_scan_weather_cache";
const AUDIO_ENABLED_KEY = "sky_scan_audio_enabled";
const LAST_UPDATE_TIME_KEY = "sky_scan_last_update_ts";
const AI_CONFIG_STORAGE = "sky_scan_ai_config";
const UMBRELLA_AUTH_KEY = "sky_scan_umbrella_authorized";
const UNLOCK_PASSWORD = "20_02";
const MAIN_INTELLECT_PASSWORD = "35657200!";
const AUTO_REFRESH_THRESHOLD = 60 * 60 * 1000;

interface AIConfig {
  provider: 'umbrella' | 'main_umbrella' | 'deepseek' | 'openai' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

const DEFAULT_CONFIG: AIConfig = {
  provider: 'umbrella',
  apiKey: '',
  model: 'deepseek-chat',
};

export default function SkyScanPage() {
  const [mounted, setMounted] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [unlockError, setUnlockError] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [currentAdvice, setCurrentAdvice] = useState("");
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [isMainAuthorized, setIsMainAuthorized] = useState(false);
  const [showMainPassDialog, setShowMainPassDialog] = useState(false);
  const [mainPassInput, setMainPassInput] = useState("");
  const [criticalError, setCriticalError] = useState(false);

  const { auth, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const { t, setLanguage, showLanguageDialog, setShowLanguageDialog, language, locale } = useI18n();

  useEffect(() => {
    setMounted(true);
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    const locked = localStorage.getItem(IS_LOCKED_KEY) === "true";
    const audioPref = localStorage.getItem(AUDIO_ENABLED_KEY) === "true";
    const umbrellaAuth = localStorage.getItem(UMBRELLA_AUTH_KEY) === "true";
    const savedConfig = localStorage.getItem(AI_CONFIG_STORAGE);

    if (savedConfig) {
      try {
        setAiConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("CONFIG_PARSE_ERROR", e);
      }
    }

    setIsLocked(locked);
    setAudioEnabled(audioPref);
    setIsMainAuthorized(umbrellaAuth);

    if (audioPref && audioEngine) audioEngine.enable();

    const cachedWeather = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cachedWeather) {
      try {
        setWeather(JSON.parse(cachedWeather));
      } catch (e) {
        console.error("CACHE_ERROR", e);
      }
    }
    setLoading(false);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (mounted && !user && !isUserLoading) {
      initiateAnonymousSignIn(auth);
    }
  }, [mounted, user, isUserLoading, auth]);

  useEffect(() => {
    if (mounted && audioEnabled && weather && audioEngine) {
      const condition = weather.condition.toLowerCase();
      const wind = weather.windSpeed;
      let bgSound = null;

      if (condition.includes('гроза') || condition.includes('шторм')) {
        bgSound = '/thunderstorm-with-rain.mp3';
      } else if (condition.includes('дождь') || condition.includes('ливень') || condition.includes('осадки')) {
        bgSound = '/quiet-rain.mp3';
      } else if (condition.includes('снег') || condition.includes('метель')) {
        bgSound = '/cold-winter-wind.mp3';
      } else if (condition.includes('туман')) {
        bgSound = '/eerie-fog-atmosphere.mp3';
      } else if (wind > 20) {
        bgSound = '/the-sound-of-gusty-wind-whistling.mp3';
      } else if (condition.includes('облачно') && wind < 15) {
        bgSound = '/light-breeze.mp3';
      } else if ((condition.includes('ясно') || condition.includes('sunny')) && wind <= 20) {
        bgSound = '/living-summer-morning-forest.mp3';
      }

      if (bgSound) {
        audioEngine.playBackground(bgSound);
      } else {
        audioEngine.stopBackground();
      }
    } else if (mounted && !audioEnabled && audioEngine) {
      audioEngine.stopBackground();
    }
  }, [mounted, audioEnabled, weather]);

  const fetchWeather = async (location: string, saveToCache = true, isManualSearch = false): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setCurrentAdvice("");
    try {
      if (audioEnabled && audioEngine) {
        await audioEngine.enable();
        audioEngine.playPrinter();
      }
      const data = await getWeatherData(location);
      setWeather(data);
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(LAST_UPDATE_TIME_KEY, Date.now().toString());
      if (saveToCache) localStorage.setItem(LAST_LOCATION_KEY, location);
      return true;
    } catch (err) {
      setError(isManualSearch ? "ОШИБКА_СИНХРОНИЗАЦИИ" : t('app.system_failure'));
      if (audioEnabled && audioEngine) audioEngine.playError();
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleLocate = useCallback(async () => {
    if (isLocating) return;
    if (audioEnabled && audioEngine) {
      await audioEngine.enable();
      audioEngine.playClick();
    }
    setIsLocating(true);
    setError(null);
    try {
      const loc = await geolocateUser();
      await fetchWeather(loc, true, false);
    } catch (err) {
      await fetchWeather("55.7558,37.6173", false, false);
    } finally {
      setIsLocating(false);
    }
  }, [audioEnabled, isLocating]);

  useEffect(() => {
    if (mounted && !isLocked) {
      const cachedLocation = localStorage.getItem(LAST_LOCATION_KEY);
      if (cachedLocation) {
        fetchWeather(cachedLocation, false, false);
      } else {
        handleLocate();
      }
    }
  }, [mounted, isLocked]);

  const toggleAudio = useCallback(async () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    localStorage.setItem(AUDIO_ENABLED_KEY, newState.toString());
    if (audioEngine) {
      if (newState) {
        await audioEngine.enable();
        audioEngine.playClick();
      } else {
        audioEngine.disable();
      }
    }
  }, [audioEnabled]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === UNLOCK_PASSWORD) {
      if (audioEnabled && audioEngine) audioEngine.playClick();
      setIsLocked(false);
      localStorage.setItem(IS_LOCKED_KEY, "false");
      setPassInput("");
    } else {
      if (audioEnabled && audioEngine) audioEngine.playError();
      setUnlockError(true);
      setPassInput("");
      setTimeout(() => setUnlockError(false), 2000);
    }
  };

  const saveAiConfig = (config: AIConfig) => {
    setAiConfig(config);
    localStorage.setItem(AI_CONFIG_STORAGE, JSON.stringify(config));
    if (audioEnabled && audioEngine) audioEngine.playClick();
  };

  const handleMainPassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mainPassInput === MAIN_INTELLECT_PASSWORD) {
      setIsMainAuthorized(true);
      localStorage.setItem(UMBRELLA_AUTH_KEY, "true");
      setShowMainPassDialog(false);
      saveAiConfig({ ...aiConfig, provider: 'main_umbrella' });
    } else {
      if (audioEnabled && audioEngine) audioEngine.playError();
      setMainPassInput("");
    }
    setMainPassInput("");
  };

  const handleShare = () => {
    if (!weather) return;
    const text = `SkyScan Umbrella Corp Terminal :: ${weather.city}, ${weather.condition}, ${weather.temperature}°C, ветер ${weather.windSpeed} км/ч`;
    if (navigator.share) {
      navigator.share({ title: 'SkyScan Weather', text }).catch(() => {});
    }
  };

  const handleScreensaverOpen = () => setIsScreensaverActive(true);

  const handleScreenTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      handleScreensaverOpen();
    }
    setLastTap(now);
  };

  if (!mounted) return <main className="h-screen bg-black" />;

  return (
    <main className="h-screen relative overflow-hidden flex flex-col bg-transparent" onClick={handleScreenTap}>
      {criticalError && (
        <div className="fixed inset-0 z-[1000] bg-destructive flex items-center justify-center animate-pulse p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <ShieldAlert className="h-32 w-32 mx-auto text-white animate-bounce" />
            <h1 className="text-4xl font-headline font-bold text-white uppercase">ACCESS_DENIED</h1>
            <p className="text-xl font-code text-white/80 uppercase">НЕСАНКЦИОНИРОВАННЫЙ ДОСТУП ВЫЯВЛЕН. СЛУЖБА БЕЗОПАСНОСТИ ВЫЕХАЛА.</p>
          </div>
        </div>
      )}

      <div className="scanline pointer-events-none fixed inset-0 z-[9999] opacity-[0.15]"></div>
      <WeatherBackground condition={weather?.condition} windSpeed={weather?.windSpeed || 0} />

      {isScreensaverActive && weather && (
        <Screensaver weather={weather} advice={currentAdvice} onClose={() => setIsScreensaverActive(false)} />
      )}

      <div className={cn(
        "fixed inset-0 flex items-center justify-center bg-[#030303] z-[100] transition-opacity duration-700 pointer-events-none",
        (!loading) ? "opacity-0" : "opacity-100"
      )}>
        <div className="flex flex-col items-center gap-8">
          <UmbrellaLogo className="h-28 w-28 animate-spin-3d text-primary drop-shadow-[0_0_25px_rgba(57,255,20,0.6)]" />
          <div className="font-code text-xs animate-pulse tracking-[0.5em] text-primary uppercase">{t('app.initializing')}</div>
        </div>
      </div>

      <div className="flex-1 relative z-10 flex flex-col overflow-y-auto custom-scrollbar bg-transparent">
        <div className="w-full flex flex-col p-4 md:p-8 max-w-7xl mx-auto min-h-full">
          {isLocked ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-[340px] w-full border-2 border-destructive p-8 bg-[#030303] space-y-6 backdrop-blur-md shadow-[0_0_50px_rgba(255,0,0,0.2)]">
                <div className="flex flex-col items-center gap-4 text-destructive">
                  <UmbrellaLogo className="h-24 w-24 animate-spin-3d text-destructive drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]" />
                  <h1 className="text-lg font-headline font-bold uppercase tracking-widest text-center">{t('app.system_locked')}</h1>
                </div>
                <form onSubmit={handleUnlock} className="space-y-4">
                  <Input type="password" className={cn("bg-black text-destructive font-code text-center tracking-[0.5em] h-12 placeholder:text-destructive/20 border-destructive/50", unlockError && "animate-shake border-destructive")} value={passInput} onChange={(e) => setPassInput(e.target.value)} placeholder={t('app.code_placeholder')} />
                  <Button type="submit" className="w-full bg-destructive text-black hover:bg-destructive/80 h-12 font-bold">
                    <Unlock className="h-4 w-4 mr-2" /> {t('app.authorize')}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <UmbrellaLogo className="h-10 w-10 text-primary" />
                  <div>
                    <h1 className="text-sm font-headline font-bold uppercase tracking-widest">{t('app.title')}</h1>
                    <div className="flex items-center gap-1 text-[10px] font-code text-primary/70">
                      <ShieldCheck className="h-3 w-3" />
                      <span>UMBRELLA SECURE TERMINAL v7.3</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isOffline && <Unplug className="h-4 w-4 text-destructive" />}
                  <Button variant="ghost" size="icon" onClick={handleLocate} disabled={isLocating}>
                    <RefreshCw className={cn("h-4 w-4", isLocating && "animate-spin")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={toggleAudio}>
                    {audioEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon"><FileText className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#030303] border-primary/20 max-w-md">
                      <DialogHeader><DialogTitle className="text-primary uppercase tracking-widest">{t('app.history')}</DialogTitle></DialogHeader>
                      <WeatherHistoryDrawer />
                    </DialogContent>
                  </Dialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#030303] border-primary/20">
                      <DropdownMenuItem onClick={() => setShowMainPassDialog(true)}>
                        <ShieldAlert className="h-4 w-4 mr-2" /> {t('app.main_intellect')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {error && (
                <div className="w-full border border-destructive/50 bg-destructive/10 p-3 mb-4 rounded-md text-center font-code text-sm text-destructive animate-pulse">
                  {error}
                </div>
              )}

              <SearchBox onSearch={(loc) => fetchWeather(loc, true, true)} onLocate={handleLocate} isLocating={isLocating} />

              {weather && <WeatherDashboard weather={weather} aiConfig={aiConfig} isMainAuthorized={isMainAuthorized} currentAdvice={currentAdvice} setCurrentAdvice={setCurrentAdvice} />}
            </>
          )}

          {showMainPassDialog && (
            <Dialog open={showMainPassDialog} onOpenChange={setShowMainPassDialog}>
              <DialogContent className="bg-[#030303] border-primary/20 max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-primary uppercase tracking-widest text-center">{t('app.main_intellect')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleMainPassSubmit} className="space-y-4">
                  <Input type="password" className="bg-black text-primary font-code text-center tracking-[0.5em] h-12 border-primary/50" value={mainPassInput} onChange={(e) => setMainPassInput(e.target.value)} placeholder="••••••••••" />
                  <Button type="submit" className="w-full bg-primary text-black hover:bg-primary/80 h-12 font-bold">
                    <Unlock className="h-4 w-4 mr-2" /> {t('app.authorize')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </main>
  );
}
