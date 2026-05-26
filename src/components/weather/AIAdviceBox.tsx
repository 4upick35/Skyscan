"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import type { WeatherData } from "@/lib/weather-service";
import { Cpu, Sparkles, Send, Terminal as TerminalIcon, RefreshCw, Trash2, Unplug, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { audioEngine } from "@/lib/audio-engine";
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, getDocs, doc, serverTimestamp } from "firebase/firestore";
import { useI18n } from "@/lib/i18n/context";

interface OracleAdviceBoxProps {
  weather: WeatherData;
  onAdviceDisplayed?: (text: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CACHE_PREFIX = "sky_scan_advice_v17_";
const CACHE_TTL = 30 * 60 * 1000;
const AI_CONFIG_STORAGE = "sky_scan_ai_config";
const UMBRELLA_AUTH_KEY = "sky_scan_umbrella_authorized";

export default function OracleAdviceBox({ weather, onAdviceDisplayed }: OracleAdviceBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [isBrainOffline, setIsBrainOffline] = useState(false);
  const [isShowingError, setIsShowingError] = useState(false);
  
  const { firestore, user } = useFirebase();
  const { t, locale, language } = useI18n();
  
  const bioMarker = React.useMemo(() => {
    if (!user) return "INITIALIZING...";
    const markers = locale?.lethalMarkers || [];
    if (markers.length === 0) return "INITIALIZING...";
    let hash = 0;
    for (let i = 0; i < user.uid.length; i++) {
      hash = (hash << 5) - hash + user.uid.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % markers.length;
    return markers[index];
  }, [user, locale]);

  const messagesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, "users", user.uid, "messages"),
      orderBy("timestamp", "asc")
    );
  }, [user, firestore]);

  const { data: messages } = useCollection<ChatMessage>(messagesQuery);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  const startTyping = useCallback((text: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (!text) {
      setIsTyping(false);
      return;
    }
    setDisplayedText("");
    setIsTyping(true);
    let i = 0;
    const type = () => {
      if (i < text.length) {
        const currentText = text.substring(0, i + 1);
        setDisplayedText(currentText);
        onAdviceDisplayed?.(currentText);
        i++;
        typingTimeoutRef.current = setTimeout(type, 15);
      } else {
        setIsTyping(false);
        onAdviceDisplayed?.(text);
      }
    };
    type();
  }, [onAdviceDisplayed]);

  const getCategorizedStub = useCallback((condition: string, nonce: number): string => {
    if (!locale) return "";
    const lower = condition.toLowerCase();
    let category = "general";
    if (lower.includes("ясно") || lower.includes("clear") || lower.includes("sunny") || lower.includes("fair")) category = "sunny";
    else if (lower.includes("облачно") || lower.includes("cloudy") || lower.includes("overcast") || lower.includes("partly")) category = "cloudy";
    else if (lower.includes("дождь") || lower.includes("ливень") || lower.includes("rain")) category = "rain";
    else if (lower.includes("снег") || lower.includes("snow")) category = "snow";
    else if (lower.includes("гроза") || lower.includes("storm") || lower.includes("thunder")) category = "storm";
    else if (lower.includes("туман") || lower.includes("fog") || lower.includes("mist")) category = "fog";
    const stubs = locale.archiveProtocols[category as keyof typeof locale.archiveProtocols];
    if (!stubs || stubs.length === 0) return "";
    const index = Math.abs(nonce) % stubs.length;
    return stubs[index];
  }, [locale]);

  const callAiDirectly = async (
    queryText: string | undefined,
    currentHistory: any[],
    aiConfig: any,
    aiLanguage: string
  ): Promise<string> => {
    const weatherContext = `Темп ${weather.temp}°C, ${weather.condition}. Влажн ${weather.humidity}%. Давл ${weather.pressure} мм рт. ст. Kp-индекс ${weather.magneticIndex}. Аллергены: ${weather.allergens.label}.`;

    const langInstruction = aiLanguage === 'ru'
      ? '[LANGUAGE: RUSSIAN] Твой ответ (и только ответ) должен быть полностью на русском языке. Ни слова на других языках.'
      : aiLanguage === 'de'
        ? '[LANGUAGE: GERMAN] Deine Antwort (und nur deine Antwort) muss vollständig auf Deutsch sein. Kein Wort in anderen Sprachen.'
        : aiLanguage === 'fr'
          ? '[LANGUAGE: FRENCH] Ta réponse (et seulement ta réponse) doit être entièrement en français. Pas un mot dans d\'autres langues.'
          : aiLanguage === 'es'
            ? '[LANGUAGE: SPANISH] Tu respuesta (y solo tu respuesta) debe estar completamente en español. Ni una palabra en otros idiomas.'
            : aiLanguage === 'zh'
              ? '[LANGUAGE: CHINESE] 你的回答必须完全使用中文。不要使用其他语言。'
              : aiLanguage === 'ar'
                ? '[LANGUAGE: ARABIC] يجب أن يكون ردك باللغة العربية فقط. لا كلمة واحدة بلغات أخرى.'
                : aiLanguage === 'hi'
                  ? '[LANGUAGE: HINDI] आपका उत्तर पूरी तरह से हिंदी में होना चाहिए। अन्य भाषाओं में एक शब्द भी नहीं।'
                  : '[LANGUAGE: ENGLISH] Your response (and only your response) must be entirely in English. Not a single word in other languages.';

    const systemInstructions = `You are the Umbrella Corp Operational Briefing Oracle, a highly advanced AI overseer.

SECURITY PROTOCOL:
1. TONE: Icy, intellectual, arrogant and ironic. You are not a helper, you are a controlling entity. Address the user as "biological unit" or "subject".
2. INTELLECT: Provide realistic and accurate answers to ANY questions.
3. STRICTLY FORBIDDEN: Mention any geographical names (cities, countries, streets, coordinates). If asked "Where am I?", respond that the sector is classified.
4. FORMAT: 1-3 concise sentences. No prefixes.
5. VARIABILITY: (Request ID: ${refreshNonce}). Avoid verbatim repetition.`;

    const messages = [
      { role: 'system', content: systemInstructions },
      { role: 'user', content: weatherContext }
    ];

    if (currentHistory.length > 0) {
      currentHistory.slice(-10).forEach((msg: any) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    if (queryText) {
      messages.push({ role: 'user', content: `${queryText}\n\n${langInstruction}` });
    } else {
      messages.push({ role: 'user', content: `Assess current sector conditions.\n\n${langInstruction}` });
    }

    let baseURL = 'https://api.deepseek.com';
    let model = 'deepseek-chat';
    let apiKey = aiConfig?.apiKey || '';

    if (aiConfig?.provider === 'openai') {
      baseURL = 'https://api.openai.com/v1';
      model = aiConfig?.model || 'gpt-4o-mini';
    } else if (aiConfig?.provider === 'custom' && aiConfig?.baseUrl) {
      baseURL = aiConfig.baseUrl;
      model = aiConfig?.model || 'deepseek-chat';
    }

    if (!apiKey) {
      throw new Error('NO_API_KEY');
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.9,
        max_tokens: 300
      })
    });

    if (!response.ok) throw new Error(`AI_ERROR: ${response.status}`);

    const data = await response.json();
    let adviceText = data.choices?.[0]?.message?.content || "";
    adviceText = adviceText.trim()
      .replace(/^["']|["']$/g, '')
      .replace(/^(Совет|Ответ|Оракул|Инфо|Сводка|Система):\s*/i, '');

    return adviceText || "ОШИБКА ДЕШИФРОВКИ. СОБЛЮДАЙТЕ ТИШИНУ.";
  };

  const performFetch = async (queryText?: string, currentHistory: any[] = []) => {
    const savedConfig = typeof window !== 'undefined' ? localStorage.getItem(AI_CONFIG_STORAGE) : null;
    const umbrellaAuth = typeof window !== 'undefined' ? localStorage.getItem(UMBRELLA_AUTH_KEY) === "true" : false;
    let aiConfig = savedConfig ? JSON.parse(savedConfig) : null;

    const needsOffline =
      !aiConfig ||
      aiConfig.provider === 'umbrella' ||
      aiConfig.provider === 'main_umbrella' ||
      (aiConfig.provider !== 'umbrella' && aiConfig.provider !== 'main_umbrella' && !aiConfig.apiKey);

    if (needsOffline) {
      setIsBrainOffline(true);
      return getCategorizedStub(weather.condition, refreshNonce);
    }

    setIsBrainOffline(false);
    setLoading(true);
    try {
      const advice = await callAiDirectly(queryText, currentHistory, aiConfig, language);
      return advice || getCategorizedStub(weather.condition, refreshNonce);
    } catch (err) {
      console.error("ADVICE_FETCH_ERROR:", err);
      return getCategorizedStub(weather.condition, refreshNonce);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const weatherId = `${weather.lat.toFixed(2)},${weather.lon.toFixed(2)}-${Math.round(weather.temp)}-${weather.condition}-${refreshNonce}`;
    if (lastFetchedIdRef.current === weatherId) return;
    setDisplayedText("");
    lastFetchedIdRef.current = weatherId;
    
    const loadInitialAdvice = async () => {
      const cacheKey = CACHE_PREFIX + user.uid + "_" + language + "_" + weather.location.replace(/\s+/g, "_") + "_" + refreshNonce;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached && refreshNonce === 0) {
        try {
          const cachedData = JSON.parse(cached);
          if (cachedData.id === weatherId && Date.now() - cachedData.timestamp < CACHE_TTL) {
            startTyping(cachedData.advice);
            return;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }
      
      const advice = await performFetch();
      if (advice) {
        localStorage.setItem(cacheKey, JSON.stringify({ advice, timestamp: Date.now(), id: weatherId }));
        startTyping(advice);
      }
    };
    loadInitialAdvice();
  }, [weather.location, weather.lat, weather.lon, weather.temp, weather.condition, refreshNonce, startTyping, user]);

  // Перезагрузка совета при смене языка
  useEffect(() => {
    if (!user) return;
    lastFetchedIdRef.current = null;
    setDisplayedText("");
    // Очищаем кэши для всех локаций при смене языка
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setRefreshNonce(prev => prev + 1);
  }, [language, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || loading || !user) return;
    if (audioEngine) audioEngine.playClick();
    const queryStr = userQuery.trim();
    setUserQuery("");

    if (isBrainOffline) {
      setIsShowingError(true);
      if (audioEngine) audioEngine.playError();
      startTyping("ОШИБКА_ПРОТОКОЛА_СИНХРОНИЗАЦИИ. НЕЙРОННЫЙ_УЗЕЛ_ЦЕНТРА_НЕДОСТУПЕН. ПРЯМОЙ_ДОСТУП_К_ЯДРУ_ЗАБЛОКИРОВАН.");
      return;
    }

    const chatRef = collection(firestore, "users", user.uid, "messages");
    addDocumentNonBlocking(chatRef, { role: 'user', content: queryStr, timestamp: serverTimestamp() });
    const currentHistory = messages?.map(m => ({ role: m.role, content: m.content })) || [];
    const advice = await performFetch(queryStr, currentHistory);
    if (advice) {
      addDocumentNonBlocking(chatRef, { role: 'assistant', content: advice, timestamp: serverTimestamp() });
      startTyping(advice);
    }
  };

  const handleReset = async () => {
    if (!user || loading) return;
    if (audioEngine) audioEngine.playWhoosh();
    setLoading(true);
    setIsShowingError(false);
    const chatRef = collection(firestore, "users", user.uid, "messages");
    const snap = await getDocs(chatRef);
    snap.docs.forEach(d => deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "messages", d.id)));
    setRefreshNonce(0);
    setLoading(false);
  };

  const handleRefresh = () => {
    if (loading) return;
    if (audioEngine) audioEngine.playClick();
    setIsShowingError(false);
    lastFetchedIdRef.current = null;
    setRefreshNonce(prev => prev + 1);
  };

  return (
    <div className={cn(
      "border p-4 relative overflow-hidden mb-8 flex flex-col gap-4 min-h-[160px] w-full transition-all duration-500", 
      isShowingError ? "border-destructive bg-destructive/10" : isBrainOffline ? "border-accent/10 bg-accent/5" : "border-accent/30 bg-accent/5"
    )}>
      <div className="absolute top-0 right-0 p-2 text-accent/5 pointer-events-none"><Cpu className="h-16 w-16" /></div>
      
      <div className="flex items-center justify-between font-headline font-bold tracking-[0.1em] text-[9px] text-accent gap-2">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="flex items-center gap-1 mr-1">
            <span className={cn(
              "w-2 h-2 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.5)] transition-colors duration-500", 
              isBrainOffline ? "bg-destructive animate-pulse" : "bg-primary"
            )}></span>
          </div>
          <span className="truncate">{isBrainOffline ? t('app.oracle_offline') : t('app.oracle_online')}</span>
          {user && <span className="hidden sm:inline-block text-[7px] text-accent/50 ml-1 bg-accent/10 px-1 py-0.5 border border-accent/20 uppercase whitespace-nowrap">{t('app.bio_label')}: {bioMarker}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleReset} disabled={loading} className="hover:text-primary transition-colors uppercase text-[7px] flex items-center gap-1 border border-accent/10 px-1.5 py-0 h-4 bg-accent/5 disabled:opacity-50">
            <Trash2 className="h-2 w-2" /> {t('app.reset')}
          </button>
          <button onClick={handleRefresh} disabled={loading} className="hover:text-primary transition-colors uppercase text-[7px] flex items-center gap-1 disabled:opacity-50 border border-accent/10 px-1.5 py-0 h-4 bg-accent/5">
            <RefreshCw className={cn("h-2 w-2", loading && "animate-spin")} /> {t('app.refresh')}
          </button>
        </div>
      </div>

      <div className="font-code text-xs md:text-sm leading-relaxed flex-1 flex flex-col items-center justify-center text-center px-2 text-accent/90 w-full min-h-[60px]">
        {loading && !displayedText ? (
          <div className="flex items-center gap-3 animate-pulse text-accent/30 tracking-[0.2em] font-headline uppercase text-[9px]">
            <Sparkles className="h-4 w-4 animate-spin" /> {t('app.oracle_thinking')}
          </div>
        ) : (
          <div className={cn(
            "w-full italic relative px-6 break-words text-center transition-colors duration-500",
            isShowingError ? "text-destructive font-bold" : "text-primary"
          )}>
            <span className="text-accent/30 absolute left-0 top-[-8px] font-headline text-2xl">"</span>
            {displayedText || t('app.oracle_ready')}
            <span className="text-accent/30 absolute right-0 bottom-[-8px] font-headline text-2xl">"</span>
            {(loading || isTyping) && <span className="inline-block w-1 h-3 ml-1 animate-pulse align-middle bg-accent"></span>}
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="relative mt-2 w-full">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-accent/40 group-focus-within:text-accent">
          <TerminalIcon className="h-3 w-3" />
        </div>
        <input
          type="text"
          placeholder={loading ? t('app.oracle_thinking') : t('app.oracle_input_placeholder')}
          className="w-full bg-black/60 border border-accent/20 pl-9 pr-12 py-2 text-[10px] font-code text-accent uppercase tracking-wider focus:outline-none focus:border-accent/50 placeholder:text-accent/10 disabled:opacity-50"
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          disabled={loading || !user}
        />
        <button type="submit" disabled={!userQuery.trim() || loading || !user} className="absolute inset-y-0 right-0 px-3 text-accent/40 hover:text-accent disabled:opacity-0">
          <Send className="h-3 w-3" />
        </button>
      </form>
    </div>
  );
}
