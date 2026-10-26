"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export function MemePhoto({ src, alt, width, height }: { src?: string; alt: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  return <div className="relative mt-4 max-h-[640px] w-full overflow-hidden border-2 border-black bg-gray-100" style={{ aspectRatio: `${width} / ${height}` }}>
    {src && !failed ? <Image src={src} alt={alt} fill unoptimized sizes="(max-width: 1024px) 100vw, 720px" className="object-contain" onError={() => setFailed(true)} />
      : <div role="img" aria-label={alt} className="flex h-full min-h-24 items-center justify-center gap-2 p-4 text-sm text-gray-600"><ImageOff size={20} aria-hidden="true" />Photo unavailable</div>}
  </div>;
}
