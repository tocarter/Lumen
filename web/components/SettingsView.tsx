"use client";

import { useState } from "react";
import { weekdayName } from "@/lib/format";
import { emptyOwnWork } from "@/lib/own-work";
import { useStore } from "@/lib/store";
import type { Availability, CanvasConnection, DayWindow, SchoologyConnection } from "@/lib/types";
import OwnWorkDialog from "./OwnWorkDialog";

export default function SettingsView() {
  const s = useStore();
  const [schoology, setSchoology] = useState<SchoologyConnection>(
    s.connections.schoology ?? { key: "", secret: "" }
  );
  const [canvas, setCanvas] = useState<CanvasConnection>(
    s.connections.canvas ?? { baseUrl: "", token: "" }
  );
  const [adding, setAdding] = useState(false);

  function saveConnections() {
    s.setConnections({
      schoology: schoology.key && schoology.secret ? schoology : undefined,
      canvas: canvas.baseUrl && canvas.token ? canvas : undefined,
    });
    void s.syncNow();
  }

  function patchDay(day: number, window: DayWindow | null) {
    const next: Availability = { ...s.availability, [day]: window };
    s.setAvailability(next);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Connect class sites, set when you can work, and optionally push blocks to Google Calendar.</p>
        </div>
        <button className="btn-gold" type="button" onClick={() => setAdding(true)}>
          Add work
        </button>
      </div>

      <div className="settings-grid">
        <section className="card" style={{ padding: 18 }}>
          <h2>Schoology</h2>
          <p className="meta">Generate a key at your district’s /api page while signed in.</p>
          <label className="field">
            Key
            <input value={schoology.key} onChange={(e) => setSchoology({ ...schoology, key: e.target.value })} />
          </label>
          <label className="field">
            Secret
            <input
              type="password"
              value={schoology.secret}
              onChange={(e) => setSchoology({ ...schoology, secret: e.target.value })}
            />
          </label>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <h2>Canvas</h2>
          <p className="meta">Account → Settings → New Access Token. URL looks like https://school.instructure.com</p>
          <label className="field">
            Instance URL
            <input
              placeholder="https://your-school.instructure.com"
              value={canvas.baseUrl}
              onChange={(e) => setCanvas({ ...canvas, baseUrl: e.target.value })}
            />
          </label>
          <label className="field">
            Access token
            <input
              type="password"
              value={canvas.token}
              onChange={(e) => setCanvas({ ...canvas, token: e.target.value })}
            />
          </label>
          <button className="btn-gold" type="button" onClick={saveConnections}>
            Save and sync
          </button>
          {s.syncError ? <p className="error">{s.syncError}</p> : null}
        </section>

        <section className="card" style={{ padding: 18 }}>
          <h2>Study hours</h2>
          <div className="days">
            {Array.from({ length: 7 }, (_, day) => {
              const window = s.availability[day];
              return (
                <div className="day-row" key={day}>
                  <span>{weekdayName(day)}</span>
                  <input
                    type="time"
                    value={window?.start ?? "16:00"}
                    disabled={!window}
                    onChange={(e) => patchDay(day, { start: e.target.value, end: window?.end ?? "21:00" })}
                  />
                  <input
                    type="time"
                    value={window?.end ?? "21:00"}
                    disabled={!window}
                    onChange={(e) => patchDay(day, { start: window?.start ?? "16:00", end: e.target.value })}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(window)}
                      onChange={(e) =>
                        patchDay(day, e.target.checked ? { start: "16:00", end: "21:00" } : null)
                      }
                    />{" "}
                    On
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card" style={{ padding: 18 }}>
          <h2>Google Calendar</h2>
          <p className="meta">
            Lumen keeps its own calendar. Turn this on to also write study blocks into a dedicated Google
            calendar named Lumen.
          </p>
          <label>
            <input
              type="checkbox"
              checked={s.googleCalendar.enabled}
              onChange={(e) => void s.setGoogleCalendarEnabled(e.target.checked)}
            />{" "}
            Write study blocks to Google Calendar
          </label>
        </section>
      </div>

      {adding ? (
        <OwnWorkDialog
          initial={emptyOwnWork()}
          onClose={() => setAdding(false)}
        />
      ) : null}
    </>
  );
}
