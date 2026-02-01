'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TimeSlot {
    start: string;
    end: string;
    subject?: string;
    batch?: string;
    semester?: number;
}

interface ScheduleEntry {
    room: string;
    day: string;
    occupied: TimeSlot[];
}

const TIME_HEADERS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thur'];

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

function isTimeInSlot(time: string, slot: TimeSlot): boolean {
    const t = timeToMinutes(time);
    const start = timeToMinutes(slot.start);
    const end = timeToMinutes(slot.end);
    return t >= start && t < end;
}

// Batch colors
const BATCH_COLORS: { [key: string]: string } = {
    'Hopper': 'bg-purple-500/60',
    'Turing': 'bg-blue-500/60',
    'Neumann': 'bg-emerald-500/60',
    'Ramanujan': 'bg-orange-500/60',
    'CP': 'bg-pink-500/60',
    'TIP': 'bg-cyan-500/60',
};

export default function ScheduleEditorPage() {
    const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState('401');
    const [editingCell, setEditingCell] = useState<{ day: string; time: string } | null>(null);
    const [editForm, setEditForm] = useState({ batch: '', subject: '', endTime: '', semester: 2 });
    const [rooms, setRooms] = useState<string[]>([]);
    const [batches, setBatches] = useState<string[]>([]);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/demo');
            const data = await res.json();
            if (data.status === 'success') {
                setSchedules(data.data.raw);
                setRooms(data.summary.rooms);
                setBatches(data.summary.batches);
                if (data.summary.rooms.length > 0 && !data.summary.rooms.includes(selectedRoom)) {
                    setSelectedRoom(data.summary.rooms[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch schedules:', error);
        }
        setLoading(false);
    };

    const getSlotForTime = (room: string, day: string, time: string): TimeSlot | null => {
        const entry = schedules.find(s => s.room === room && s.day === day);
        if (!entry) return null;
        return entry.occupied.find(slot => isTimeInSlot(time, slot)) || null;
    };

    const getSlotInfo = (room: string, day: string, time: string): { slot: TimeSlot | null; isStart: boolean } => {
        const entry = schedules.find(s => s.room === room && s.day === day);
        if (!entry) return { slot: null, isStart: false };
        const slot = entry.occupied.find(s => isTimeInSlot(time, s));
        const isStart = slot?.start === time;
        return { slot: slot || null, isStart };
    };

    const handleCellClick = (day: string, time: string) => {
        setEditingCell({ day, time });
        const slot = getSlotForTime(selectedRoom, day, time);
        if (slot) {
            setEditForm({
                batch: slot.batch || '',
                subject: slot.subject || '',
                endTime: slot.end || '',
                semester: slot.semester || 2
            });
        } else {
            const timeIdx = TIME_HEADERS.indexOf(time);
            const nextTime = TIME_HEADERS[Math.min(timeIdx + 2, TIME_HEADERS.length - 1)];
            setEditForm({ batch: '', subject: '', endTime: nextTime, semester: 2 });
        }
    };

    const handleSaveEdit = () => {
        if (!editingCell) return;

        const { day, time } = editingCell;
        const updatedSchedules = [...schedules];

        let entry = updatedSchedules.find(s => s.room === selectedRoom && s.day === day);
        if (!entry) {
            entry = { room: selectedRoom, day, occupied: [] };
            updatedSchedules.push(entry);
        }

        entry.occupied = entry.occupied.filter(slot => !isTimeInSlot(time, slot));

        if (editForm.batch || editForm.subject) {
            entry.occupied.push({
                start: time,
                end: editForm.endTime || TIME_HEADERS[TIME_HEADERS.indexOf(time) + 2] || '18:00',
                batch: editForm.batch,
                subject: editForm.subject,
                semester: editForm.semester
            });
            entry.occupied.sort((a, b) => a.start.localeCompare(b.start));
        }

        setSchedules(updatedSchedules);
        setEditingCell(null);
    };

    const handleDeleteSlot = () => {
        if (!editingCell) return;

        const { day, time } = editingCell;
        const updatedSchedules = schedules.map(s => {
            if (s.room === selectedRoom && s.day === day) {
                return {
                    ...s,
                    occupied: s.occupied.filter(slot => !isTimeInSlot(time, slot))
                };
            }
            return s;
        });

        setSchedules(updatedSchedules);
        setEditingCell(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Schedule Editor</h1>
                                <p className="text-xs text-slate-400">Sem 2 + Sem 4 Combined Data</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <a href="/" className="text-slate-400 hover:text-white text-sm">← Back to App</a>
                            <Button onClick={fetchSchedules} variant="outline" className="border-white/20 text-slate-300 hover:bg-white/10">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-indigo-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-white">{schedules.length}</p>
                            <p className="text-sm text-slate-400">Total Entries</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-white">{rooms.length}</p>
                            <p className="text-sm text-slate-400">Rooms</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-white">{DAYS.length}</p>
                            <p className="text-sm text-slate-400">Days</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-rose-600/20 to-pink-600/20 border-rose-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-3xl font-bold text-white">{batches.length}</p>
                            <p className="text-sm text-slate-400">Batches</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Batch Legend */}
                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-3 items-center">
                            <span className="text-sm text-slate-400">Batches:</span>
                            {batches.map(batch => (
                                <div key={batch} className="flex items-center gap-1.5">
                                    <div className={`w-3 h-3 rounded ${BATCH_COLORS[batch] || 'bg-gray-500/60'}`}></div>
                                    <span className="text-sm text-slate-300">{batch}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Room Selector */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg">Select Room</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {rooms.map(room => (
                                <Button
                                    key={room}
                                    variant={selectedRoom === room ? 'default' : 'outline'}
                                    onClick={() => setSelectedRoom(room)}
                                    className={selectedRoom === room
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        : 'border-white/20 text-slate-300 hover:bg-white/10'
                                    }
                                >
                                    Room {room}
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule Grid */}
                <Card className="bg-white/5 border-white/10 overflow-hidden">
                    <CardHeader className="border-b border-white/10">
                        <CardTitle className="text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            Room {selectedRoom} Timetable
                            <Badge variant="outline" className="ml-2 border-indigo-500/50 text-indigo-400">
                                Click cells to edit
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px]">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="p-3 text-left text-sm font-medium text-slate-400 border-b border-white/10 sticky left-0 bg-slate-800/90 backdrop-blur w-20">
                                            Day
                                        </th>
                                        {TIME_HEADERS.map(time => (
                                            <th key={time} className="p-2 text-center text-xs font-medium text-slate-400 border-b border-white/10 min-w-[55px]">
                                                {time}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map(day => (
                                        <tr key={day} className="border-b border-white/5">
                                            <td className="p-3 font-medium text-white sticky left-0 bg-slate-800/90 backdrop-blur">
                                                {day}
                                            </td>
                                            {TIME_HEADERS.map(time => {
                                                const { slot, isStart } = getSlotInfo(selectedRoom, day, time);
                                                const occupied = slot !== null;
                                                const isLunch = time >= '12:30' && time < '13:30';
                                                const isEditing = editingCell?.day === day && editingCell?.time === time;
                                                const batchColor = slot?.batch ? BATCH_COLORS[slot.batch] || 'bg-red-500/60' : '';

                                                return (
                                                    <td
                                                        key={time}
                                                        onClick={() => !isLunch && handleCellClick(day, time)}
                                                        className={`p-1 text-center border-l border-white/5 cursor-pointer transition-all ${isEditing
                                                                ? 'ring-2 ring-indigo-500 bg-indigo-500/30'
                                                                : isLunch
                                                                    ? 'bg-amber-500/20 cursor-not-allowed'
                                                                    : occupied
                                                                        ? `${batchColor} hover:opacity-80`
                                                                        : 'bg-emerald-500/20 hover:bg-emerald-500/40'
                                                            }`}
                                                        title={slot ? `${slot.batch || 'Unknown'}: ${slot.subject || 'Class'} (${slot.start}-${slot.end})` : 'Free - Click to add'}
                                                    >
                                                        {occupied && !isLunch && isStart && (
                                                            <div className="text-[9px] text-white font-medium truncate px-0.5 leading-tight">
                                                                <div>{slot?.batch?.substring(0, 4)}</div>
                                                                <div className="text-white/70">{slot?.subject?.substring(0, 6)}</div>
                                                            </div>
                                                        )}
                                                        {occupied && !isLunch && !isStart && (
                                                            <div className="text-[8px] text-white/50">↔</div>
                                                        )}
                                                        {isLunch && (
                                                            <div className="text-[10px] text-amber-300">L</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Edit Panel */}
                {editingCell && (
                    <Card className="bg-indigo-900/50 border-indigo-500/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-lg flex items-center gap-2">
                                Edit Slot: {selectedRoom} - {editingCell.day} @ {editingCell.time}
                                {getSlotForTime(selectedRoom, editingCell.day, editingCell.time) && (
                                    <Badge className="bg-yellow-500/20 text-yellow-300">Editing Existing</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Batch</label>
                                    <select
                                        value={editForm.batch}
                                        onChange={e => setEditForm({ ...editForm, batch: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-white"
                                    >
                                        <option value="">Select Batch</option>
                                        {batches.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                        <option value="Custom">Custom...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editForm.subject}
                                        onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                                        placeholder="e.g. DSA Lab, FOAI Lec"
                                        className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">End Time</label>
                                    <select
                                        value={editForm.endTime}
                                        onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-white"
                                    >
                                        {TIME_HEADERS.filter(t => t > editingCell.time).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                        <option value="18:00">18:00</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Semester</label>
                                    <select
                                        value={editForm.semester}
                                        onChange={e => setEditForm({ ...editForm, semester: parseInt(e.target.value) })}
                                        className="w-full bg-slate-800 border border-white/20 rounded-lg p-2 text-white"
                                    >
                                        <option value={2}>Sem 2</option>
                                        <option value={4}>Sem 4</option>
                                    </select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
                                        Save
                                    </Button>
                                    <Button onClick={handleDeleteSlot} variant="destructive" className="bg-red-600 hover:bg-red-700">
                                        Delete
                                    </Button>
                                    <Button onClick={() => setEditingCell(null)} variant="outline" className="border-white/20 text-slate-300">
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-500/40"></div>
                        <span className="text-slate-400">Free</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-500/40"></div>
                        <span className="text-slate-400">Lunch Break</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded ring-2 ring-indigo-500 bg-indigo-500/30"></div>
                        <span className="text-slate-400">Editing</span>
                    </div>
                </div>

                {/* All Rooms Overview */}
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">All Rooms Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="p-3 text-left text-sm font-medium text-slate-400 border-b border-white/10">Room</th>
                                        {DAYS.map(day => (
                                            <th key={day} className="p-3 text-center text-sm font-medium text-slate-400 border-b border-white/10">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rooms.map(room => (
                                        <tr key={room} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="p-3">
                                                <Badge
                                                    variant="outline"
                                                    className={`${selectedRoom === room ? 'border-indigo-500 text-indigo-400' : 'border-white/30 text-slate-300'} cursor-pointer`}
                                                    onClick={() => setSelectedRoom(room)}
                                                >
                                                    {room}
                                                </Badge>
                                            </td>
                                            {DAYS.map(day => {
                                                const entry = schedules.find(s => s.room === room && s.day === day);
                                                const slots = entry?.occupied || [];
                                                return (
                                                    <td key={day} className="p-2">
                                                        {slots.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {slots.slice(0, 3).map((slot, idx) => (
                                                                    <div key={idx} className={`text-xs ${BATCH_COLORS[slot.batch || ''] || 'bg-gray-500/30'} text-white rounded px-2 py-0.5`}>
                                                                        {slot.batch?.substring(0, 3)} {slot.start}-{slot.end}
                                                                    </div>
                                                                ))}
                                                                {slots.length > 3 && (
                                                                    <div className="text-xs text-slate-500">+{slots.length - 3} more</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-emerald-400 text-xs">All Free</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
