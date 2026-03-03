"use client";

import { useRive, useViewModel, useViewModelInstance } from "@rive-app/react-webgl2";
import { Layout, Fit, Alignment } from "@rive-app/webgl2";
import { useEffect } from "react";
import { useResponsiveViewerSize } from "@/contexts/ResponsiveViewerContext";

interface RiveViewerProps {
  src: string;
  stateMachines?: string | string[];
  animations?: string | string[];
  artboard?: string;
  viewModel?: string;
  className?: string;
  onLoad?: () => void;
  onViewModelReady?: (instance: import("@rive-app/webgl2").ViewModelInstance, properties: { name: string; type: number | string }[]) => void;
}

export default function RiveViewer({
  src,
  stateMachines,
  animations,
  artboard,
  viewModel,
  className = "w-full h-96",
  onLoad,
  onViewModelReady,
}: RiveViewerProps) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachines ?? undefined,
    animations: animations ?? undefined,
    artboard: artboard ?? undefined,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    autoplay: true,
    autoBind: !viewModel,
    onLoad,
  });

  const riveViewModel = useViewModel(rive, viewModel ? { name: viewModel } : undefined);
  const viewModelInstance = useViewModelInstance(
    riveViewModel,
    viewModel && rive ? { rive, useDefault: true } : undefined
  );
  const containerSize = useResponsiveViewerSize();

  useEffect(() => {
    if (rive && containerSize?.width && containerSize?.height) {
      rive.resizeToCanvas();
    }
  }, [rive, containerSize?.width, containerSize?.height]);

  useEffect(() => {
    if (viewModel && viewModelInstance && onViewModelReady) {
      try {
        const properties = viewModelInstance.properties ?? riveViewModel?.properties ?? [];
        onViewModelReady(viewModelInstance, properties);
      } catch {
        onViewModelReady(viewModelInstance, []);
      }
    }
  }, [viewModel, viewModelInstance, riveViewModel, onViewModelReady]);

  return (
    <div className={`relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 ${className}`}>
      <RiveComponent className="w-full h-full" style={{ display: "block" }} />
    </div>
  );
}
