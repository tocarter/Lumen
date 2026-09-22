"use client";

import { signOut, useSession } from "next-auth/react";
import { useStore } from "@/lib/store";
import BrandMark from "./BrandMark";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const { data } = useSession();
  const name = data?.user?.name || s.studentName || "You";

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Lumen</span>
        </div>
        <nav className="nav">
          <button type="button" data-active={s.view === "board"} onClick={() => s.setView("board")}>
            Board
          </button>
          <button type="button" data-active={s.view === "calendar"} onClick={() => s.setView("calendar")}>
            Calendar
          </button>
          <button type="button" data-active={s.view === "settings"} onClick={() => s.setView("settings")}>
            Settings
          </button>
        </nav>
        <div className="rail-foot">
          <div className="who">
            {data?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.user.image} alt="" />
            ) : (
              <span className="who-fallback">{name.slice(0, 1)}</span>
            )}
            <span>{name}</span>
          </div>
          {data?.user ? (
            <button className="btn-ghost" type="button" onClick={() => signOut()}>
              Sign out
            </button>
          ) : (
            <button
              className="btn-ghost"
              type="button"
              onClick={() => {
                window.localStorage.removeItem("lumen.guest");
                window.location.reload();
              }}
            >
              Use Google
            </button>
          )}
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
