"use client";

import { createContext, useContext } from "react";

export interface ResponsiveViewerSize {
  width: number;
  height: number;
}

export const ResponsiveViewerContext = createContext<ResponsiveViewerSize | null>(null);

export function useResponsiveViewerSize() {
  return useContext(ResponsiveViewerContext);
}
