export interface LumenDesktop {
  isDesktop: true;
  openMini: () => Promise<void>;
  closeMini: () => Promise<void>;
  resizeMini: (width: number, height: number) => Promise<void>;
}

declare global {
  interface Window {
    lumenDesktop?: LumenDesktop;
  }
}

export function desktopApi(): LumenDesktop | null {
  if (typeof window === "undefined") return null;
  return window.lumenDesktop ?? null;
}
