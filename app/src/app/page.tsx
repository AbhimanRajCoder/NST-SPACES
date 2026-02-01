'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DaySelector } from '@/components/DaySelector';
import { DurationFilter } from '@/components/DurationFilter';
import { ResultsGrid } from '@/components/RoomCard';
import {
  WeekIndicator,
  AlertBanner,
  StatusBadge,
  EmptyState
} from '@/components/ui/states';
import { TIME_SLOTS } from '@/types';
import type { FreeRoom } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, Clock, Calendar, Search, Zap, Info } from 'lucide-react';
import { Spotlight } from '@/components/ui/aceternity/spotlight';
import { Button as MovingButton } from '@/components/ui/aceternity/moving-border';
import { motion, AnimatePresence } from 'framer-motion';

// --- Utility Functions ---

function getCurrentDay(): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
  const day = days[new Date().getDay()];
  return day === 'Sun' || day === 'Sat' ? 'Mon' : day;
}

function getCurrentTimeIndex(): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < TIME_SLOTS.length; i++) {
    const [h, m] = TIME_SLOTS[i].split(':').map(Number);
    const slotMinutes = h * 60 + m;
    if (slotMinutes >= currentMinutes) {
      return Math.max(0, i);
    }
  }
  return 0;
}

function isOutsideOperatingHours(): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = 9 * 60;
  const endMinutes = 19 * 60 + 30;
  return currentMinutes < startMinutes || currentMinutes > endMinutes;
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

type DataStatus = 'loading' | 'success' | 'empty' | 'error' | 'outside-hours' | 'weekend' | 'no-pdf' | 'no-schedule-week';

export default function Home() {
  const [day, setDay] = useState(getCurrentDay());
  const [timeIndex, setTimeIndex] = useState(getCurrentTimeIndex());
  const [minDuration, setMinDuration] = useState<number | undefined>(undefined);
  const [freeNow, setFreeNow] = useState(true);
  const [rooms, setRooms] = useState<FreeRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState('');
  const [activeWeek, setActiveWeek] = useState('');
  const [weekStartDate, setWeekStartDate] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus>('loading');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setDataStatus('loading');

    try {
      const params = new URLSearchParams();

      if (freeNow) {
        params.set('freeNow', 'true');
      } else {
        params.set('day', day);
        params.set('time', TIME_SLOTS[timeIndex]);
      }

      if (minDuration) {
        params.set('minDuration', minDuration.toString());
      }

      const res = await fetch(`/api/rooms?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setRooms(data.data);
        setCurrentTime(data.meta?.currentTime || '');
        if (data.meta?.activeWeek) {
          setActiveWeek(data.meta.activeWeek);
        }
        if (data.meta?.weekStartDate) {
          setWeekStartDate(data.meta.weekStartDate);
        }
        setLastRefresh(new Date());

        if (data.meta?.hasData === false || data.meta?.hasPDFs === false) {
          setDataStatus(data.meta?.hasPDFs === false ? 'no-pdf' : 'empty');
        } else if (data.meta?.isCurrentWeek === false) {
          setDataStatus('no-schedule-week');
        } else if (freeNow && isWeekend()) {
          setDataStatus('weekend');
        } else if (freeNow && isOutsideOperatingHours()) {
          setDataStatus('outside-hours');
        } else if (data.data.length === 0) {
          setDataStatus('empty');
        } else {
          setDataStatus('success');
        }
      } else {
        setDataStatus('error');
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      setDataStatus('error');
    } finally {
      setLoading(false);
    }
  }, [day, timeIndex, minDuration, freeNow]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!freeNow) return;
    const interval = setInterval(() => fetchRooms(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [freeNow, fetchRooms]);

  const handleFreeNow = () => {
    setFreeNow(true);
    setDay(getCurrentDay());
    setTimeIndex(getCurrentTimeIndex());
  };

  const handleManualSearch = () => {
    setFreeNow(false);
  };

  const getStatusMessage = () => {
    if (dataStatus === 'no-pdf') return { type: 'warning' as const, title: 'No Timetable Data', message: 'No timetable PDFs have been uploaded yet.' };
    if (dataStatus === 'no-schedule-week') return { type: 'warning' as const, title: 'No Schedule For This Week', message: 'Sorry, there is no schedule available for the current week.' };
    if (dataStatus === 'weekend') return { type: 'info' as const, title: 'Weekend Hours', message: 'It\'s the weekend! Showing Monday schedule for planning.' };
    if (dataStatus === 'outside-hours') return { type: 'info' as const, title: 'Outside Operating Hours', message: 'Campus is closed (9:00 AM - 7:30 PM). Showing next available time.' };
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <main className="min-h-screen bg-neutral-950 antialiased relative overflow-hidden text-slate-100 selection:bg-emerald-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-12 md:w-36 md:h-12 opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/nstspaces.png" alt="NST Spaces" fill className="object-contain" />
            </div>
          </div>

        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 max-w-6xl relative z-10 w-full">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-20 flex flex-col items-center"
          >
            <MovingButton
              borderRadius="1.75rem"
              className="bg-zinc-900/80 text-white border-zinc-800 backdrop-blur-md"
              containerClassName="mb-8"
              duration={3000}
            >
              NST SPACES
            </MovingButton>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tight text-white">
              Find Empty <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">Classrooms</span>
            </h1>

            <p className="text-zinc-400 text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
              Instantly check availability for study sessions, meetings, or quiet time at NST. No login required.
            </p>

            {/* Active Week & Alerts */}
            <div className="space-y-6 w-full max-w-2xl mx-auto">
              {activeWeek && (
                <div className="flex justify-center">
                  <WeekIndicator
                    week={activeWeek}
                    isCurrent={dataStatus === 'success'}
                    isFallback={dataStatus === 'no-pdf'}
                  />
                </div>
              )}

              <AnimatePresence mode="wait">
                {statusMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertBanner {...statusMessage} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Animated Search Mode Toggle */}
            <div className="mt-12 p-1.5 bg-zinc-900/50 rounded-full border border-white/10 backdrop-blur-xl inline-flex relative shadow-2xl">
              {[
                { id: 'free', label: 'Free Now', icon: Clock, active: freeNow, onClick: handleFreeNow },
                { id: 'custom', label: 'Custom Time', icon: Calendar, active: !freeNow, onClick: handleManualSearch }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={tab.onClick}
                  className={`relative flex items-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-colors z-10 ${tab.active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                  {tab.active && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-zinc-800 rounded-full border border-white/10 shadow-lg"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon className="w-4 h-4 relative z-20" />
                  <span className="relative z-20">{tab.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Filters Section */}
        <AnimatePresence mode="wait">
          {!freeNow && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <Card className="max-w-4xl mx-auto bg-zinc-900/40 border-white/10 backdrop-blur-md shadow-2xl">
                <CardContent className="p-6 sm:p-8">
                  <div className="space-y-8">
                    {/* Top Row: Day & Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                          <Calendar className="w-4 h-4" /> Select Day
                        </div>
                        <DaySelector value={day} onChange={setDay} weekStartDate={weekStartDate} />
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                          <Clock className="w-4 h-4" /> Min Duration
                        </div>
                        <DurationFilter value={minDuration} onChange={setMinDuration} />
                      </div>
                    </div>

                    {/* Time Slots Grid */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                        <Search className="w-4 h-4" /> Select Time Slot
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {TIME_SLOTS.map((slot, idx) => (
                          <motion.button
                            key={slot}
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(39, 39, 42, 1)" }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setTimeIndex(idx)}
                            className={`py-3 px-2 rounded-lg text-sm font-medium transition-all border ${timeIndex === idx
                              ? 'bg-zinc-800 text-white border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                              : 'bg-zinc-900/30 text-zinc-500 border-zinc-800/50 hover:text-zinc-300 hover:border-zinc-700'
                              }`}
                          >
                            {slot}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Status Indicator */}
        {freeNow && currentTime && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto mb-10 text-center"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-emerald-200">
                Live availability for {currentTime}
              </span>
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {dataStatus !== 'no-schedule-week' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white tracking-tight">Available Rooms</h2>
                {loading && <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />}
              </div>

              <div className="flex items-center gap-4">
                {!loading && (
                  <StatusBadge status={rooms.length > 0 ? 'success' : 'muted'} showDot={rooms.length > 0}>
                    {rooms.length} {rooms.length === 1 ? 'Room' : 'Rooms'}
                  </StatusBadge>
                )}
                {lastRefresh && freeNow && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchRooms}
                    disabled={loading}
                    className="text-zinc-500 hover:text-white hover:bg-white/10 gap-2 text-xs h-8"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
              </div>
            </div>

            {/* Results Output */}
            <div className="min-h-[300px]">
              {dataStatus === 'error' ? (
                <EmptyState
                  icon="inbox"
                  title="Unable to load rooms"
                  description="There was a problem fetching room data. Please try again."
                  action={{ label: 'Retry', onClick: fetchRooms }}
                />
              ) : (
                <ResultsGrid
                  rooms={rooms}
                  loading={loading}
                  emptyMessage={
                    dataStatus === 'no-pdf' ? "No Timetable Data" :
                      dataStatus === 'weekend' ? "Weekend - Campus Closed" :
                        dataStatus === 'outside-hours' ? "Outside Operating Hours" :
                          "No rooms available"
                  }
                  emptyDescription={
                    dataStatus === 'no-pdf' ? "Timetable PDFs haven't been uploaded yet." :
                      dataStatus === 'weekend' ? "Use 'Custom Time' to check weekday availability." :
                        dataStatus === 'outside-hours' ? "Operating hours are 9:00 AM - 7:30 PM." :
                          "All classrooms are occupied. Try adjusting your filters."
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Legend - Bento Grid Style */}
        {rooms.length > 0 && !loading && dataStatus !== 'no-schedule-week' && (
          <div className="mt-20">
            <div className="flex items-center gap-2 mb-6">
              <Info className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Availability Guide</h3>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Long Session', sub: '3+ hours', color: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
                { label: 'Study Session', sub: '2+ hours', color: 'bg-green-500', glow: 'shadow-green-500/20' },
                { label: 'Meeting', sub: '1+ hour', color: 'bg-blue-500', glow: 'shadow-blue-500/20' },
                { label: 'Quick Use', sub: '<1 hour', color: 'bg-amber-500', glow: 'shadow-amber-500/20' },
              ].map((item) => (
                <div key={item.label} className="group relative overflow-hidden p-4 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg ${item.glow}`} />
                    <div>
                      <p className="text-zinc-200 font-medium text-sm">{item.sub}</p>
                      <p className="text-zinc-500 text-xs">{item.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-white/5 text-center relative z-10">
          <p className="text-zinc-600 text-sm">
            Made with <span className="text-red-500/60 animate-pulse">♥</span> by Abhiman Raj
          </p>
        </footer>
      </div>
    </main>
  );
}