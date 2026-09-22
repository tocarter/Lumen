import type { LmsConnections } from "@/lib/types";
import type { LmsProvider } from "@/lib/lms/types";
import { SchoologyError, keysFromEnv, schoology } from "./client";
import { buildSchoologySnapshot } from "./snapshot";

export const schoologyProvider: LmsProvider = {
  id: "schoology",
  label: "Schoology",

  async ping(connections: LmsConnections) {
    const keys = connections.schoology ?? keysFromEnv();
    if (!keys) {
      return { running: false, error: "Add a Schoology key and secret in Settings." };
    }
    try {
      const me = await schoology.me(keys);
      return {
        running: true,
        student: me.name_display?.trim() || me.name_first?.trim() || "",
      };
    } catch (e) {
      const error =
        e instanceof SchoologyError ? e.message : "Couldn't reach Schoology. Check your connection.";
      return { running: false, error };
    }
  },

  async buildSnapshot(connections: LmsConnections) {
    const keys = connections.schoology ?? keysFromEnv();
    if (!keys) {
      throw new SchoologyError("Schoology is not connected.", 401, true);
    }
    return buildSchoologySnapshot(keys);
  },
};
