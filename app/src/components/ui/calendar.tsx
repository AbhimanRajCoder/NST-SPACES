'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CalendarProps {
    selected?: Date;
    onSelect?: (date: Date) => void;
    className?: string;
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(selected || new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    return (
        <div className={cn("p-4 bg-slate-800 rounded-xl border border-white/10", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevMonth}
                    className="h-8 w-8 p-0 hover:bg-white/10"
                >
                    <ChevronLeft className="h-4 w-4 text-slate-300" />
                </Button>
                <h2 className="text-sm font-medium text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={nextMonth}
                    className="h-8 w-8 p-0 hover:bg-white/10"
                >
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                </Button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                    <div
                        key={day}
                        className="h-8 flex items-center justify-center text-xs font-medium text-slate-500"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selected && isSameDay(day, selected);
                    const isTodayDate = isToday(day);

                    return (
                        <button
                            key={idx}
                            onClick={() => onSelect?.(day)}
                            className={cn(
                                "h-8 w-8 flex items-center justify-center text-sm rounded-lg transition-colors",
                                !isCurrentMonth && "text-slate-600",
                                isCurrentMonth && !isSelected && "text-slate-300 hover:bg-white/10",
                                isTodayDate && !isSelected && "ring-1 ring-indigo-500",
                                isSelected && "bg-indigo-600 text-white hover:bg-indigo-700"
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface DatePickerProps {
    value?: Date;
    onChange?: (date: Date) => void;
    placeholder?: string;
    className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select date", className }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg",
                    "bg-white/5 border border-white/10 text-left",
                    "hover:bg-white/10 transition-colors",
                    value ? "text-white" : "text-slate-400"
                )}
            >
                <span>{value ? format(value, 'PPP') : placeholder}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full mt-2 z-50 left-0">
                        <Calendar
                            selected={value}
                            onSelect={(date) => {
                                onChange?.(date);
                                setOpen(false);
                            }}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

interface WeekPickerProps {
    startDate?: Date;
    endDate?: Date;
    onStartChange?: (date: Date) => void;
    onEndChange?: (date: Date) => void;
    className?: string;
}

export function WeekPicker({ startDate, endDate, onStartChange, onEndChange, className }: WeekPickerProps) {
    return (
        <div className={cn("flex flex-col sm:flex-row gap-4", className)}>
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">Week Start Date</label>
                <DatePicker
                    value={startDate}
                    onChange={onStartChange}
                    placeholder="Select start date"
                />
            </div>
            <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">Week End Date</label>
                <DatePicker
                    value={endDate}
                    onChange={onEndChange}
                    placeholder="Select end date"
                />
            </div>
        </div>
    );
}
