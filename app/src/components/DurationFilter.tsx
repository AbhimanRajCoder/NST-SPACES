'use client';

import { Button } from '@/components/ui/button';

interface DurationFilterProps {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
}

const DURATION_OPTIONS = [
    { label: 'Any', value: undefined },
    { label: '30m+', value: 30 },
    { label: '1h+', value: 60 },
    { label: '2h+', value: 120 },
];

export function DurationFilter({ value, onChange }: DurationFilterProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((option) => (
                <Button
                    key={option.label}
                    variant={value === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange(option.value)}
                    className={
                        value === option.value
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-0'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );
}
