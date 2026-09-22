"use client";

import { useEffect, useRef } from "react";
import { desktopApi } from "@/lib/desktop";
import { FOCUS_CHANNEL, isElectron, type FocusMessage } from "@/lib/focus";
import { useStore } from "@/lib/store";
import FocusPanel from "./FocusPanel";
import FloatingTimer from "./FloatingTimer";
import FocusDock from "./FocusDock";

export default function FocusBridge() {
  const s = useStore();
  const sRef = useRef(s);
  useEffect(() => {
    sRef.current = s;
  });

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(FOCUS_CHANNEL);
    const send = () => {
      const store = sRef.current;
      const a = store.assignments.find((item) => item.id === store.activeTimer);
      const msg: FocusMessage = {
        type: "state",
        title: a?.title ?? "Focus",
        elapsed: store.activeTimer ? store.trackedMs(store.activeTimer) : 0,
        paused: store.timerPaused,
        activeId: store.activeTimer,
        course: a ? store.courseName(a.courseId) : "",
      };
      ch.postMessage(msg);
    };
    send();
    const id = window.setInterval(send, 250);
    ch.onmessage = (event: MessageEvent<FocusMessage>) => {
      const msg = event.data;
      const store = sRef.current;
      if (!msg?.type || msg.type === "state") return;
      if (msg.type === "pause") store.pauseTimer();
      if (msg.type === "resume") store.resumeTimer();
      if (msg.type === "skip") store.skipTimer();
      if (msg.type === "done") store.completeActive();
      if (msg.type === "expand") {
        void desktopApi()?.closeMini();
        store.setFocusMode("panel");
      }
      if (msg.type === "close") store.closeFocus("shrink");
    };
    return () => {
      window.clearInterval(id);
      ch.close();
    };
  }, []);

  useEffect(() => {
    const api = desktopApi();
    if (!isElectron() || !api) return;
    if (s.focusMode === "mini") void api.openMini();
    else void api.closeMini();
  }, [s.focusMode]);

  const showPanel = s.focusMode === "panel" || Boolean(s.focusLeaving && s.focusMode !== "mini");
  const showMini = s.focusMode === "mini" && !isElectron();

  return (
    <>
      {showPanel ? <FocusPanel /> : null}
      {showMini ? <FloatingTimer /> : null}
      <FocusDock />
    </>
  );
}
