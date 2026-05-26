"use client";

import React, { useState } from "react";
import { Search, Terminal, LocateFixed, Radar, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { audioEngine } from "@/lib/audio-engine";
import { useI18n } from "@/lib/i18n/context";

interface SearchBoxProps {
  onSearch: (location: string) => void;
  onLocate: () => void;
  isLocating?: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({ onSearch, onLocate, isLocating }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (audioEngine) audioEngine.playClick();
      onSearch(query.trim());
      setQuery("");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-8 flex gap-2">
      <form onSubmit={handleSubmit} className="relative group flex-1">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-primary/50 group-focus-within:text-primary transition-colors">
          <Terminal className="h-4 w-4" />
        </div>
        <Input
          type="text"
          placeholder={t('app.search_placeholder')}
          className="pl-10 pr-20 bg-black/40 border-primary/30 focus-visible:ring-primary/50 focus-visible:border-primary text-primary font-code placeholder:text-primary/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <Button 
            type="submit" 
            variant="ghost" 
            size="sm"
            className="text-primary hover:bg-primary/10 h-8 font-code text-xs uppercase"
          >
            {t('app.search_execute')}
          </Button>
        </div>
      </form>

      <div className="flex gap-1 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onLocate}
                className={cn(
                  "border-primary/30 bg-black/40 text-primary transition-all h-10 w-10 relative overflow-hidden",
                  isLocating ? "border-accent text-accent bg-accent/10" : "hover:bg-primary/10 hover:border-primary/60"
                )}
              >
                {isLocating ? (
                  <Radar className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-black border-primary/50 text-primary font-code text-[10px] uppercase tracking-widest">
              {isLocating ? t('app.geolocating') : t('app.geolocation')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (audioEngine) audioEngine.playPrinter();
                  window.location.reload();
                }}
                className="border-primary/30 bg-black/40 text-primary hover:bg-primary/10 h-10 w-10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-black border-primary/50 text-primary font-code text-[10px] uppercase tracking-widest">
              {t('app.refresh_data')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default SearchBox;
