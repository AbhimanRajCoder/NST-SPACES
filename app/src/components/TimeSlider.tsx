'use client';

import { Slider } from '@/components/ui/slider';
import { TIME_SLOTS } from '@/types';

interface TimeSliderProps {
    value: number;
    onChange: (value: number) => void;
}

export function TimeSlider({ value, onChange }: TimeSliderProps) {
    const timeValue = TIME_SLOTS[value] || TIME_SLOTS[0];

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Select Time</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {timeValue}
                </span>
            </div>
            <Slider
                value={[value]}
                onValueChange={(values) => onChange(values[0])}
                min={0}
                max={TIME_SLOTS.length - 1}
                step={1}
                className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>09:00</span>
                <span>14:00</span>
                <span>19:30</span>
            </div>
        </div>
    );
}
