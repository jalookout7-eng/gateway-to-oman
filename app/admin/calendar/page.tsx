"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

interface Booking {
  id: string;
  preferred_date: string;
  preferred_time: string;
  status: string;
  lead_id: string;
  leadName?: string;
}

interface BlockedSlot {
  id: string;
  date: string;
  time_slot: string | null;
  reason: string | null;
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const monday = new Date(startDate);
  monday.setDate(startDate.getDate() - startDate.getDay() + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

const DEFAULT_SLOTS = ["09:00", "13:00", "16:00"];

export default function CalendarPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    return monday;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockTime, setBlockTime] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const fetchData = useCallback(async () => {
    const [bookingsRes, blockedRes] = await Promise.all([
      fetch("/api/bookings", { credentials: "include" }),
      fetch("/api/admin/blocked-slots", { credentials: "include" }),
    ]);
    if (bookingsRes.ok) setBookings(await bookingsRes.json());
    if (blockedRes.ok) setBlockedSlots(await blockedRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, currentWeekStart]);

  async function blockSlot() {
    if (!blockDate) return;
    await fetch("/api/admin/blocked-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ date: blockDate, timeSlot: blockTime || null, reason: blockReason || null }),
    });
    setShowBlockModal(false);
    setBlockDate("");
    setBlockTime("");
    setBlockReason("");
    fetchData();
  }

  async function unblock(id: string) {
    await fetch("/api/admin/blocked-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  const weekDays = getWeekDays(currentWeekStart);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy font-heading">Booking Calendar</h1>
        <button
          onClick={() => setShowBlockModal(true)}
          className="flex items-center gap-2 px-4 py-2 gold-gradient text-white text-sm font-semibold rounded-lg"
        >
          <Plus size={16} />
          Block a Slot
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            const prev = new Date(currentWeekStart);
            prev.setDate(prev.getDate() - 7);
            setCurrentWeekStart(prev);
          }}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-gray-600">
          {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
          {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <button
          onClick={() => {
            const next = new Date(currentWeekStart);
            next.setDate(next.getDate() + 7);
            setCurrentWeekStart(next);
          }}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateStr = formatDate(day);
          const dayBookings = bookings.filter((b) => b.preferred_date === dateStr);
          const dayBlocked = blockedSlots.filter((b) => b.date === dateStr);
          const fullyBlocked = dayBlocked.some((b) => !b.time_slot);
          const isToday = formatDate(new Date()) === dateStr;

          return (
            <div
              key={dateStr}
              className={`rounded-xl border p-3 min-h-[140px] ${
                fullyBlocked
                  ? "bg-gray-100 border-gray-200"
                  : isToday
                  ? "border-gold bg-gold/5"
                  : "border-gray-100 bg-white"
              }`}
            >
              <p className={`text-xs font-semibold mb-2 ${isToday ? "text-gold" : "text-gray-500"}`}>
                {day.toLocaleDateString("en-US", { weekday: "short" })}
                <span className="ml-1 text-navy font-bold">{day.getDate()}</span>
              </p>
              {fullyBlocked && (
                <div className="flex items-center justify-between bg-gray-200 rounded px-2 py-1 mb-1">
                  <span className="text-xs text-gray-500">Blocked</span>
                  <button
                    onClick={() => {
                      const slot = dayBlocked.find((b) => !b.time_slot);
                      if (slot) unblock(slot.id);
                    }}
                  >
                    <X size={10} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              )}
              {DEFAULT_SLOTS.map((slot) => {
                const booking = dayBookings.find((b) => b.preferred_time === slot);
                const slotBlocked = dayBlocked.find((b) => b.time_slot === slot);
                return (
                  <div key={slot} className="text-xs rounded px-1 py-0.5 mb-1">
                    {booking ? (
                      <div className="bg-gold/20 text-gold rounded px-2 py-1">
                        <span className="font-medium">{slot}</span>
                        <span className="ml-1 truncate">{booking.leadName ?? "Lead"}</span>
                      </div>
                    ) : slotBlocked ? (
                      <div className="flex items-center justify-between bg-red-50 text-red-400 rounded px-2 py-1">
                        <span>{slot} blocked</span>
                        <button onClick={() => unblock(slotBlocked.id)}>
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-gray-300 px-1">{slot}</div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Block modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-navy mb-4">Block a Slot</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Date</label>
                <input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">
                  Time slot (leave empty to block full day)
                </label>
                <select
                  value={blockTime}
                  onChange={(e) => setBlockTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold"
                >
                  <option value="">Full day</option>
                  {DEFAULT_SLOTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Reason (optional)</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Travel, external meeting"
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-gold"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={blockSlot}
                className="flex-1 py-2.5 gold-gradient text-white text-sm font-semibold rounded-lg"
              >
                Block Slot
              </button>
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
