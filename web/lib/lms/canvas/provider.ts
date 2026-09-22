import type { LmsConnections } from "@/lib/types";
import type { LmsProvider } from "@/lib/lms/types";
import { CanvasError, canvas } from "./client";
import { buildCanvasSnapshot } from "./snapshot";

export const canvasProvider: LmsProvider = {
  id: "canvas",
  label: "Canvas",

  async ping(connections: LmsConnections) {
    const creds = connections.canvas;
    if (!creds?.baseUrl || !creds.token) {
      return { running: false, error: "Add a Canvas URL and access token in Settings." };
    }
    try {
      const me = await canvas.me(creds);
      return { running: true, student: me.short_name?.trim() || me.name?.trim() || "" };
    } catch (e) {
      const error = e instanceof CanvasError ? e.message : "Couldn't reach Canvas.";
      return { running: false, error };
    }
  },

  async buildSnapshot(connections: LmsConnections) {
    const creds = connections.canvas;
    if (!creds?.baseUrl || !creds.token) {
      throw new CanvasError("Canvas is not connected.", 401, true);
    }
    return buildCanvasSnapshot(creds);
  },
};
