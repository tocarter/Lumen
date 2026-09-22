"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import SignInView from "@/components/SignInView";
import AppShell from "@/components/AppShell";
import BoardView from "@/components/BoardView";
import CalendarView from "@/components/CalendarView";
import SettingsView from "@/components/SettingsView";
import AssignmentSheet from "@/components/AssignmentSheet";
import FocusBridge from "@/components/FocusBridge";

export default function LumenClient() {
  const { data, status } = useSession();
  const [guest] = useState(() => window.localStorage.getItem("lumen.guest") === "1");

  if (status === "loading") return <div className="signin" />;
  if (!data?.user && !guest) return <SignInView />;

  return (
    <StoreProvider key={data?.user?.id || "local"} userId={data?.user?.id || "local"}>
      <LumenApp />
    </StoreProvider>
  );
}

function LumenApp() {
  const s = useStore();
  return (
    <AppShell>
      {s.view === "calendar" ? <CalendarView /> : s.view === "settings" ? <SettingsView /> : <BoardView />}
      {s.selectedId ? <AssignmentSheet /> : null}
      <FocusBridge />
    </AppShell>
  );
}
