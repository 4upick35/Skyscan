"use client";

import React, { useState, useCallback } from "react";
import type { WeatherData } from "@/lib/weather-service";
import WeatherIcon from "./WeatherIcon";
import { 
  Wind, 
  Droplets, 
  Clock, 
  Calendar, 
  Gauge, 
  Activity, 
  Sun,
  Sunrise,
  Sunset,
  Info,
  Lock
} from "lucide-react";
import OracleAdviceBox from "./AIAdviceBox";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { audioEngine } from "@/lib/audio-engine";
import { useI18n } from "@/lib/i18n/context";

interface WeatherDashboardProps {
  weather: WeatherData;
  onAdviceDisplayed?: (text: string) => void;
}

export default function WeatherDashboard({ weather, onAdviceDisplayed }: WeatherDashboardProps) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [weatherIconClicks, setWeatherIconClicks] = useState(0);
  const [revealedFactsCount, setRevealedFactsCount] = useState(0);
  const [currentFact, setCurrentFact] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const { t, locale, language } = useI18n();
  const corporateFacts = locale?.corporateFacts || [];

  const toggleInfo = (id: string) => {
    if (audioEngine) audioEngine.playClick();
    setActiveInfo(activeInfo === id ? null : id);
  };

  const handleWeatherIconClick = () => {
    if (audioEngine) audioEngine.playClick();
    
    setWeatherIconClicks(prev => {
      const nextTotal = prev + 1;
      
      // Логика: каждые 3 нажатия выдают один исторический факт
      if (nextTotal % 3 === 0) {
        const factIndex = Math.floor(nextTotal / 3) - 1;
        
        if (factIndex < corporateFacts.length) {
          setCurrentFact(corporateFacts[factIndex]);
          setRevealedFactsCount(factIndex + 1);
          if (audioEngine) audioEngine.playWhoosh();
        } else {
          setAccessDenied(true);
          setCurrentFact(t('app.access_denied_text'));
          if (audioEngine) audioEngine.playError();
        }
      }
      
      return nextTotal;
    });
  };

  const getExplanation = (key: string) => {
    if (!locale) return "";
    const exp = locale.weatherExplanations[key as keyof typeof locale.weatherExplanations];
    if (!exp) return "";
    const dataKey = key === 'wind' ? weather.windSpeed / 3.6 : key === 'humidity' ? weather.humidity : key === 'pressure' ? weather.pressure : weather.magneticIndex;
    const threshold = key === 'wind' ? 8 : key === 'humidity' ? 70 : key === 'pressure' ? 15 : 4;
    if (key === 'pressure') return Math.abs(dataKey - 760) > threshold ? exp.high : exp.normal;
    return dataKey > threshold ? exp.high : exp.normal;
  };

  const translateCondition = useCallback((condition: string) => {
    if (!locale || !locale.weatherConditions) return condition;
    const lower = condition.toLowerCase().trim();
    return locale.weatherConditions[lower] || condition;
  }, [locale]);

  const LOCALE_MAP: Record<string, string> = {
    ru: 'ru-RU', en: 'en-US', de: 'de-DE', fr: 'fr-FR',
    es: 'es-ES', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN',
  };
  const dateLocale = LOCALE_MAP[language] || 'en-US';

  // Вычисляем индекс текущего часа для отображения почасового прогноза
  const currentHourIndex = new Date().getHours();

  return (
    <div className="w-full space-y-6 md:space-y-8 relative">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center bg-black/40 border border-primary/20 p-4 md:p-8 backdrop-blur-sm relative overflow-hidden">
        
        <div className="space-y-4 relative z-10">
          <div className="flex flex-col gap-1 min-h-[40px]">
            <div className="font-headline text-primary/60 text-[9px] md:text-[10px] tracking-[0.3em] md:tracking-[0.4em] flex items-center gap-2 uppercase">
              <span className="w-1.5 h-1.5 bg-primary animate-pulse"></span>
              {t('app.location')}: {weather.location}
            </div>
            {weather.cityName && (
              <div className="text-[9px] md:text-[10px] text-accent/50 uppercase tracking-[0.2em] ml-3.5 italic font-bold">
                // {t('app.sector')}: {weather.cityName}
              </div>
            )}
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="text-7xl md:text-8xl lg:text-9xl font-headline font-normal text-hollow leading-none">
                {Math.round(weather.temp)}°
              </div>
              <button 
                onClick={handleWeatherIconClick} 
                className="transition-transform active:scale-90 outline-none hover:drop-shadow-[0_0_15px_rgba(57,255,20,0.3)]"
              >
                <WeatherIcon condition={weather.condition} className="h-16 w-16 md:h-24 md:w-24 lg:h-36 lg:w-36 text-primary" />
              </button>
            </div>
            <div className="text-lg md:text-xl lg:text-2xl font-headline text-accent uppercase tracking-[0.1em] md:tracking-[0.2em] mt-2">
              {translateCondition(weather.condition)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10">
          {[
            { id: 'wind', icon: Wind, label: t('app.wind'), value: `${(weather.windSpeed / 3.6).toFixed(1)} ${t('app.wind_unit')}` },
            { id: 'humidity', icon: Droplets, label: t('app.humidity'), value: `${weather.humidity}%` },
            { id: 'pressure', icon: Gauge, label: t('app.pressure'), value: `${weather.pressure} ${t('app.pressure_unit')}` },
            { id: 'magnetic', icon: Activity, label: t('app.magnetic_storms'), value: `${t('app.magnetic_prefix')} ${weather.magneticIndex}`, urgent: weather.magneticIndex > 4 }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => toggleInfo(item.id)}
              className={cn(
                "border border-primary/10 p-3 md:p-4 bg-primary/5 flex flex-col gap-1 text-left transition-all hover:border-primary/40",
                activeInfo === item.id && "bg-primary/20 border-primary/50"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <item.icon className={cn("h-3 w-3 md:h-4 md:w-4", item.urgent ? "text-destructive" : "text-accent")} />
                  <span className="text-[8px] md:text-[10px] text-primary/50 uppercase tracking-widest">{item.label}</span>
                </div>
                <Info className="h-3 w-3 text-primary/20" />
              </div>
              <div className="font-code text-lg md:text-xl text-primary">{item.value}</div>
            </button>
          ))}
          {activeInfo && (
            <div className="col-span-2 p-3 bg-accent/5 border border-accent/20 animate-in fade-in slide-in-from-top-1">
              <div className="text-[9px] font-code text-accent leading-relaxed uppercase tracking-widest">
                <span className="font-bold">&gt; {t('app.decryption_prefix')} </span> {getExplanation(activeInfo)}
              </div>
            </div>
          )}
        </div>
      </div>

      {currentFact && (
        <div className={cn(
          "p-4 border border-destructive/30 bg-destructive/5 animate-in slide-in-from-left-4", 
          accessDenied && "border-destructive bg-destructive/20 animate-shake"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-4 w-4 text-destructive" />
            <span className="text-[9px] md:text-[10px] font-headline text-destructive uppercase tracking-widest">
              {accessDenied ? t('app.access_denied_title') : `${t('app.decryption')}_#${revealedFactsCount}`}
            </span>
          </div>
          <p className="font-code text-xs text-destructive/90 leading-relaxed italic">"{currentFact}"</p>
        </div>
      )}

      <OracleAdviceBox weather={weather} onAdviceDisplayed={onAdviceDisplayed} />

      <div className="space-y-4">
        <div className="flex items-center gap-2 font-headline text-primary/60 text-xs md:text-sm tracking-widest">
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t('app.hourly_forecast')}
        </div>
        <div className="flex overflow-x-auto pb-2 gap-3 md:gap-4 custom-scrollbar">
          {/* Срез данных от текущего часа на следующие 24 часа */}
          {weather.hourly.slice(currentHourIndex, currentHourIndex + 24).map((hour, idx) => (
            <div key={idx} className="min-w-[90px] md:min-w-[100px] flex-shrink-0 border border-primary/10 bg-black/30 p-3 md:p-4 flex flex-col items-center gap-2">
              <span className="text-[9px] md:text-[10px] font-code text-primary/50 uppercase">{hour.time}</span>
              <WeatherIcon condition={hour.condition} className="h-5 w-5 md:h-6 md:w-6" />
              <span className="font-headline text-base md:text-lg">{Math.round(hour.temp)}°</span>
              <span className="text-[8px] md:text-[9px] font-code text-accent uppercase">{hour.precip}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 font-headline text-primary/60 text-xs md:text-sm tracking-widest">
          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" /> {t('app.weekly_forecast')}
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {weather.daily.map((day, idx) => (
            <AccordionItem key={idx} value={`day-${idx}`} className="border border-primary/10 bg-black/30 px-4 md:px-6 py-0 hover:bg-primary/5">
              <AccordionTrigger className="hover:no-underline py-3 md:py-4">
                <div className="flex items-center justify-between w-full pr-2 md:pr-4">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-14 md:w-16 text-left">
                      <div className="text-[10px] md:text-xs font-headline text-primary/60 uppercase">
                        {idx === 0 ? t('app.today') : new Date(day.date).toLocaleDateString(dateLocale, { weekday: 'short' }).toUpperCase()}
                      </div>
                      <div className="text-[8px] md:text-[9px] font-code text-primary/30">{day.date}</div>
                    </div>
                    <WeatherIcon condition={day.condition} className="h-6 w-6 md:h-8 md:w-8" />
                  </div>
                  <div className="flex items-baseline gap-2 md:gap-3">
                    <span className="text-lg md:text-xl font-headline text-primary">{Math.round(day.max)}°</span>
                    <span className="text-xs md:text-sm font-headline text-primary/40">{Math.round(day.min)}°</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 md:pb-6 border-t border-primary/10 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div className="flex items-center gap-3">
                    <Sunrise className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-primary/40 uppercase">{t('app.sunrise')}</span>
                      <span className="font-code text-xs md:text-sm text-primary">{day.sunrise}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sunset className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-primary/40 uppercase">{t('app.sunset')}</span>
                      <span className="font-code text-xs md:text-sm text-primary">{day.sunset}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sun className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-primary/40 uppercase">{t('app.uv_index')}</span>
                      <span className="font-code text-xs md:text-sm text-primary">{day.uvIndex}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wind className="h-3.5 w-3.5 md:h-4 md:w-4 text-accent" />
                    <div className="flex flex-col">
                      <span className="text-[8px] md:text-[9px] text-primary/40 uppercase">{t('app.max_wind')}</span>
                      <span className="font-code text-xs md:text-sm text-primary">{(day.windMax / 3.6).toFixed(1)} {t('app.wind_unit')}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
