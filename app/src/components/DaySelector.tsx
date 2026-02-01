'use client';

import { Button } from '@/components/ui/button';
import { format, addDays, parseISO, startOfWeek } from 'date-fns';

interface DaySelectorProps {
    value: string;
    onChange: (day: string) => void;
    weekStartDate?: string | null;
}

const DAYS = [
    { short: 'Mon', full: 'Monday', offset: 0 },
    { short: 'Tue', full: 'Tuesday', offset: 1 },
    { short: 'Wed', full: 'Wednesday', offset: 2 },
    { short: 'Thur', full: 'Thursday', offset: 3 },
    { short: 'Fri', full: 'Friday', offset: 4 },
];

export function DaySelector({ value, onChange, weekStartDate }: DaySelectorProps) {
    const getDayDate = (offset: number) => {
        if (!weekStartDate) return null;
        try {
            // weekStartDate is expected to be Monday of the active week
            // But just in case, we ensure we work from that date
            const start = parseISO(weekStartDate);
            return addDays(start, offset);
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {DAYS.map((day) => {
                const date = getDayDate(day.offset);
                const isSelected = value === day.short;

                return (
                    <Button
                        key={day.short}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onChange(day.short)}
                        className={
                            isSelected
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-0 min-w-[70px] h-auto py-2 flex-col gap-0.5'
                                : 'hover:bg-zinc-800/50 min-w-[70px] h-auto py-2 flex-col gap-0.5 border-zinc-800 bg-zinc-900/30 text-zinc-400'
                        }
                    >
                        <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {day.short}
                        </span>
                        {date && (
                            <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-zinc-500'}`}>
                                {format(date, 'MMM d')}
                            </span>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
