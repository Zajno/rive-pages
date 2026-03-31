"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { BreakpointConfig, LottieDemo } from "@/lib/lottie-demos";
import BreakpointConfigPanel from "./BreakpointConfig";

const EditorPreview = dynamic(() => import("./EditorPreview"), { ssr: false });

interface LottieEditorProps {
  initial?: LottieDemo;
}

function newBreakpoint(): BreakpointConfig {
  return {
    id: Math.random().toString(36).slice(2, 9),
    label: "Desktop",
    minWidth: 0,
    maxWidth: null,
    lottieUrl: "",
    lottieFileName: "",
    position: { x: 0, y: 0 },
    positionUnit: "%",
    size: { width: 100, height: 100 },
    sizeUnit: "%",
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDurationSecondsFromLottieJson(content: string): number | null {
  try {
    const json = JSON.parse(content) as { ip?: number; op?: number; fr?: number };
    if (
      typeof json.ip !== "number" ||
      typeof json.op !== "number" ||
      typeof json.fr !== "number" ||
      json.fr <= 0 ||
      json.op <= json.ip
    ) {
      return null;
    }
    return (json.op - json.ip) / json.fr;
  } catch {
    return null;
  }
}

const PRESET_COLORS = [
  { label: "White", value: "#ffffff" },
  { label: "Light gray", value: "#f4f4f5" },
  { label: "Warm white", value: "#fefce8" },
  { label: "Black", value: "#0a0a0a" },
  { label: "Dark zinc", value: "#18181b" },
  { label: "Dark slate", value: "#0f172a" },
  { label: "Deep navy", value: "#0a0f2e" },
  { label: "Deep purple", value: "#120a2a" },
];

export default function LottieEditor({ initial }: LottieEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const mainLottieInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [scrollHeight, setScrollHeight] = useState(initial?.scroll_height ?? 3000);
  const [isPrivate, setIsPrivate] = useState(initial?.is_private ?? false);
  const [breakpoints, setBreakpoints] = useState<BreakpointConfig[]>(
    initial?.breakpoints?.length ? initial.breakpoints : [newBreakpoint()]
  );
  const [bgColor, setBgColor] = useState<string | null>(initial?.background_color ?? null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(
    initial?.background_image_url ?? null
  );
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);
  const [autoScrollFromDuration, setAutoScrollFromDuration] = useState(true);
  const [devMode, setDevMode] = useState(searchParams.get("dev") === "1");
  const isAdmin = searchParams.has("zajno-admin");

  const updateBreakpoint = useCallback((id: string, updates: Partial<BreakpointConfig>) => {
    setBreakpoints((prev) => prev.map((bp) => (bp.id === id ? { ...bp, ...updates } : bp)));
  }, []);

  const removeBreakpoint = useCallback((id: string) => {
    setBreakpoints((prev) => prev.filter((bp) => bp.id !== id));
  }, []);

  const addBreakpoint = () => setBreakpoints((prev) => [...prev, newBreakpoint()]);

  const ensureFirstBreakpoint = useCallback(() => {
    setBreakpoints((prev) => (prev.length ? prev : [newBreakpoint()]));
  }, []);

  const handleUpload = useCallback(
    async (bpId: string, file: File, source: "main" | "panel" = "panel") => {
      setUploadingId(bpId);
      setError(null);
      try {
        if (autoScrollFromDuration && file.name.toLowerCase().endsWith(".json")) {
          const text = await file.text();
          const durationSeconds = getDurationSecondsFromLottieJson(text);
          if (durationSeconds) {
            setDetectedDuration(durationSeconds);
            setScrollHeight(clamp(Math.round(durationSeconds * 1000), 500, 20000));
          }
        }

        const formData = new FormData();
        formData.append("file", file);
        if (initial?.id) formData.append("demoId", initial.id);

        const res = await fetch("/api/lottie-demos/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        updateBreakpoint(bpId, {
          lottieUrl: json.url,
          lottieFileName: file.name,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploadingId(null);
        if (source === "main") {
          mainLottieInputRef.current && (mainLottieInputRef.current.value = "");
        }
      }
    },
    [autoScrollFromDuration, initial?.id, updateBreakpoint]
  );

  const handleMainUpload = async (file: File) => {
    ensureFirstBreakpoint();
    const first = breakpoints[0] ?? newBreakpoint();
    if (!breakpoints.length) {
      setBreakpoints([first]);
    }
    await handleUpload(first.id, file, "main");
  };

  const handleBgImageUpload = async (file: File) => {
    setUploadingBg(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "bg");
      if (initial?.id) formData.append("demoId", initial.id);

      const res = await fetch("/api/lottie-demos/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBgImageUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Background upload failed");
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        is_private: isPrivate,
        scroll_height: scrollHeight,
        breakpoints,
        background_color: bgColor,
        background_image_url: bgImageUrl,
      };

      if (initial?.id) {
        const res = await fetch(`/api/lottie-demos/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        router.refresh();
      } else {
        const res = await fetch("/api/lottie-demos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        router.push(`/lottie/${json.id}/edit`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const firstBreakpoint = breakpoints[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
          <label className="label">Demo title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My animation demo"
            className="input text-lg"
          />
        </div>

        {isAdmin && (
          <label className="inline-flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private (hide from public list)
          </label>
        )}

        {/* Main action: Upload Lottie */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-4">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-3">
            Upload Lottie (main action)
          </p>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => mainLottieInputRef.current?.click()}
              disabled={uploadingId === firstBreakpoint?.id}
              className="btn-primary"
            >
              {uploadingId === firstBreakpoint?.id ? "Uploading..." : "Upload Lottie"}
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {firstBreakpoint?.lottieFileName || "No file uploaded"}
            </span>
          </div>
          <input
            ref={mainLottieInputRef}
            type="file"
            accept=".json,.lottie"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleMainUpload(file);
              }
              e.target.value = "";
            }}
          />

          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Scroll height: <strong>{scrollHeight.toLocaleString()}px</strong>
            {detectedDuration ? (
              <span> (auto from duration: {detectedDuration.toFixed(2)}s × 1000)</span>
            ) : null}
          </div>
        </div>

        {/* Dev mode controls */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Dev mode</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Turn on advanced settings (also works with ?dev=1)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDevMode((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                devMode
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
              }`}
            >
              {devMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        {devMode && (
          <>
            <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Duration & Scroll</h3>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={autoScrollFromDuration}
                  onChange={(e) => setAutoScrollFromDuration(e.target.checked)}
                />
                Auto-calc scroll height from Lottie duration
              </label>

              <div>
                <label className="label">
                  Scroll container height — {scrollHeight.toLocaleString()}px
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={500}
                    max={20000}
                    step={100}
                    value={scrollHeight}
                    onChange={(e) => setScrollHeight(Number(e.target.value))}
                    disabled={autoScrollFromDuration}
                    className="flex-1 accent-zinc-900 dark:accent-zinc-100 disabled:opacity-40"
                  />
                  <input
                    type="number"
                    value={scrollHeight}
                    min={500}
                    step={100}
                    onChange={(e) => setScrollHeight(Number(e.target.value))}
                    disabled={autoScrollFromDuration}
                    className="input w-28"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Background</h3>
              <div>
                <label className="label">Preset colors</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    title="Transparent"
                    onClick={() => {
                      setBgColor(null);
                      setBgImageUrl(null);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      !bgColor && !bgImageUrl
                        ? "border-zinc-900 dark:border-zinc-100 scale-110"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                    style={{
                      backgroundImage:
                        "repeating-conic-gradient(#d4d4d8 0% 25%, #f4f4f5 0% 50%)",
                      backgroundSize: "8px 8px",
                    }}
                  />
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => {
                        setBgColor(c.value);
                        setBgImageUrl(null);
                      }}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        bgColor === c.value && !bgImageUrl
                          ? "border-zinc-900 dark:border-zinc-100 scale-110"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Background image</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 truncate flex-1">
                    {bgImageUrl ? bgImageUrl.split("/").pop() : "No image selected"}
                  </span>
                  {bgImageUrl ? (
                    <button
                      type="button"
                      onClick={() => setBgImageUrl(null)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={uploadingBg}
                    onClick={() => bgImageInputRef.current?.click()}
                    className="btn-secondary text-sm shrink-0"
                  >
                    {uploadingBg ? "Uploading..." : "Upload image"}
                  </button>
                  <input
                    ref={bgImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleBgImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Breakpoints</h3>
                <button type="button" onClick={addBreakpoint} className="btn-secondary text-sm">
                  + Add breakpoint
                </button>
              </div>

              {breakpoints.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl">
                  No breakpoints. Add at least one.
                </p>
              ) : (
                breakpoints.map((bp, i) => (
                  <BreakpointConfigPanel
                    key={bp.id}
                    breakpoint={bp}
                    index={i}
                    demoId={initial?.id ?? null}
                    uploading={uploadingId === bp.id}
                    onUpdate={updateBreakpoint}
                    onRemove={removeBreakpoint}
                    onUpload={handleUpload}
                  />
                ))
              )}
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? "Saving..." : initial ? "Save changes" : "Create demo"}
        </button>

        {initial && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-2 bg-zinc-50 dark:bg-zinc-800/50">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Public demo</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/demo/${initial.slug}`;
                  navigator.clipboard.writeText(url);
                }}
                className="btn-secondary text-sm shrink-0"
              >
                Copy URL
              </button>
              <a
                href={`/demo/${initial.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm shrink-0"
              >
                Open
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">Live preview</h3>
        <EditorPreview
          breakpoints={breakpoints}
          scrollHeight={scrollHeight}
          backgroundColor={bgColor}
          backgroundImageUrl={bgImageUrl}
        />
      </div>
    </div>
  );
}
