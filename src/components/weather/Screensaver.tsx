
"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { WeatherData } from "@/lib/weather-service";
import WeatherIcon from "./WeatherIcon";
import { cn } from "@/lib/utils";
import { UmbrellaLogo } from "./UmbrellaLogo";

interface ScreensaverProps {
  weather: WeatherData;
  advice: string;
  onClose: () => void;
}

export default function Screensaver({ weather, advice, onClose }: ScreensaverProps) {
  const [time, setTime] = useState(new Date());
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Смещение на ±5 пикселей каждые 5 минут для защиты от выгорания
    const shiftInterval = setInterval(() => {
      setOffset({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10
      });
    }, 300000); // 5 минут
    return () => clearInterval(shiftInterval);
  }, []);

  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in (navigator as any)) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err: any) {
        console.warn(`WAKE_LOCK_ERROR: ${err.name}`);
      }
    };
    
    requestWakeLock();
    
    return () => {
      if (wakeLock !== null) {
        wakeLock.release().catch(() => {});
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center cursor-none select-none p-4 md:p-8 overflow-hidden"
      onClick={onClose}
    >
      <div 
        className={cn(
          "flex flex-col landscape:flex-row items-center justify-center gap-20 landscape:gap-16 transition-transform duration-1000 ease-in-out w-full max-w-7xl",
        )}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        {/* Блок Времени и Даты */}
        <div className="flex flex-col items-center landscape:items-start shrink-0">
          <div className="font-headline text-[15vh] landscape:text-[25vh] md:text-[14rem] leading-none font-normal text-hollow tracking-tighter select-none">
            {format(time, 'HH:mm')}
          </div>
          <div className="font-code text-[1.8vh] landscape:text-[4vh] md:text-2xl text-primary/60 uppercase tracking-[0.3em] mt-2">
            {format(time, 'EEEE, d MMMM', { locale: ru })}
          </div>
        </div>
        
        {/* Погодный блок: адаптация под ориентацию */}
        <div className="flex flex-col gap-6 md:gap-10 w-full max-w-lg landscape:max-w-xl">
          <div className="w-full flex items-center justify-center landscape:justify-start gap-6 border-t border-b landscape:border-l landscape:border-t-0 landscape:border-b-0 border-primary/10 py-6 landscape:py-0 landscape:px-10 bg-primary/[0.02] backdrop-blur-sm relative overflow-hidden h-full">
            <div className="absolute top-0 left-0 w-1 landscape:w-1.5 h-full bg-primary/20"></div>
            
            <div className="flex items-center gap-4 shrink-0">
              <WeatherIcon condition={weather.condition} className="h-10 w-10 landscape:h-14 landscape:w-14 text-primary" />
              <div className="flex flex-col">
                <span className="text-3xl landscape:text-5xl font-headline text-primary">{Math.round(weather.temp)}°</span>
                <span className="text-[0.4375rem] landscape:text-[0.5625rem] font-code text-accent uppercase tracking-[0.2em]">{weather.condition}</span>
              </div>
            </div>
            
            <div className="h-12 w-[1px] bg-primary/10 hidden landscape:block" />
            
            <div className="flex-1 text-left overflow-hidden">
              <div className="text-[0.4375rem] landscape:text-[0.5rem] font-headline text-accent/50 uppercase tracking-widest mb-1 flex items-center gap-2">
                <span className="w-1 h-1 bg-accent rounded-full animate-pulse"></span>
                ВЕРДИКТ_ОРАКУЛА
              </div>
              <div className="font-code text-[0.5625rem] landscape:text-sm text-primary/80 italic leading-relaxed line-clamp-3">
                "{advice || "СИСТЕМА РАБОТАЕТ В РЕЖИМЕ ГЛУБОКОГО МОНИТОРИНГА."}"
              </div>
            </div>
          </div>

          {/* Логотип: ярче и с анимацией */}
          <div className="flex items-center justify-center landscape:justify-start gap-3 text-[0.4375rem] landscape:text-[0.5625rem] font-code text-primary/50 uppercase tracking-[0.4em] animate-pulse">
            <UmbrellaLogo className="h-6 w-6 landscape:h-8 landscape:w-8 opacity-70" />
            <span className="hidden sm:inline">UMBRELLA_CORP // SECURE_CLOCK // MONITORING_ACTIVE</span>
            <span className="sm:hidden">SECURE_TERMINAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
