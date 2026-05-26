import React from "react";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  Wind,
  Droplets,
  CloudSun
} from "lucide-react";

interface WeatherIconProps {
  condition: string;
  className?: string;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ condition, className }) => {
  const lower = condition.toLowerCase();
  const baseClass = `text-primary stroke-[1.5] ${className}`;

  if (lower.includes("ясно") || lower.includes("sunny")) {
    return <Sun className={`${baseClass} animate-weather-sun`} />;
  }
  if (lower.includes("облачно") || lower.includes("cloudy")) {
    return <Cloud className={`${baseClass} animate-weather-cloud`} />;
  }
  if (lower.includes("дождь") || lower.includes("rain")) {
    return <CloudRain className={`${baseClass} animate-weather-rain`} />;
  }
  if (lower.includes("гроза") || lower.includes("thunder") || lower.includes("lightning")) {
    return <CloudLightning className={`${baseClass} animate-weather-lightning`} />;
  }
  if (lower.includes("снег") || lower.includes("snow")) {
    return <Snowflake className={`${baseClass} animate-weather-snow`} />;
  }
  if (lower.includes("ветер") || lower.includes("wind")) {
    return <Wind className={`${baseClass} animate-pulse`} />;
  }
  if (lower.includes("влажн") || lower.includes("humid")) {
    return <Droplets className={`${baseClass} animate-bounce`} />;
  }
  
  return <CloudSun className={`${baseClass} animate-weather-cloud`} />;
};

export default WeatherIcon;