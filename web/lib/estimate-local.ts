/**
 * Heuristic time estimates. No model call — keyword + kind + points.
 * Clamp 10–180 minutes, rounded to 5.
 */

export function estimateMinutes(
  kind: string,
  title: string,
  brief: string,
  points?: number | null
): number {
  const text = `${title} ${brief}`.toLowerCase();
  let base = 40;

  if (/\b(project|presentation|portfolio|research|term paper)\b/.test(text)) base = 90;
  else if (/\b(essay|report|lab write[- ]?up|rough draft|final draft)\b/.test(text)) base = 75;
  else if (/\b(dbq|frq|problem set|worksheet|packet|homework|\bhw\b)\b/.test(text)) base = 50;
  else if (/\b(read|reading|chapter|annotat|vocab)\b/.test(text)) base = 35;
  else if (kind === "quiz" || kind === "assessment") base = 25;
  else if (kind === "discussion") base = 20;

  if (points != null && points >= 100) base = Math.round(base * 1.4);
  else if (points != null && points >= 50) base = Math.round(base * 1.15);
  else if (points != null && points > 0 && points <= 5) base = Math.round(base * 0.7);

  return Math.max(10, Math.min(180, Math.round(base / 5) * 5));
}
