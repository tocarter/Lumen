"use client";

import { useStore } from "@/lib/store";

export default function FocusDock() {
  const s = useStore();
  if (s.focusMode !== "docked") return null;
  return (
    <button
      type="button"
      className="dock-tab"
      data-side={s.focusDock}
      title="Show Focus"
      onClick={() => {
        if (s.activeTimer) s.setFocusMode("panel");
        else s.openFocus();
      }}
    >
      <span />
    </button>
  );
}
