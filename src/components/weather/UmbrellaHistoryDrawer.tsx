"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ShieldAlert, Terminal, ChevronRight, Lock } from "lucide-react";
import { UmbrellaLogo } from "./UmbrellaLogo";
import { audioEngine } from "@/lib/audio-engine";

interface UmbrellaHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

const UMBRELLA_LOGS = [
  { date: "1966-12-04", event: "Обнаружение вируса 'Прародитель' в Западной Африке. Озвелл Е. Спенсер инициирует проект.", status: "CONFIDENTIAL" },
  { date: "1968-03-10", event: "Основание корпорации Umbrella Pharmaceuticals. Начало строительства Арклейской лаборатории.", status: "RESTRICTED" },
  { date: "1978-07-24", event: "Джеймс Маркус успешно комбинирует 'Прародитель' с ДНК пиявки. Создание T-вируса.", status: "SECRET" },
  { date: "1988-01-15", event: "Запуск проекта 'Тиран' (Tyrant). Разработка протокола T-002.", status: "RESTRICTED" },
  { date: "1998-05-11", event: "Инцидент в особняке Спенсера. Первая крупная утечка биоугрозы в Арклейских горах.", status: "CRITICAL" },
  { date: "1998-09-28", event: "Биологическая катастрофа в Раккун-Сити. Полное заражение гражданского населения.", status: "TERMINATED" },
  { date: "1998-10-01", event: "Операция 'Mission Code: XX'. Стерилизация Раккун-Сити термобарическим зарядом.", status: "DELETED" },
  { date: "2003-02-18", event: "Штурм последней крепости Umbrella на Кавказе. Крах корпорации и падение акций.", status: "COLLAPSED" },
  { date: "2007-07-07", event: "Возрождение под брендом Blue Umbrella. Консультации по ликвидации биоугроз.", status: "ACTIVE" },
  { date: "2021-02-09", event: "Инцидент в европейской деревне. Наблюдение за объектом 'E-001' (Миранда).", status: "MONITORED" }
];

export default function UmbrellaHistoryDrawer({ open, onClose }: UmbrellaHistoryDrawerProps) {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (audioEngine) audioEngine.playWhoosh();
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0a0000] border-l border-destructive/30 p-0 overflow-hidden shadow-[-10px_0_30px_rgba(255,0,0,0.1)]">
        <div className="flex h-full relative">
          <button 
            onClick={() => handleOpenChange(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-50 h-32 w-6 bg-destructive/10 border-r border-y border-destructive/40 flex flex-col items-center justify-center hover:bg-destructive/20 transition-all group"
          >
            <ChevronRight className="h-4 w-4 text-destructive rotate-180 mb-1 group-hover:-translate-x-1 transition-transform" />
            <span className="[writing-mode:vertical-lr] text-[0.5rem] font-headline text-destructive/60 tracking-[0.1em] uppercase">
              CLOSE_ARCHIVE
            </span>
          </button>

          <div className="flex-1 flex flex-col">
            <SheetHeader className="p-6 border-b border-destructive/20 bg-destructive/5">
              <div className="flex items-center gap-4 mb-2">
                <UmbrellaLogo className="h-10 w-10 text-destructive animate-pulse" />
                <div>
                  <SheetTitle className="text-destructive font-headline tracking-widest uppercase flex items-center gap-2 text-lg">
                    <Lock className="h-4 w-4" /> RESTRICTED_ACCESS
                  </SheetTitle>
                  <SheetDescription className="text-destructive/50 font-code text-[0.5625rem] uppercase">
                    UMBRELLA_CORP // CORPORATE_HISTORY_VAULT // LEVEL_8
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
              <div className="p-3 border border-destructive/30 bg-destructive/5 flex items-center gap-3 animate-pulse mb-6">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <span className="text-[0.625rem] font-headline text-destructive uppercase tracking-widest">Внимание: несанкционированный доступ карается по законам корпорации</span>
              </div>

              {UMBRELLA_LOGS.map((log, idx) => (
                <div 
                  key={idx}
                  className="group relative border border-destructive/10 bg-black/40 p-4 hover:bg-destructive/5 transition-all hover:border-destructive/30 cursor-pointer"
                >
                  <div className="absolute top-0 left-0 w-0.5 h-full bg-destructive/20 group-hover:bg-destructive transition-all"></div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <div className="text-[0.625rem] font-headline text-destructive/60">[{log.date}]</div>
                      <div className="text-[0.5rem] font-code bg-destructive/20 px-1 text-destructive">{log.status}</div>
                    </div>
                    <div className="text-xs font-code text-destructive/90 leading-relaxed italic">
                      {log.event}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-destructive/10 bg-black flex justify-between items-center px-6">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-destructive/40" />
                <span className="text-[0.5rem] font-code text-destructive/40 uppercase">DATA_INTEGRITY: CORRUPTED</span>
              </div>
              <p className="font-code text-[0.5rem] text-destructive/30 uppercase tracking-[0.2em]">
                © UMBRELLA_OS // SECURE_ARCHIVE_V8.1
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
