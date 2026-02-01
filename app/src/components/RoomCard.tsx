'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, RoomCardSkeletonGrid, semanticColors } from '@/components/ui/states';
import type { FreeRoom } from '@/types';
import { cn } from '@/lib/utils';

interface RoomCardProps {
    room: FreeRoom;
}

function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Duration-based color system with semantic meaning
function getDurationStyle(duration: number): {
    bg: string;
    text: string;
    badge: string;
    label: string;
} {
    if (duration >= 180) {
        // 3+ hours - Excellent availability
        return {
            bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
            text: 'text-emerald-400',
            badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            label: 'Long Session',
        };
    }
    if (duration >= 120) {
        // 2+ hours - Great availability
        return {
            bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/10',
            text: 'text-green-400',
            badge: 'bg-green-500/20 text-green-300 border-green-500/40',
            label: 'Study Session',
        };
    }
    if (duration >= 60) {
        // 1+ hour - Good availability
        return {
            bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10',
            text: 'text-blue-400',
            badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
            label: 'Meeting',
        };
    }
    // Less than 1 hour - Limited availability
    return {
        bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'Quick Use',
    };
}

export function RoomCard({ room }: RoomCardProps) {
    const style = getDurationStyle(room.duration);

    return (
        <Card className={cn(
            "group hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
            "border-white/10 hover:border-white/20",
            style.bg
        )}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
                            {room.room}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Room</p>
                            <p className="font-bold text-xl text-white">#{room.room}</p>
                        </div>
                    </div>
                    <Badge className={cn('text-xs font-semibold border', style.badge)}>
                        {formatDuration(room.duration)}
                    </Badge>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/5">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">From</p>
                        <p className="text-xl font-bold text-emerald-400">{room.freeFrom}</p>
                    </div>
                    <div className="flex flex-col items-center text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[10px] mt-0.5">{style.label}</span>
                    </div>
                    <div className="flex-1 bg-slate-800/60 rounded-xl p-3 border border-white/5">
                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Until</p>
                        <p className="text-xl font-bold text-rose-400">{room.freeTill}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface ResultsGridProps {
    rooms: FreeRoom[];
    loading?: boolean;
    emptyMessage?: string;
    emptyDescription?: string;
}

export function ResultsGrid({
    rooms,
    loading,
    emptyMessage = "No rooms available",
    emptyDescription = "All classrooms are currently occupied. Try adjusting your filters or selecting a different time."
}: ResultsGridProps) {
    if (loading) {
        return <RoomCardSkeletonGrid count={6} />;
    }

    if (rooms.length === 0) {
        return (
            <EmptyState
                icon="rooms"
                title={emptyMessage}
                description={emptyDescription}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room, index) => (
                <RoomCard key={`${room.room}-${room.freeFrom}-${index}`} room={room} />
            ))}
        </div>
    );
}
