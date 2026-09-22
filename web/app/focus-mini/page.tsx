"use client";

import { useEffect, useState } from "react";
import { MiniTimerView } from "@/components/FloatingTimer";
import { FOCUS_CHANNEL, type FocusMessage, type FocusState } from "@/lib/focus";

const EMPTY: FocusState = {
  title: "Focus",
  elapsed: 0,
  paused: true,
  activeId: null,
  course: "",
};

export default function FocusMiniPage() {
  const [state, setState] = useState<FocusState>(EMPTY);

  useEffect(() => {
    document.documentElement.classList.add("mini-page");
    document.body.style.background = "transparent";
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(FOCUS_CHANNEL);
    ch.onmessage = (event: MessageEvent<FocusMessage>) => {
      const msg = event.data;
      if (msg?.type === "state") {
        setState({
          title: msg.title,
          elapsed: msg.elapsed,
          paused: msg.paused,
          activeId: msg.activeId,
          course: msg.course,
        });
      }
    };
    return () => ch.close();
  }, []);

  function send(type: Exclude<FocusMessage["type"], "state">) {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(FOCUS_CHANNEL);
    ch.postMessage({ type });
    ch.close();
  }

  return (
    <MiniTimerView
      state={state}
      onPause={() => send("pause")}
      onResume={() => send("resume")}
      onSkip={() => send("skip")}
      onDone={() => send("done")}
      onExpand={() => send("expand")}
    />
  );
}
