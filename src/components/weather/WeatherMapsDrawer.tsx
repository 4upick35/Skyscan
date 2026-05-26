
"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Target, Zap, ChevronRight } from "lucide-react";
import { audioEngine } from "@/lib/audio-engine";
import { useI18n } from "@/lib/i18n/context";

const WINDY_LANG: Record<string, string> = {
  ru: 'ru',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es',
  zh: 'zh',
  ar: 'ar',
  hi: 'en',
};

interface WeatherMapsDrawerProps {
  lat: number;
  lon: number;
  location: string;
}

export default function WeatherMapsDrawer({ lat, lon, location }: WeatherMapsDrawerProps) {
  const { t, language } = useI18n();
  const [open, setOpen] = useState(false);

  const handleToggle = (isOpen: boolean) => {
    setOpen(isOpen);
    if (audioEngine) {
      audioEngine.playWhoosh();
    }
  };

  const windyLang = WINDY_LANG[language] || 'en';

  const getWindyIframe = (overlay: string) => {
    return (
      <div className="relative w-full h-full overflow-hidden bg-black">
        <div className="absolute inset-0 z-20 pointer-events-none opacity-[0.05]" 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(57, 255, 20, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 20, 0.2) 1px, transparent 1px)',
               backgroundSize: '40px 40px' 
             }}>
        </div>

        <iframe
          width="100%"
          height="100%"
          src={`https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&zoom=11&level=surface&overlay=${overlay}&menu=&message=&marker=&calendar=&pressure=&type=map&metricWind=default&metricTemp=default&radarRange=-1&lang=${windyLang}`}
          frameBorder="0"
          className="w-full h-full border-none outline-none"
          style={{ 
            filter: 'brightness(0.9) contrast(1.1) saturate(1.3)',
          }}
        ></iframe>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleToggle}>
      <SheetTrigger asChild>
        <button className="fixed right-0 top-1/2 -translate-y-1/2 z-40 h-32 w-8 bg-black/80 border-l border-y border-primary/30 flex flex-col items-center justify-center hover:bg-primary/20 hover:border-primary/60 transition-all group overflow-hidden shadow-[0_0_20px_rgba(57,255,20,0.1)] pointer-events-auto">
          <Radio className="h-4 w-4 text-primary/40 group-hover:text-primary mb-2 shrink-0 animate-pulse" />
          <span className="[writing-mode:vertical-lr] text-[0.5625rem] font-headline text-primary/50 tracking-[0.1em] uppercase group-hover:text-primary whitespace-nowrap transition-colors">
            {t('drawer.sat_orbital')}
          </span>
          <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-primary/20 group-hover:bg-primary/50"></div>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-[#050505] border-l border-primary/20 p-0 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.9)]">
        <div className="flex h-full relative">
          <button 
            onClick={() => handleToggle(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 h-32 w-8 bg-black/90 border-r border-y border-primary/40 flex flex-col items-center justify-center hover:bg-primary/10 transition-all group shadow-xl"
          >
            <ChevronRight className="h-4 w-4 text-primary mb-1 group-hover:-translate-x-1 transition-transform rotate-180" />
            <span className="[writing-mode:vertical-lr] text-[0.5rem] font-headline text-primary/60 tracking-[0.1em] uppercase group-hover:text-primary rotate-180">
              {t('drawer.return')}
            </span>
          </button>

          <div className="flex-1 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            <SheetHeader className="p-6 border-b border-primary/10 bg-black/40">
              <div className="flex justify-between items-start">
                <div>
                  <SheetTitle className="text-primary font-headline tracking-widest uppercase flex items-center gap-3 text-lg">
                    <Target className="h-5 w-5 animate-pulse text-accent" />
                    {t('drawer.orbital_intercept')}
                  </SheetTitle>
                  <SheetDescription className="text-primary/40 font-code text-[0.625rem] uppercase mt-1">
                    {t('drawer.stream')}: {location} // {lat.toFixed(4)}N {lon.toFixed(4)}E // {t('drawer.status_active')}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="radar" className="flex-1 flex flex-col" onValueChange={() => audioEngine?.playClick()}>
              <div className="px-6 py-2 bg-black/60 border-b border-primary/5">
                <TabsList className="bg-primary/5 border border-primary/10 w-full grid grid-cols-4 h-10 p-1 gap-1">
                  <TabsTrigger value="radar" className="text-[0.5625rem] font-code uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                    {t('drawer.radar')}
                  </TabsTrigger>
                  <TabsTrigger value="wind" className="text-[0.5625rem] font-code uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                    {t('drawer.vector')}
                  </TabsTrigger>
                  <TabsTrigger value="temp" className="text-[0.5625rem] font-code uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                    {t('drawer.thermo')}
                  </TabsTrigger>
                  <TabsTrigger value="pressure" className="text-[0.5625rem] font-code uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all">
                    {t('drawer.baro')}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 relative bg-black">
                <TabsContent value="radar" className="m-0 w-full h-full absolute inset-0">
                  {getWindyIframe("rain")}
                </TabsContent>
                <TabsContent value="wind" className="m-0 w-full h-full absolute inset-0">
                  {getWindyIframe("wind")}
                </TabsContent>
                <TabsContent value="temp" className="m-0 w-full h-full absolute inset-0">
                  {getWindyIframe("temp")}
                </TabsContent>
                <TabsContent value="pressure" className="m-0 w-full h-full absolute inset-0">
                  {getWindyIframe("pressure")}
                </TabsContent>
              </div>
            </Tabs>

            <div className="p-3 border-t border-primary/10 bg-black flex justify-between items-center px-6">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-[0.5rem] font-code text-primary/40 uppercase">{t('drawer.sync_ok')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-accent" />
                  <span className="text-[0.5rem] font-code text-primary/40 uppercase">{t('drawer.pwr_max')}</span>
                </div>
              </div>
              <p className="font-code text-[0.5rem] text-primary/30 uppercase tracking-[0.2em]">
                {t('drawer.warning')}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
