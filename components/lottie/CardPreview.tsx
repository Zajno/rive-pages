"use client";

import { useEffect, useRef, useState } from "react";
import lottie, { AnimationItem } from "lottie-web";
import { LottieDemo } from "@/lib/lottie-demos";

interface CardPreviewProps {
  demo: LottieDemo;
}

function buildBgStyle(
  color?: string | null,
  imageUrl?: string | null
): React.CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: color ?? undefined,
    };
  }
  if (color) return { backgroundColor: color };
  return { backgroundColor: "#f4f4f5" };
}

export default function CardPreview({ demo }: CardPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<AnimationItem | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Pick the breakpoint with the largest minWidth that has a lottieUrl
  const bp = [...demo.breakpoints]
    .filter((b) => b.lottieUrl)
    .sort((a, b) => b.minWidth - a.minWidth)[0] ?? null;

  useEffect(() => {
    if (!bp?.lottieUrl || !containerRef.current) return;

    // Lazy-load: only start when the card enters the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setStatus("loading");

        fetch(bp.lottieUrl)
          .then((r) => r.json())
          .then((data) => {
            if (!animRef.current) return;

            instanceRef.current?.destroy();
            const inst = lottie.loadAnimation({
              container: animRef.current,
              renderer: "svg",
              loop: false,
              autoplay: false,
              animationData: data,
            });

            instanceRef.current = inst;

            // Show frame at ~20% progress for a more interesting thumbnail
            const showFrame = () => {
              const total = inst.totalFrames;
              if (total) inst.goToAndStop(total * 0.2, true);
            };

            if (inst.totalFrames) {
              showFrame();
            } else {
              inst.addEventListener("DOMLoaded", showFrame);
            }

            setStatus("ready");
          })
          .catch(() => setStatus("error"));
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [bp?.lottieUrl]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "16/9", ...buildBgStyle(demo.background_color, demo.background_image_url) }}
    >
      {/* Lottie layer */}
      {bp && (
        <div
          className="absolute"
          style={{
            left: `${bp.position.x}${bp.positionUnit}`,
            top: `${bp.position.y}${bp.positionUnit}`,
            width: `${bp.size.width}${bp.sizeUnit}`,
            height: `${bp.size.height}${bp.sizeUnit}`,
          }}
        >
          <div ref={animRef} className="w-full h-full" />
        </div>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
        </div>
      )}

      {/* No lottie file */}
      {!bp && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">No animation</span>
        </div>
      )}

      {/* Meta badge */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {demo.breakpoints.length > 0 && (
          <span className="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
            {demo.breakpoints.length} bp
          </span>
        )}
        <span className="text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">
          {(demo.scroll_height / 1000).toFixed(0)}k px
        </span>
      </div>
    </div>
  );
}
