
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface WeatherBackgroundProps {
  condition?: string;
  windSpeed?: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
}

const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ condition, windSpeed = 0 }) => {
  const [mounted, setMounted] = useState(false);
  const particlesCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const currentCondition = condition || "Ясно";
  const lower = currentCondition.toLowerCase();

  const isRain = lower.includes("дожд") || lower.includes("ливень") || lower.includes("rain") || lower.includes("осадк") || lower.includes("морось");
  const isSnow = lower.includes("снег") || lower.includes("snow") || lower.includes("метель") || lower.includes("вьюга");
  const isStorm = lower.includes("гроза") || lower.includes("шторм") || lower.includes("storm") || lower.includes("thunder") || lower.includes("молния");
  const isFog = lower.includes("туман") || lower.includes("fog") || lower.includes("дымка") || lower.includes("мгла");
  const isCloudy = lower.includes("облачно") || lower.includes("пасмурно") || lower.includes("cloudy") || lower.includes("overcast");

  useEffect(() => {
    setMounted(true);
  }, []);

  const bgImage = useMemo(() => {
    // Приоритет: Пользовательское фото для дождя/шторма
    if (isRain || isStorm) {
      return "/photo_5215612983969521696_w.jpg";
    }
    
    let imageId = "weather-sunny";
    if (isSnow) imageId = "weather-snow";
    else if (isFog) imageId = "weather-fog";
    else if (isCloudy) imageId = "weather-cloudy";

    const found = PlaceHolderImages.find((img) => img.id === imageId);
    return found ? found.imageUrl : (PlaceHolderImages.find(img => img.id === "weather-sunny")?.imageUrl || "");
  }, [isRain, isSnow, isStorm, isFog, isCloudy]);

  useEffect(() => {
    if (!mounted) return;
    const canvas = particlesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    let particles: Particle[] = [];
    const count = isRain ? 250 : isSnow ? 150 : isStorm ? 300 : isFog ? 40 : 60;

    const createParticle = (): Particle => {
      const z = Math.random() * 3 + 1;
      const sizeMultiplier = isSnow ? 2.5 : isRain ? 1.2 : 0.8;
      
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: z,
        size: (Math.random() * 2 + 1) * sizeMultiplier / z,
        speedY: (isRain ? Math.random() * 12 + 15 : isSnow ? Math.random() * 2 + 1 : Math.random() * 0.5 + 0.2) / z,
        speedX: ((windSpeed / 8) + (Math.random() - 0.5) * (isRain ? 3 : isSnow ? 1.5 : 1)) / z,
        opacity: (Math.random() * 0.5 + 0.2) / (z * 0.5),
        color: (isRain || isStorm) ? "180, 220, 255" : isSnow ? "255, 255, 255" : "57, 255, 20"
      };
    };

    particles = Array.from({ length: count }, createParticle);

    let animationFrameId: number;
    let lightningOpacity = 0;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      if (isStorm) {
        if (Math.random() > 0.997 && lightningOpacity <= 0) {
          lightningOpacity = 0.5;
        }
        if (lightningOpacity > 0) {
          ctx.fillStyle = `rgba(200, 230, 255, ${lightningOpacity})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          lightningOpacity -= 0.03;
        }
      }

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        ctx.beginPath();
        if (isRain || isStorm) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 1.5, p.y + 12 / p.z);
          ctx.strokeStyle = `rgba(${p.color}, ${p.opacity})`;
          ctx.lineWidth = p.size;
          ctx.stroke();
        } else if (isSnow) {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
          ctx.fill();
        } else {
          const glow = Math.sin(time + p.x * 0.01) * 0.3 + 0.6;
          ctx.arc(p.x, p.y, p.size * (1 + glow), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.color}, ${p.opacity * 0.4 * glow})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mounted, isRain, isSnow, isStorm, isFog, windSpeed]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#030303]">
      {mounted && bgImage && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <Image
            src={bgImage}
            alt="Weather context"
            fill
            className="object-cover brightness-[0.45] contrast-[1.1] saturate-[0.8] scale-100"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        </div>
      )}
      <canvas 
        ref={particlesCanvasRef} 
        className="absolute inset-0 opacity-60 pointer-events-none mix-blend-screen"
        style={{ filter: isFog ? 'blur(2px)' : 'none' }}
      />
      <div className="grain pointer-events-none opacity-15" />
    </div>
  );
};

export default WeatherBackground;
