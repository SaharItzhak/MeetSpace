"use client";

import { useState } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Settings {
  slug: string;
  displayName: string;
  timezone: string;
  slotDurationMinutes: number;
  defaultReminderLeadMinutes: number;
  bio: string;
}

interface WeeklyRuleRow {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

interface BlackoutRow {
  startDate: string;
  endDate: string;
  reason: string;
}

function minutesToTimeInput(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timeInputToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export default function ProviderSettingsForm({
  initialSettings,
  initialWeeklyRules,
  initialBlackoutDates,
}: {
  initialSettings: Settings | null;
  initialWeeklyRules: WeeklyRuleRow[];
  initialBlackoutDates: BlackoutRow[];
}) {
  const [settings, setSettings] = useState<Settings>(
    initialSettings ?? {
      slug: "",
      displayName: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      slotDurationMinutes: 30,
      defaultReminderLeadMinutes: 30,
      bio: "",
    }
  );
  const [rules, setRules] = useState<WeeklyRuleRow[]>(initialWeeklyRules);
  const [blackouts, setBlackouts] = useState<BlackoutRow[]>(initialBlackoutDates);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addRule() {
    setRules([...rules, { dayOfWeek: 1, startMinute: 9 * 60, endMinute: 17 * 60 }]);
  }
  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index));
  }
  function addBlackout() {
    setBlackouts([...blackouts, { startDate: "", endDate: "", reason: "" }]);
  }
  function removeBlackout(index: number) {
    setBlackouts(blackouts.filter((_, i) => i !== index));
  }

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      const becomeResponse = await fetch("/api/providers/become", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!becomeResponse.ok) {
        const data = await becomeResponse.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not save settings");
      }

      const availabilityResponse = await fetch("/api/providers/me/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyRules: rules,
          blackoutDates: blackouts
            .filter((b) => b.startDate && b.endDate)
            .map((b) => ({ ...b, reason: b.reason || undefined })),
        }),
      });
      if (!availabilityResponse.ok) {
        const data = await availabilityResponse.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Could not save availability");
      }

      setStatus("Saved!");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-slate-200 p-4">
        <h2 className="font-medium">Basics</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Booking page slug
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.slug}
              onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
              placeholder="jane-doe"
            />
          </label>
          <label className="text-sm">
            Display name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.displayName}
              onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Timezone (IANA)
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Slot duration (minutes)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.slotDurationMinutes}
              onChange={(e) =>
                setSettings({ ...settings, slotDurationMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm">
            Default reminder lead time (minutes)
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.defaultReminderLeadMinutes}
              onChange={(e) =>
                setSettings({ ...settings, defaultReminderLeadMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Bio (optional)
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 p-4">
        <h2 className="font-medium">Weekly availability</h2>
        <div className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <select
                value={rule.dayOfWeek}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, dayOfWeek: Number(e.target.value) };
                  setRules(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              >
                {DAY_LABELS.map((label, day) => (
                  <option key={day} value={day}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={minutesToTimeInput(rule.startMinute)}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, startMinute: timeInputToMinutes(e.target.value) };
                  setRules(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              />
              <span>to</span>
              <input
                type="time"
                value={minutesToTimeInput(rule.endMinute)}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, endMinute: timeInputToMinutes(e.target.value) };
                  setRules(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              />
              <button onClick={() => removeRule(index)} className="text-xs text-red-700 underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRule} className="mt-3 text-sm underline">
          + Add weekly window
        </button>
      </div>

      <div className="rounded-md border border-slate-200 p-4">
        <h2 className="font-medium">Blackout / vacation dates</h2>
        <div className="mt-3 space-y-2">
          {blackouts.map((blackout, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={blackout.startDate}
                onChange={(e) => {
                  const next = [...blackouts];
                  next[index] = { ...blackout, startDate: e.target.value };
                  setBlackouts(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              />
              <span>to</span>
              <input
                type="date"
                value={blackout.endDate}
                onChange={(e) => {
                  const next = [...blackouts];
                  next[index] = { ...blackout, endDate: e.target.value };
                  setBlackouts(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={blackout.reason}
                onChange={(e) => {
                  const next = [...blackouts];
                  next[index] = { ...blackout, reason: e.target.value };
                  setBlackouts(next);
                }}
                className="rounded-md border border-slate-300 px-2 py-1"
              />
              <button onClick={() => removeBlackout(index)} className="text-xs text-red-700 underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={addBlackout} className="mt-3 text-sm underline">
          + Add blackout range
        </button>
      </div>

      {status ? <p className="text-sm">{status}</p> : null}
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}
