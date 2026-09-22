import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import {
  COLUMNS,
  SEED,
  colors,
  fmtElapsed,
  fmtMinutes,
  type Assignment,
  type Bucket,
} from "./theme";

type ViewName = "board" | "calendar" | "settings";

export default function LumenApp() {
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const [view, setView] = useState<ViewName>("board");
  const [items, setItems] = useState<Assignment[]>(SEED);
  const [focusOpen, setFocusOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(SEED[1]?.id ?? null);
  const [elapsed, setElapsed] = useState(11_000);
  const [paused, setPaused] = useState(false);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focusOpen || paused || !activeId) return;
    const id = setInterval(() => setElapsed((n) => n + 250), 250);
    return () => clearInterval(id);
  }, [focusOpen, paused, activeId]);

  const grouped = useMemo(() => {
    const map: Record<Bucket, Assignment[]> = {
      overdue: [],
      tonight: [],
      soon: [],
      week: [],
      done: [],
    };
    for (const a of items) map[a.bucket].push(a);
    return map;
  }, [items]);

  const columns = COLUMNS.filter((c) => c.key !== "overdue" || grouped.overdue.length > 0);
  const openCount = items.filter((a) => a.bucket !== "done").length;
  const active = items.find((a) => a.id === activeId) ?? grouped.tonight[0] ?? items[0];
  const doneCount = grouped.done.length;
  const todayTotal = grouped.tonight.length + grouped.overdue.length + doneCount;

  function move(id: string, bucket: Bucket) {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, bucket } : a)));
  }

  function addTask() {
    if (!draft.trim()) return;
    const next: Assignment = {
      id: String(Date.now()),
      title: draft.trim(),
      course: "Personal",
      color: colors.gold,
      due: "Due today",
      minutes: 25,
      bucket: "tonight",
    };
    setItems((prev) => [next, ...prev]);
    setDraft("");
    setAdding(false);
    setActiveId(next.id);
  }

  function completeActive() {
    if (!active) return;
    move(active.id, "done");
    const next = grouped.tonight.find((a) => a.id !== active.id) ?? grouped.overdue.find((a) => a.id !== active.id);
    setActiveId(next?.id ?? null);
    setElapsed(0);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.shell, compact && styles.shellStack]}>
        <View style={[styles.rail, compact && styles.railCompact]}>
          <View style={styles.brand}>
            <View style={styles.mark}>
              <View style={styles.sun} />
              <View style={styles.horizon} />
            </View>
            <Text style={styles.wordmark}>Lumen</Text>
          </View>
          <View style={[styles.nav, compact && styles.navRow]}>
            {(["board", "calendar", "settings"] as ViewName[]).map((name) => (
              <Pressable
                key={name}
                onPress={() => setView(name)}
                style={[styles.navBtn, view === name && styles.navOn]}
              >
                <Text style={[styles.navText, view === name && styles.navTextOn]}>
                  {name === "board" ? "Board" : name === "calendar" ? "Calendar" : "Settings"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.main}>
          {view === "board" ? (
            <>
              <View style={[styles.head, compact && styles.headStack]}>
                <View>
                  <Text style={styles.h1}>Board</Text>
                  <Text style={styles.sub}>{openCount} open · sample work for the native preview</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.btn} onPress={() => setAdding(true)}>
                    <Text style={styles.btnText}>Add</Text>
                  </Pressable>
                  <Pressable style={styles.btn}>
                    <Text style={styles.btnText}>Sync</Text>
                  </Pressable>
                  <Pressable
                    style={styles.gold}
                    onPress={() => {
                      setFocusOpen(true);
                      setPaused(false);
                      if (!activeId) setActiveId(grouped.tonight[0]?.id ?? grouped.overdue[0]?.id ?? null);
                    }}
                  >
                    <Text style={styles.goldText}>Focus</Text>
                  </Pressable>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
                {columns.map((col) => (
                  <View key={col.key} style={styles.column}>
                    <View style={styles.colHead}>
                      <Text style={styles.colLabel}>{col.label}</Text>
                      <Text style={styles.colCount}>{grouped[col.key].length}</Text>
                    </View>
                    <ScrollView contentContainerStyle={styles.colBody}>
                      {grouped[col.key].length === 0 ? (
                        <Text style={styles.empty}>Drop work here</Text>
                      ) : (
                        grouped[col.key].map((a) => (
                          <Pressable
                            key={a.id}
                            style={[styles.card, activeId === a.id && styles.cardLive]}
                            onPress={() => {
                              setActiveId(a.id);
                              setFocusOpen(true);
                            }}
                            onLongPress={() => {
                              const order: Bucket[] = ["overdue", "tonight", "soon", "week", "done"];
                              const i = order.indexOf(a.bucket);
                              move(a.id, order[Math.min(i + 1, order.length - 1)]);
                            }}
                          >
                            <View style={styles.chip}>
                              <View style={[styles.dot, { backgroundColor: a.color }]} />
                              <Text style={styles.chipText}>{a.course}</Text>
                            </View>
                            <Text style={styles.cardTitle}>{a.title}</Text>
                            <View style={styles.meta}>
                              <Text style={styles.metaText}>{a.due}</Text>
                              <Text style={styles.metaText}>{fmtMinutes(a.minutes)}</Text>
                            </View>
                          </Pressable>
                        ))
                      )}
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : view === "calendar" ? (
            <View>
              <Text style={styles.h1}>Calendar</Text>
              <Text style={styles.sub}>Study blocks from the board land here after sync.</Text>
              <View style={styles.calCard}>
                {grouped.tonight.concat(grouped.soon).map((a) => (
                  <View key={a.id} style={styles.calRow}>
                    <View style={[styles.dot, { backgroundColor: a.color }]} />
                    <Text style={styles.cardTitle}>{a.title}</Text>
                    <Text style={styles.metaText}>{fmtMinutes(a.minutes)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.h1}>Settings</Text>
              <Text style={styles.sub}>Paste Schoology or Canvas keys in the web app. This native shell shows the board first.</Text>
              <View style={styles.calCard}>
                <Text style={styles.cardTitle}>Schoology key + secret</Text>
                <Text style={styles.metaText}>District /api page</Text>
                <Text style={[styles.cardTitle, { marginTop: 16 }]}>Canvas URL + token</Text>
                <Text style={styles.metaText}>Account → Settings → New Access Token</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <Modal visible={adding} transparent animationType="fade">
        <Pressable style={styles.dim} onPress={() => setAdding(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.h2}>Add your own work</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Title"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable style={styles.gold} onPress={addTask}>
              <Text style={styles.goldText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={focusOpen} transparent animationType="fade">
        <View style={styles.dim}>
          <View style={styles.focus}>
            <View style={styles.focusHead}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>Today</Text>
              </View>
              <View style={styles.focusTools}>
                <Pressable onPress={() => setFocusOpen(false)} style={styles.iconBtn}>
                  <Text style={styles.icon}>⌂</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${todayTotal ? (doneCount / todayTotal) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.metaText}>
                {doneCount}/{Math.max(todayTotal, doneCount)} Done
              </Text>
            </View>
            {active ? (
              <View style={styles.active}>
                <Text style={styles.est}>{fmtMinutes(active.minutes)}</Text>
                <Text style={styles.activeTitle}>{active.title}</Text>
                <Text style={styles.metaText}>{active.course}</Text>
                <Text style={styles.clock}>{fmtElapsed(elapsed)}</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Notes"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  multiline
                />
                <View style={styles.row}>
                  <Pressable style={styles.btn} onPress={() => setPaused((p) => !p)}>
                    <Text style={styles.btnText}>{paused ? "Resume" : "Pause"}</Text>
                  </Pressable>
                  <Pressable style={styles.btn} onPress={completeActive}>
                    <Text style={styles.btnText}>Done</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.empty}>All caught up for Today.</Text>
            )}
            <ScrollView style={{ maxHeight: 180 }}>
              {grouped.tonight
                .concat(grouped.overdue)
                .filter((a) => a.id !== active?.id)
                .map((a) => (
                  <Pressable key={a.id} style={styles.queue} onPress={() => { setActiveId(a.id); setElapsed(0); }}>
                    <View>
                      <Text style={styles.cardTitle}>{a.title}</Text>
                      <Text style={styles.metaText}>{a.course} · {fmtMinutes(a.minutes)}</Text>
                    </View>
                    <Text style={styles.rocket}>➤</Text>
                  </Pressable>
                ))}
            </ScrollView>
            <Pressable onPress={() => setAdding(true)}>
              <Text style={styles.add}>+ ADD TASK</Text>
            </Pressable>
            <Pressable onPress={() => setFocusOpen(false)}>
              <LinearGradient colors={["#5ee0c0", colors.teal]} style={styles.focusMode}>
                <Text style={styles.focusModeText}>Focus mode</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1, flexDirection: "row" },
  shellStack: { flexDirection: "column" },
  rail: {
    width: 240,
    backgroundColor: colors.bg2,
    borderRightWidth: 1,
    borderRightColor: colors.line,
    padding: 22,
    gap: 22,
  },
  railCompact: { width: "100%", borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.line, padding: 14 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 },
  sun: { width: 16, height: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.gold },
  horizon: { width: 20, height: 2, backgroundColor: colors.gold, marginTop: 2, borderRadius: 2 },
  wordmark: { color: colors.ink, fontSize: 24, fontWeight: "600", letterSpacing: -0.6 },
  nav: { gap: 6 },
  navRow: { flexDirection: "row", flexWrap: "wrap" },
  navBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  navOn: { backgroundColor: colors.surface },
  navText: { color: colors.ink2, fontSize: 15 },
  navTextOn: { color: colors.ink },
  main: { flex: 1, padding: 24 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, gap: 12 },
  headStack: { flexDirection: "column", alignItems: "flex-start" },
  h1: { color: colors.ink, fontSize: 34, fontWeight: "600", letterSpacing: -0.8 },
  h2: { color: colors.ink, fontSize: 22, fontWeight: "600", marginBottom: 12 },
  sub: { color: colors.ink2, marginTop: 6 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  btn: { backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  btnText: { color: colors.ink },
  gold: { backgroundColor: colors.gold, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  goldText: { color: "#1a1408", fontWeight: "700" },
  board: { gap: 14, paddingBottom: 24, alignItems: "flex-start" },
  column: { width: 260, minHeight: 420, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line },
  colHead: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  colLabel: { color: colors.muted, letterSpacing: 1, fontSize: 12, textTransform: "uppercase" },
  colCount: { color: colors.ink2 },
  colBody: { padding: 12, gap: 10 },
  empty: { color: colors.muted, padding: 12 },
  card: { backgroundColor: colors.surface2, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 8 },
  cardLive: { borderColor: "rgba(61,186,156,0.45)" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7 },
  chipText: { color: colors.ink2, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 99 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { color: colors.muted, fontSize: 12 },
  calCard: { marginTop: 20, backgroundColor: colors.surface, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.line },
  calRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dim: { flex: 1, backgroundColor: "rgba(6,8,10,0.62)", alignItems: "center", justifyContent: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 400, backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 12 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, color: colors.ink, backgroundColor: colors.bg, minHeight: 44 },
  focus: { width: "100%", maxWidth: 400, maxHeight: "92%", backgroundColor: "#14181e", borderRadius: 24, padding: 18, gap: 12, borderWidth: 1, borderColor: colors.line },
  focusHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pill: { backgroundColor: colors.surface2, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  pillText: { color: colors.ink, fontWeight: "700" },
  focusTools: { flexDirection: "row" },
  iconBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  icon: { color: colors.ink2, fontSize: 18 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bar: { flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.surface2, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.teal },
  active: { backgroundColor: colors.surface2, borderRadius: 20, padding: 18, gap: 6 },
  est: { color: colors.gold, fontSize: 12, alignSelf: "flex-end" },
  activeTitle: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  clock: { color: colors.teal, fontSize: 28, fontVariant: ["tabular-nums"], marginVertical: 8 },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  queue: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 8 },
  rocket: { color: colors.gold },
  add: { color: colors.ink2, letterSpacing: 1.2, textAlign: "center", marginVertical: 6 },
  focusMode: { borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  focusModeText: { color: "#08110e", fontWeight: "800", fontSize: 16 },
});
