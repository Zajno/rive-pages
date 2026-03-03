"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { ResponsiveViewerContext } from "@/contexts/ResponsiveViewerContext";

const PRESETS = [
  { id: "desktop", label: "Desktop", width: 1280, height: 720 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "mobile", label: "Mobile", width: 375, height: 812 },
] as const;

const MIN_WIDTH = 200;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const SIDEBAR_WIDTH = 320;
const GAP = 32;
const ASPECT = 9 / 16;
const MAX_LAYOUT_WIDTH = 1120; // max-w-6xl (1152) - px-4 (32)

function calcFitSize(containerW: number): { width: number; height: number } {
  const layoutW = Math.min(containerW, MAX_LAYOUT_WIDTH);
  const availableW = layoutW - SIDEBAR_WIDTH - GAP;
  const w = Math.max(MIN_WIDTH, availableW);
  const h = Math.max(MIN_HEIGHT, Math.round(w * ASPECT));
  return { width: w, height: h };
}

interface ResponsiveViewerProps {
  children: React.ReactNode;
  className?: string;
}

export default function ResponsiveViewer({ children, className = "" }: ResponsiveViewerProps) {
  const [size, setSize] = useState<{ width: number; height: number }>(() =>
    calcFitSize(MAX_LAYOUT_WIDTH)
  );
  const [activePreset, setActivePreset] = useState<(typeof PRESETS)[number]["id"] | "custom">(
    "custom"
  );
  const initialSizeSetRef = useRef(false);
  type ResizeEdge = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
  const [isResizing, setIsResizing] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number | null>(() =>
    typeof window !== "undefined" ? Math.min(window.innerWidth, MAX_LAYOUT_WIDTH) : null
  );
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const edgeRef = useRef<ResizeEdge>("se");
  const containerRef = useRef<HTMLDivElement>(null);

  const measureWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const parent = el.parentElement;
    const grandparent = parent?.parentElement;
    const rect =
      grandparent?.getBoundingClientRect() ??
      parent?.getBoundingClientRect() ??
      el.getBoundingClientRect();
    const w = rect?.width ?? 0;
    if (w > 0) setContainerWidth(w);
  }, []);

  useLayoutEffect(() => {
    measureWidth();
    const raf = requestAnimationFrame(measureWidth);
    const t = setTimeout(measureWidth, 100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [measureWidth]);

  useEffect(() => {
    const el = containerRef.current;
    const target = el?.parentElement?.parentElement ?? el?.parentElement ?? el;
    if (!target) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0]?.contentRect ?? {};
      if (typeof width === "number" && width > 0) setContainerWidth(width);
    });
    ro.observe(target);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (containerWidth != null && containerWidth > 0 && !initialSizeSetRef.current) {
      initialSizeSetRef.current = true;
      setSize(calcFitSize(containerWidth));
    }
  }, [containerWidth]);

  const scale =
    containerWidth != null && containerWidth > 0 && size.width > containerWidth
      ? containerWidth / size.width
      : 1;
  const scaledWidth = size.width * scale;
  const scaledHeight = size.height * scale;

  const applyPreset = useCallback((id: (typeof PRESETS)[number]["id"]) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      setSize({ width: p.width, height: p.height });
      setActivePreset(id);
    }
  }, []);

  const handleResizeStart = useCallback(
    (edge: ResizeEdge) => (e: React.MouseEvent) => {
      e.preventDefault();
      edgeRef.current = edge;
      setIsResizing(true);
      startRef.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
    },
    [size]
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      const edge = edgeRef.current;
      let dw = 0,
        dh = 0;
      if (edge.includes("e")) dw = dx;
      if (edge.includes("w")) dw = -dx;
      if (edge.includes("s")) dh = dy;
      if (edge.includes("n")) dh = -dy;
      const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startRef.current.w + dw));
      const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startRef.current.h + dh));
      setSize({ width: newW, height: newH });
      setActivePreset("custom");
    };

    const onUp = () => setIsResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  return (
    <div ref={containerRef} className={`space-y-3 w-full min-w-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Разрешение:</span>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === p.id
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            }`}
          >
            {p.label}
          </button>
        ))}
        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
          {size.width} × {size.height}
        </span>
      </div>

      <div
        className="relative rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 shrink-0"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <ResponsiveViewerContext.Provider
          value={{ width: scaledWidth, height: scaledHeight }}
        >
          <div
            className="absolute left-0 top-0 w-full h-full [&>*]:!w-full [&>*]:!h-full [&>*]:!min-w-0 [&>*]:!min-h-0"
            style={{ width: scaledWidth, height: scaledHeight }}
          >
            {children}
          </div>
        </ResponsiveViewerContext.Provider>
        {(["n", "s", "e", "w", "nw", "ne", "sw", "se"] as const).map((edge) => {
          const cursor =
            edge === "n"
              ? "ns-resize"
              : edge === "s"
                ? "ns-resize"
                : edge === "e"
                  ? "ew-resize"
                  : edge === "w"
                    ? "ew-resize"
                    : edge === "nw"
                      ? "nwse-resize"
                      : edge === "se"
                        ? "nwse-resize"
                        : "nesw-resize";
          const pos =
            edge === "n"
              ? "top-0 left-0 w-full h-4"
              : edge === "s"
                ? "bottom-0 left-0 w-full h-4"
                : edge === "e"
                  ? "right-0 top-0 w-4 h-full"
                  : edge === "w"
                    ? "left-0 top-0 w-4 h-full"
                    : edge === "nw"
                      ? "top-0 left-0 w-5 h-5"
                      : edge === "ne"
                        ? "top-0 right-0 w-5 h-5"
                        : edge === "sw"
                          ? "bottom-0 left-0 w-5 h-5"
                          : "bottom-0 right-0 w-5 h-5";
          return (
            <button
              key={edge}
              type="button"
              onMouseDown={handleResizeStart(edge)}
              className={`absolute ${pos} flex items-center justify-center bg-zinc-400/60 dark:bg-zinc-600/60 hover:bg-zinc-500 dark:hover:bg-zinc-500/80 rounded transition-colors z-10 ${
                isResizing ? "bg-zinc-500 dark:bg-zinc-500" : ""
              }`}
              style={{ cursor }}
              aria-label={`Изменить размер (${edge})`}
            >
              {["nw", "ne", "sw", "se"].includes(edge) && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-zinc-600 dark:text-zinc-300"
                >
                  <path d="M1 7L7 1" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
