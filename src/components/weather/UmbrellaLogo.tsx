"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UmbrellaLogoProps {
  className?: string;
}

/**
 * @fileOverview Централизованный компонент логотипа Umbrella Corp.
 * Использует внешнее изображение Logo.png с эффектом неонового свечения.
 * Добавлен touch-action: none для предотвращения системного зума при двойном клике.
 */
export const UmbrellaLogo: React.FC<UmbrellaLogoProps> = ({ className }) => (
  <div className={cn("relative flex items-center justify-center overflow-hidden drop-shadow-[0_0_15px_rgba(57,255,20,0.4)] touch-none", className)}>
    <Image 
      src="/Logo.png" 
      alt="Umbrella Corp Logo" 
      width={300} 
      height={300}
      className="w-full h-full object-contain"
      priority
      unoptimized
    />
  </div>
);
