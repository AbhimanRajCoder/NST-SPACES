'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TimeSlot {
    start: string;
    end: string;
}

interface RoomSchedule {
    room: string;
    day: string;
    occupied: TimeSlot[];
}

interface ScheduleData {
    status: string;
    summary: {
        totalSchedules: number;
        uniqueRooms: number;
        uniqueDays: number;
        rooms: string[];
        days: string[];
    };
    data: {
        raw: RoomSchedule[];
        byRoom: { [room: string]: { [day: string]: TimeSlot[] } };
        byDay: { [day: string]: { room: string; occupied: TimeSlot[] }[] };
    };
}

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri'];

// Check if a time slot is occupied
function isOccupied(slots: TimeSlot[] | undefined, time: string): boolean {
    if (!slots) return false;
    const timeMinutes = timeToMinutes(time);
    return slots.some(slot => {
        const start = timeToMinutes(slot.start);
        const end = timeToMinutes(slot.end);
        return timeMinutes >= start && timeMinutes < end;
    });
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Get the occupied slot info for a time
function getOccupiedSlot(slots: TimeSlot[] | undefined, time: string): TimeSlot | null {
    if (!slots) return null;
    const timeMinutes = timeToMinutes(time);
    return slots.find(slot => {
        const start = timeToMinutes(slot.start);
        const end = timeToMinutes(slot.end);
        return timeMinutes >= start && timeMinutes < end;
    }) || null;
}

export default function ScheduleGrid() {
    const [data, setData] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'byRoom' | 'byDay'>('byRoom');
    const [selectedRoom, setSelectedRoom] = useState<string>('');

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/demo');
            const json = await res.json();
            if (json.status === 'success') {
                setData(json);
                if (json.summary.rooms.length > 0) {
                    setSelectedRoom(json.summary.rooms[0]);
                }
            } else {
                setError(json.error || 'Failed to load schedule');
            }
        } catch (err) {
            setError('Failed to fetch schedule data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-white/5 border-white/10">
                <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    </div>
                    <p className="text-slate-300 font-medium">Loading schedule data...</p>
                    <p className="text-slate-500 text-sm mt-1">Fetching latest timetable information</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <p className="text-red-300 font-medium mb-2">{error}</p>
                    <p className="text-slate-400 text-sm mb-4">Unable to load schedule data. Please try again.</p>
                    <Button onClick={fetchSchedule} variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-white">{data.summary.totalSchedules}</p>
                        <p className="text-sm text-slate-400">Total Schedules</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/30">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-white">{data.summary.uniqueRooms}</p>
                        <p className="text-sm text-slate-400">Rooms</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-white">{data.summary.uniqueDays}</p>
                        <p className="text-sm text-slate-400">Days</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 border-rose-500/30">
                    <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-white">{TIME_SLOTS.length}</p>
                        <p className="text-sm text-slate-400">Time Slots</p>
                    </CardContent>
                </Card>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
                <Button
                    variant={viewMode === 'byRoom' ? 'default' : 'outline'}
                    onClick={() => setViewMode('byRoom')}
                    className={viewMode === 'byRoom' ? 'bg-indigo-600' : 'border-white/20 text-slate-300'}
                >
                    View by Room
                </Button>
                <Button
                    variant={viewMode === 'byDay' ? 'default' : 'outline'}
                    onClick={() => setViewMode('byDay')}
                    className={viewMode === 'byDay' ? 'bg-indigo-600' : 'border-white/20 text-slate-300'}
                >
                    View All Rooms
                </Button>
            </div>

            {/* Room Selector (for byRoom view) */}
            {viewMode === 'byRoom' && (
                <div className="flex flex-wrap gap-2">
                    {data.summary.rooms.map(room => (
                        <Button
                            key={room}
                            variant={selectedRoom === room ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedRoom(room)}
                            className={selectedRoom === room
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'border-white/20 text-slate-300 hover:bg-white/10'
                            }
                        >
                            Room {room}
                        </Button>
                    ))}
                </div>
            )}

            {/* Schedule Grid */}
            <Card className="bg-white/5 border-white/10 overflow-hidden">
                <CardHeader className="border-b border-white/10">
                    <CardTitle className="text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {viewMode === 'byRoom' ? `Room ${selectedRoom} Schedule` : 'All Rooms Schedule'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        {viewMode === 'byRoom' ? (
                            <RoomScheduleGrid
                                room={selectedRoom}
                                scheduleByRoom={data.data.byRoom}
                            />
                        ) : (
                            <AllRoomsGrid
                                rooms={data.summary.rooms}
                                scheduleByRoom={data.data.byRoom}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500/60"></div>
                    <span className="text-slate-400">Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500/60"></div>
                    <span className="text-slate-400">Free</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-500/40"></div>
                    <span className="text-slate-400">Lunch (12:30-13:30)</span>
                </div>
            </div>

            {/* Refresh Button */}
            <Button onClick={fetchSchedule} variant="outline" className="border-white/20 text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh Data
            </Button>
        </div>
    );
}

// Single room schedule grid
function RoomScheduleGrid({ room, scheduleByRoom }: {
    room: string;
    scheduleByRoom: { [room: string]: { [day: string]: TimeSlot[] } }
}) {
    const roomData = scheduleByRoom[room] || {};

    return (
        <table className="w-full min-w-[800px]">
            <thead>
                <tr className="bg-white/5">
                    <th className="p-3 text-left text-sm font-medium text-slate-400 border-b border-white/10 sticky left-0 bg-slate-900">
                        Day
                    </th>
                    {TIME_SLOTS.map(time => (
                        <th key={time} className="p-2 text-center text-xs font-medium text-slate-400 border-b border-white/10 min-w-[60px]">
                            {time}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {DAYS.map(day => {
                    const daySlots = roomData[day] || [];
                    return (
                        <tr key={day} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3 font-medium text-white sticky left-0 bg-slate-900">
                                {day}
                            </td>
                            {TIME_SLOTS.map(time => {
                                const occupied = isOccupied(daySlots, time);
                                const isLunch = time >= '12:30' && time < '13:30';
                                const slot = getOccupiedSlot(daySlots, time);

                                return (
                                    <td
                                        key={time}
                                        className={`p-1 text-center border-l border-white/5 ${isLunch
                                            ? 'bg-amber-500/20'
                                            : occupied
                                                ? 'bg-red-500/40'
                                                : 'bg-emerald-500/20'
                                            }`}
                                        title={slot ? `${slot.start} - ${slot.end}` : 'Free'}
                                    >
                                        {occupied && !isLunch && (
                                            <div className="w-2 h-2 rounded-full bg-red-400 mx-auto"></div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

// All rooms grid view
function AllRoomsGrid({ rooms, scheduleByRoom }: {
    rooms: string[];
    scheduleByRoom: { [room: string]: { [day: string]: TimeSlot[] } }
}) {
    return (
        <table className="w-full min-w-[800px]">
            <thead>
                <tr className="bg-white/5">
                    <th className="p-3 text-left text-sm font-medium text-slate-400 border-b border-white/10 sticky left-0 bg-slate-900">
                        Room
                    </th>
                    {DAYS.map(day => (
                        <th key={day} className="p-3 text-center text-sm font-medium text-slate-400 border-b border-white/10">
                            {day}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rooms.map(room => {
                    const roomData = scheduleByRoom[room] || {};
                    return (
                        <tr key={room} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-3 font-medium text-white sticky left-0 bg-slate-900">
                                <Badge variant="outline" className="border-indigo-500/50 text-indigo-400">
                                    {room}
                                </Badge>
                            </td>
                            {DAYS.map(day => {
                                const slots = roomData[day] || [];
                                const totalOccupied = slots.reduce((acc, slot) => {
                                    return acc + (timeToMinutes(slot.end) - timeToMinutes(slot.start));
                                }, 0);
                                const hours = Math.round(totalOccupied / 60 * 10) / 10;

                                return (
                                    <td key={day} className="p-2 text-center">
                                        {slots.length > 0 ? (
                                            <div className="space-y-1">
                                                {slots.map((slot, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-xs bg-red-500/30 text-red-200 rounded px-2 py-1"
                                                    >
                                                        {slot.start}-{slot.end}
                                                    </div>
                                                ))}
                                                <div className="text-xs text-slate-500">
                                                    {hours}h occupied
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-emerald-400 text-sm">Free</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
