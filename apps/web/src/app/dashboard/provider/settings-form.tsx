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
  requireApproval: boolean;
  welcomeMessage: string;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
  accentColor: string;
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
      requireApproval: false,
      welcomeMessage: "",
      minNoticeMinutes: 60,
      maxAdvanceDays: 21,
      bufferMinutes: 0,
      accentColor: "#4f46e5",
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
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold text-slate-900">Basics</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label">Booking page slug</span>
            <input
              className="input mt-1"
              value={settings.slug}
              onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
              placeholder="jane-doe"
            />
          </label>
          <label className="text-sm">
            <span className="label">Display name</span>
            <input
              className="input mt-1"
              value={settings.displayName}
              onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="label">Timezone (IANA)</span>
            <input
              className="input mt-1"
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="label">Slot duration (minutes)</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.slotDurationMinutes}
              onChange={(e) =>
                setSettings({ ...settings, slotDurationMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm">
            <span className="label">Default reminder lead time (minutes)</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.defaultReminderLeadMinutes}
              onChange={(e) =>
                setSettings({ ...settings, defaultReminderLeadMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm">
            <span className="label">Accent color</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-12 cursor-pointer rounded-md border border-slate-300"
                value={settings.accentColor}
                onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
              />
              <input
                className="input"
                value={settings.accentColor}
                onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
              />
            </div>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="label">Bio (optional)</span>
            <textarea
              className="input mt-1"
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="label">Welcome message shown on your booking page (optional)</span>
            <textarea
              className="input mt-1"
              placeholder="Thanks for reaching out! Pick a time that works for you."
              value={settings.welcomeMessage}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Booking rules</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="label">Minimum notice (minutes)</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.minNoticeMinutes}
              onChange={(e) => setSettings({ ...settings, minNoticeMinutes: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            <span className="label">Bookable up to (days ahead)</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.maxAdvanceDays}
              onChange={(e) => setSettings({ ...settings, maxAdvanceDays: Number(e.target.value) })}
            />
          </label>
          <label className="text-sm">
            <span className="label">Buffer between calls (minutes)</span>
            <input
              type="number"
              className="input mt-1"
              value={settings.bufferMinutes}
              onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={settings.requireApproval}
            onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
          />
          <span>
            <span className="font-medium text-slate-900">Require approval before anyone can book</span>
            <p className="mt-0.5 text-slate-600">
              Only people you&apos;ve approved on your{" "}
              <a href="/dashboard/provider/contacts" className="text-indigo-600 hover:underline">
                contacts list
              </a>{" "}
              will be able to request a call — everyone else sees a &quot;request access&quot; screen
              instead of your open slots.
            </p>
          </span>
        </label>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Weekly availability</h2>
        <div className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={rule.dayOfWeek}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, dayOfWeek: Number(e.target.value) };
                  setRules(next);
                }}
                className="input w-auto"
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
                className="input w-auto"
              />
              <span className="text-slate-500">to</span>
              <input
                type="time"
                value={minutesToTimeInput(rule.endMinute)}
                onChange={(e) => {
                  const next = [...rules];
                  next[index] = { ...rule, endMinute: timeInputToMinutes(e.target.value) };
                  setRules(next);
                }}
                className="input w-auto"
              />
              <button onClick={() => removeRule(index)} className="btn-xs">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRule} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
          + Add weekly window
        </button>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900">Blackout / vacation dates</h2>
        <div className="mt-3 space-y-2">
          {blackouts.map((blackout, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
              <input
                type="date"
                value={blackout.startDate}
                onChange={(e) => {
                  const next = [...blackouts];
                  next[index] = { ...blackout, startDate: e.target.value };
                  setBlackouts(next);
                }}
                className="input w-auto"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={blackout.endDate}
                onChange={(e) => {
                  const next = [...blackouts];
                  next[index] = { ...blackout, endDate: e.target.value };
                  setBlackouts(next);
                }}
                className="input w-auto"
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
                className="input"
              />
              <button onClick={() => removeBlackout(index)} className="btn-xs">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={addBlackout} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
          + Add blackout range
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save settings"}
        </button>
        {status ? <p className="text-sm text-slate-600">{status}</p> : null}
      </div>
    </div>
  );
}
