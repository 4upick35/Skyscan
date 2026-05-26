export interface WeatherData {
  location: string;
  cityName?: string;
  lat: number;
  lon: number;
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  pressure: number; // в мм рт. ст.
  magneticIndex: number; // Kp-индекс
  allergens: {
    label: string;
    level: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  hourly: Array<{
    time: string;
    temp: number;
    feelsLike: number;
    condition: string;
    precip: number;
    windSpeed: number;
    humidity: number;
  }>;
  daily: Array<{
    date: string;
    max: number;
    min: number;
    condition: string;
    precip: number;
    sunrise: string;
    sunset: string;
    uvIndex: number;
    windMax: number;
  }>;
}

export interface WeatherHistoryItem {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
}

const mapWmoCodeToCondition = (code: number): string => {
  // OpenWeatherMap codes (3-digit: 200-899)
  if (code >= 200 && code < 300) return "Гроза";
  if (code >= 300 && code < 600) return "Дождь";
  if (code >= 600 && code < 700) return "Снег";
  if (code >= 700 && code < 800) return "Туман";
  if (code === 800) return "Ясно";
  if (code > 800 && code < 900) return "Облачно";
  // WMO codes (0–99)
  if (code === 0) return "Ясно";
  if (code >= 1 && code <= 3) return "Облачно";
  if (code >= 45 && code <= 48) return "Туман";
  if (code >= 51 && code <= 67) return "Дождь";
  if (code >= 71 && code <= 77) return "Снег";
  if (code >= 80 && code <= 82) return "Ливень";
  if (code >= 95 && code <= 99) return "Гроза";
  return "Облачно";
};

export const getWeatherData = async (location: string): Promise<WeatherData> => {
  let lat: number, lon: number, displayName: string, cityName: string | undefined;
  const trimmedLocation = location.trim();

  const coordMatch = trimmedLocation.match(/^\s*([-+]?\d+(?:\.\d+)?)\s*,\s*([-+]?\d+(?:\.\d+)?)\s*$/);

  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lon = parseFloat(coordMatch[2]);
    displayName = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    
    try {
      // Улучшенное обратное геокодирование
      const reverseRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'ru', 'User-Agent': 'SkyScan-Umbrella-Terminal' } }
      );
      const reverseData = await reverseRes.json();
      if (reverseData && reverseData.address) {
        cityName = reverseData.address.city || 
                   reverseData.address.town || 
                   reverseData.address.village || 
                   reverseData.address.suburb ||
                   reverseData.address.neighbourhood ||
                   reverseData.address.hamlet ||
                   reverseData.address.municipality ||
                   reverseData.address.county ||
                   reverseData.address.state;
      }
    } catch (e) {
      console.warn("REVERSE_GEO_FAILED", e);
    }
  } else {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedLocation)}&count=1&language=ru&format=json`
    );
    if (!geoRes.ok) throw new Error("ОШИБКА_ГЕОКОДИРОВАНИЯ");
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("ЛОКАЦИЯ_НЕ_НАЙДЕНА");
    }

    const city = geoData.results[0];
    lat = city.latitude;
    lon = city.longitude;
    displayName = city.name;
    cityName = city.name;
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,surface_pressure&hourly=temperature_2m,apparent_temperature,weather_code,precipitation_probability,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max&timezone=auto`
  );
  if (!weatherRes.ok) throw new Error("ОШИБКА_ПОЛУЧЕНИЯ_ДАННЫХ");
  const data = await weatherRes.json();

  const airQualityRes = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen`
  ).catch(() => null);
  
  const airData = airQualityRes ? await airQualityRes.json() : null;

  if (!data.current) {
    throw new Error("ОШИБКА_ПОЛУЧЕНИЯ_ДАННЫХ");
  }

  let allergenLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let allergenLabel = 'Чисто';
  
  if (airData?.current) {
    const totalPollen = (airData.current.alder_pollen || 0) + 
                       (airData.current.birch_pollen || 0) + 
                       (airData.current.grass_pollen || 0);
    
    if (totalPollen > 50) {
      allergenLevel = 'HIGH';
      allergenLabel = 'Высокий риск';
    } else if (totalPollen > 10) {
      allergenLevel = 'MEDIUM';
      allergenLabel = 'Средний риск';
    }
  }

  const mockMagneticIndex = Math.floor((new Date().getDate() + lat + lon) % 9);
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return {
    location: displayName,
    cityName: cityName,
    lat,
    lon,
    temp: data.current.temperature_2m,
    condition: mapWmoCodeToCondition(data.current.weather_code),
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    pressure: Math.round(data.current.surface_pressure * 0.75006),
    magneticIndex: mockMagneticIndex,
    allergens: {
      label: allergenLabel,
      level: allergenLevel
    },
    hourly: data.hourly.time.map((time: string, i: number) => ({
      time: formatTime(time),
      temp: data.hourly.temperature_2m[i],
      feelsLike: data.hourly.apparent_temperature[i],
      condition: mapWmoCodeToCondition(data.hourly.weather_code[i]),
      precip: data.hourly.precipitation_probability[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      humidity: data.hourly.relative_humidity_2m[i],
    })),
    daily: data.daily.time.map((date: string, i: number) => ({
      date: date,
      max: data.daily.temperature_2m_max[i],
      min: data.daily.temperature_2m_min[i],
      condition: mapWmoCodeToCondition(data.daily.weather_code[i]),
      precip: data.daily.precipitation_probability_max[i],
      sunrise: formatTime(data.daily.sunrise[i]),
      sunset: formatTime(data.daily.sunset[i]),
      uvIndex: data.daily.uv_index_max[i],
      windMax: data.daily.wind_speed_10m_max[i],
    })),
  };
};

export const getWeatherHistory = async (lat: number, lon: number): Promise<WeatherHistoryItem[]> => {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // --- Провайдер 1: OpenWeatherMap One Call API 3.0 ---
  const OWM_API_KEY = "2b2588409a1db5ccde0c85013344cb33";
  const owmResults: WeatherHistoryItem[] = [];

  const dates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i + 1));
    return d;
  });

  try {
    const responses = await Promise.allSettled(
      dates.map(async (date) => {
        const unix = Math.floor(date.getTime() / 1000);
        const res = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${unix}&appid=${OWM_API_KEY}&units=metric`
        );
        if (!res.ok) throw new Error(`OWM ${res.status}`);
        return res.json() as Promise<{ data: Array<{ temp: { max: number; min: number }; weather: Array<{ id: number }> }> }>;
      })
    );

    responses.forEach((resp, i) => {
      if (resp.status === 'fulfilled' && resp.value?.data?.[0]) {
        const d = resp.value.data[0];
        owmResults.push({
          date: dates[i].toISOString().split('T')[0],
          maxTemp: Math.round(d.temp.max),
          minTemp: Math.round(d.temp.min),
          condition: mapWmoCodeToCondition(d.weather?.[0]?.id ?? 0),
        });
      }
    });

    if (owmResults.length >= 5) {
      return owmResults.reverse();
    }
  } catch {
    // fallback к Open-Meteo
  }

  // --- Провайдер 2: Open-Meteo Archive API (fallback) ---
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 11);

    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${formatDate(startDate)}&end_date=${formatDate(new Date(endDate.setDate(endDate.getDate() - 1)))}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.daily && data.daily.time) {
        return data.daily.time.map((date: string, i: number) => ({
          date: date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          condition: mapWmoCodeToCondition(data.daily.weather_code[i]),
        })).reverse().slice(0, 10);
      }
    }
  } catch {
    // ничего не возвращаем
  }

  return [];
};

export const geolocateUser = async (): Promise<string> => {
  const fallback = "55.7558,37.6173"; // Москва

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return fallback;
  }

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(fallback);
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        resolve(`${pos.coords.latitude},${pos.coords.longitude}`);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.warn("GEOLOCATION_ERROR:", err.code, err.message);
        resolve(fallback);
      },
      { 
        enableHighAccuracy: true,
        timeout: 7500,
        maximumAge: 60000 
      }
    );
  });
};
