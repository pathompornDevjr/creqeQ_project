"use client";

import React, { useState, useEffect } from "react";
import { formatDriveImageUrl, cn } from "@/app/lib/utils";
import { ChefHat, Utensils, Wheat, Sparkles, Image as ImageIcon, Store, FileText } from "lucide-react";

export interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  fallbackType?: "chef" | "utensils" | "wheat" | "sparkles" | "logo" | "icon" | "receipt";
  fallbackClassName?: string;
}

export function SafeImage({
  src,
  alt = "",
  className,
  fallback,
  fallbackType = "chef",
  fallbackClassName,
  onError,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [retryStage, setRetryStage] = useState(0);

  // Format url
  const cleanSrc = src ? formatDriveImageUrl(src) : "";

  // Reset error state when src changes
  useEffect(() => {
    setHasError(false);
    setRetryStage(0);
  }, [src]);

  // If no image src or failed after fallbacks
  if (!cleanSrc || hasError) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    // Default icon fallbacks based on type
    return (
      <div
        className={cn(
          "w-full h-full flex items-center justify-center bg-brand-50/60 text-brand-600 select-none overflow-hidden",
          fallbackClassName
        )}
      >
        {fallbackType === "utensils" && <Utensils className="w-1/2 h-1/2 max-w-[22px] max-h-[22px] opacity-75" />}
        {fallbackType === "wheat" && <Wheat className="w-1/2 h-1/2 max-w-[22px] max-h-[22px] opacity-75 text-amber-600" />}
        {fallbackType === "sparkles" && <Sparkles className="w-1/2 h-1/2 max-w-[24px] max-h-[24px] opacity-75 text-rose-400" />}
        {fallbackType === "logo" && (
          <img src="/LogoSquare.png" alt="CrepeQ" className="w-full h-full object-contain p-1" />
        )}
        {fallbackType === "icon" && <ImageIcon className="w-1/2 h-1/2 max-w-[22px] max-h-[22px] opacity-60 text-slate-400" />}
        {fallbackType === "receipt" && <FileText className="w-1/2 h-1/2 max-w-[24px] max-h-[24px] opacity-70 text-slate-400" />}
        {fallbackType === "chef" && <ChefHat className="w-1/2 h-1/2 max-w-[22px] max-h-[22px] opacity-75" />}
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      className={className}
      onError={(e) => {
        // Try alternate Google Drive thumbnail format before completely failing
        if (src && retryStage === 0 && (src.includes("drive.google.com") || src.includes("lh3.googleusercontent.com"))) {
          const match = src.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
          if (match && match[1]) {
            setRetryStage(1);
            (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
            return;
          }
        } else if (src && retryStage === 1 && (src.includes("drive.google.com") || src.includes("lh3.googleusercontent.com"))) {
          const match = src.match(/(?:\/d\/|id=|file\/d\/)([a-zA-Z0-9_-]{20,})/);
          if (match && match[1]) {
            setRetryStage(2);
            (e.target as HTMLImageElement).src = `https://drive.google.com/uc?export=view&id=${match[1]}`;
            return;
          }
        }
        setHasError(true);
        if (onError) {
          onError(e);
        }
      }}
      {...props}
    />
  );
}

export default SafeImage;
