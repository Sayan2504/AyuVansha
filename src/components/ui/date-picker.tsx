"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  compact?: boolean;
  fromYear?: number;
  toYear?: number;
  ariaLabel?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseIsoDate(iso: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  return `${parsed.getDate()} ${SHORT_MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  triggerClassName,
  compact = false,
  fromYear = 1920,
  toYear = new Date().getFullYear() + 5,
  ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState<number>(
    () => selectedDate?.getFullYear() ?? today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    () => selectedDate?.getMonth() ?? today.getMonth()
  );

  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = toYear; y >= fromYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [fromYear, toYear]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{
      day: number;
      monthOffset: -1 | 0 | 1;
      iso: string;
    }> = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, d);
      cells.push({
        day: d,
        monthOffset: -1,
        iso: toIsoDate(prevDate.getFullYear(), prevDate.getMonth(), d),
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        monthOffset: 0,
        iso: toIsoDate(viewYear, viewMonth, d),
      });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      cells.push({
        day: d,
        monthOffset: 1,
        iso: toIsoDate(nextDate.getFullYear(), nextDate.getMonth(), d),
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => Math.max(fromYear, y - 1));
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => Math.min(toYear, y + 1));
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const todayIso = toIsoDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel || placeholder}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background text-left shadow-2xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "h-8 px-2.5 text-xs" : "h-9 px-3 text-sm",
          !value && "text-muted-foreground",
          triggerClassName
        )}
      >
        <span className="truncate">
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-[276px] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          {/* Header: Prev / Month & Year Selectors / Next */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-center gap-1">
              <select
                aria-label="Select month"
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="h-7 cursor-pointer rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {SHORT_MONTHS[idx]}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select year"
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="h-7 cursor-pointer rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="mt-3 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="py-1 text-[11px] font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="mt-1 grid grid-cols-7 gap-0.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayIso;
              const isOutside = cell.monthOffset !== 0;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90"
                      : isToday
                      ? "border border-primary/40 bg-accent text-accent-foreground hover:bg-accent"
                      : isOutside
                      ? "text-muted-foreground/45 hover:bg-accent/50"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions */}
          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(todayIso);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-accent"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
