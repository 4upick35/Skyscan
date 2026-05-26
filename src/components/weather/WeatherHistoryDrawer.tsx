"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { History, ChevronLeft } from "lucide-react";
import { getWeatherHistory, type WeatherHistoryItem } from "@/lib/weather-service";
import WeatherIcon from "./WeatherIcon";
import { UmbrellaLogo } from "./UmbrellaLogo";
import { audioEngine } from "@/lib/audio-engine";
import { useI18n } from "@/lib/i18n/context";

const LOCALE_MAP: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  zh: 'zh-CN',
  ar: 'ar-SA',
  hi: 'hi-IN',
};

interface WeatherHistoryDrawerProps {
  lat: number;
  lon: number;
  location: string;
}

export default function WeatherHistoryDrawer({ lat, lon, location }: WeatherHistoryDrawerProps) {
  const { t, language, locale } = useI18n();
  const [history, setHistory] = useState<WeatherHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleToggle = (isOpen: boolean) => {
    setOpen(isOpen);
    if (audioEngine) {
      audioEngine.playWhoosh();
    }
  };

  useEffect(() => {
    if (open) {
      const fetchHistory = async () => {
        setHistory([]);
        setLoading(true);
        try {
          const data = await getWeatherHistory(lat, lon);
          setHistory(data);
        } catch (err) {
          console.error("FAILED_TO_LOAD_HISTORY", err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [open, lat, lon]);

  const translateCondition = (condition: string) => {
    if (!locale || !locale.weatherConditions) return condition;
    const lower = condition.toLowerCase().trim();
    return locale.weatherConditions[lower] || condition;
  };

  const dateLocale = LOCALE_MAP[language] || 'en-US';

  return (
    <Sheet open={open} onOpenChange={handleToggle}>
      <SheetTrigger asChild>
        <button className="fixed left-0 top-1/2 -translate-y-1/2 z-40 h-32 w-8 bg-black/80 border-r border-y border-primary/30 flex flex-col items-center justify-center hover:bg-primary/20 hover:border-primary/60 transition-all group shadow-[0_0_20px_rgba(57,255,20,0.1)] pointer-events-auto">
          <History className="h-4 w-4 text-primary/40 group-hover:text-primary mb-2 shrink-0 animate-pulse" />
          <span className="[writing-mode:vertical-lr] text-[0.5625rem] font-headline text-primary/50 tracking-[0.1em] uppercase group-hover:text-primary whitespace-nowrap transition-colors rotate-180">
            {t('drawer.log_recovery')}
          </span>
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/20 group-hover:bg-primary/50"></div>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md bg-[#050505] border-r border-primary/20 p-0 overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.9)]">
        <div className="flex h-full relative">
          <div className="flex-1 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <SheetHeader className="p-6 border-b border-primary/10 bg-black/40">
              <div className="flex justify-between items-start">
                <div>
                  <SheetTitle className="text-primary font-headline tracking-widest uppercase flex items-center gap-3 text-lg">
                    <History className="h-5 w-5 animate-pulse text-accent" />
                    {t('drawer.archive_log')}
                  </SheetTitle>
                  <SheetDescription className="text-primary/40 font-code text-[0.625rem] uppercase mt-1">
                    {t('drawer.source')} // {location} // {t('drawer.depth')}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-primary gap-6">
                  <UmbrellaLogo className="h-14 w-14 animate-spin-3d" />
                  <span className="font-code text-[0.625rem] uppercase animate-pulse tracking-widest">{t('drawer.extracting')}</span>
                </div>
              ) : history.length > 0 ? (
                history.map((item, idx) => (
                  <div key={idx} className="group relative border border-primary/10 bg-black/40 p-4 hover:bg-primary/5 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/60 transition-colors"></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12">
                          <div className="text-[0.625rem] font-headline text-primary/40 uppercase">
                            {new Date(item.date).toLocaleDateString(dateLocale, { weekday: 'short' })}
                          </div>
                          <div className="text-[0.5625rem] font-code text-primary/20">{item.date}</div>
                        </div>
                        <WeatherIcon condition={item.condition} className="h-6 w-6" />
                        <div className="text-xs font-headline text-primary uppercase">{translateCondition(item.condition)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-headline text-primary">{Math.round(item.maxTemp)}°</div>
                        <div className="text-[0.5625rem] font-code text-primary/40">{Math.round(item.minTemp)}°</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 text-primary/20 font-code text-xs uppercase">{t('drawer.no_logs')}</div>
              )}
            </div>
          </div>

          <button 
            onClick={() => handleToggle(false)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-50 h-32 w-8 bg-black/90 border-l border-y border-primary/40 flex flex-col items-center justify-center hover:bg-primary/10 transition-all group shadow-xl"
          >
            <ChevronLeft className="h-4 w-4 text-primary mb-1 group-hover:translate-x-1 transition-transform rotate-180" />
            <span className="[writing-mode:vertical-lr] text-[0.5rem] font-headline text-primary/60 tracking-[0.1em] uppercase group-hover:text-primary">
              {t('drawer.return')}
            </span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
