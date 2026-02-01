import { NextRequest, NextResponse } from 'next/server';
import { findFreeRooms, getCurrentDay, getCurrentTime } from '@/lib/room-finder';
import { getAllParsedSchedules, hasScheduleData, toRoomSchedule, hasPDFData } from '@/lib/pdf-parser';
import type { RoomSchedule } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

// All available rooms (4th and 5th floor)
const ALL_ROOMS = ['401', '402', '403', '404', '405', '501', '502', '503', '504', '505'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thur'];

// Get schedules from parsed PDFs/cache
async function getSchedulesFromCache(): Promise<RoomSchedule[]> {
    const parsed = await getAllParsedSchedules();
    if (parsed.length > 0) {
        return parsed.map(toRoomSchedule);
    }
    return [];
}

// Create complete schedule data with empty arrays for rooms/days without entries
function getCompleteSchedules(schedules: RoomSchedule[]): RoomSchedule[] {
    const scheduleMap = new Map<string, RoomSchedule>();

    // Add existing schedules to map
    for (const schedule of schedules) {
        const key = `${schedule.room}-${schedule.day}`;
        if (scheduleMap.has(key)) {
            // Merge occupied slots
            const existing = scheduleMap.get(key)!;
            existing.occupied = [...existing.occupied, ...schedule.occupied];
        } else {
            scheduleMap.set(key, { ...schedule, occupied: [...schedule.occupied] });
        }
    }

    // Ensure all room/day combinations exist
    for (const room of ALL_ROOMS) {
        for (const day of DAYS) {
            const key = `${room}-${day}`;
            if (!scheduleMap.has(key)) {
                scheduleMap.set(key, { room, day, occupied: [] });
            }
        }
    }

    return Array.from(scheduleMap.values());
}

// Helper to get active week info
async function getActiveWeekInfo() {
    try {
        const configPath = path.join(process.cwd(), 'src', 'data', 'config.json');
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);

        const weekStartDate = config.weekStartDate || '';
        const weekEndDate = config.weekEndDate || '';

        let activeWeek = 'Unknown Week';
        if (weekStartDate && weekEndDate) {
            // Simple check without date-dns for basic display, or use the helper in utils if available
            // For now, let's keep it simple as the client will fetch full config if needed
            // But we want to return the display string here
            try {
                // Formatting logic similar to config route
                // We'll return the raw dates and the display string
                const formatDate = (d: string) => {
                    const date = new Date(d);
                    const day = date.getDate();
                    const month = date.toLocaleString('default', { month: 'short' });
                    const getSuffix = (n: number) => {
                        if (n >= 11 && n <= 13) return 'th';
                        switch (n % 10) {
                            case 1: return 'st';
                            case 2: return 'nd';
                            case 3: return 'rd';
                            default: return 'th';
                        }
                    };
                    return `${day}${getSuffix(day)} ${month}`;
                };
                activeWeek = `${formatDate(weekStartDate)} - ${formatDate(weekEndDate)}`;
            } catch (e) {
                activeWeek = `${weekStartDate} - ${weekEndDate}`;
            }
        }

        // Check isCurrentWeek
        let isCurrentWeek = false;
        if (weekStartDate && weekEndDate) {
            const today = new Date();
            const start = new Date(weekStartDate);
            const end = new Date(weekEndDate);
            // reset times for comparison
            today.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            isCurrentWeek = today >= start && today <= end;
        }

        return { activeWeek, isCurrentWeek, weekStartDate };
    } catch {
        return { activeWeek: null, isCurrentWeek: false, weekStartDate: null };
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const day = searchParams.get('day') || getCurrentDay();
    const time = searchParams.get('time') || undefined;
    const minDuration = searchParams.get('minDuration')
        ? parseInt(searchParams.get('minDuration')!)
        : undefined;
    const freeNow = searchParams.get('freeNow') === 'true';

    try {
        // Check if we have schedule data
        const hasData = await hasScheduleData();
        const hasPDFs = await hasPDFData();
        const { activeWeek, isCurrentWeek, weekStartDate } = await getActiveWeekInfo();

        if (!hasData) {
            // Return empty results with a message indicating no data
            return NextResponse.json({
                success: true,
                data: [],
                meta: {
                    day: freeNow ? getCurrentDay() : day,
                    time: freeNow ? getCurrentTime() : time,
                    minDuration,
                    currentTime: getCurrentTime(),
                    hasData: false,
                    hasPDFs,
                    message: hasPDFs
                        ? 'PDFs uploaded but schedule data not imported. Please import schedule data in the admin panel.'
                        : 'No timetable data available. Please upload PDFs and import schedule data.',
                    activeWeek,
                    isCurrentWeek,
                    weekStartDate
                }
            });
        }

        // Get schedules from cache
        const rawSchedules = await getSchedulesFromCache();
        const schedules = getCompleteSchedules(rawSchedules);

        // Find free rooms
        const targetTime = freeNow ? getCurrentTime() : time;
        const targetDay = freeNow ? getCurrentDay() : day;

        const freeRooms = findFreeRooms(schedules, targetDay, targetTime, minDuration);

        return NextResponse.json({
            success: true,
            data: freeRooms,
            meta: {
                day: targetDay,
                time: targetTime,
                minDuration,
                currentTime: getCurrentTime(),
                hasData: true,
                hasPDFs: true,
                totalSchedules: schedules.length,
                dataSource: 'cache',
                activeWeek,
                isCurrentWeek,
                weekStartDate
            }
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch room data' },
            { status: 500 }
        );
    }
}

// Clear cache endpoint
export async function POST() {
    try {
        // Clear the cached schedules
        const cachePath = path.join(process.cwd(), 'src', 'data', 'schedules.json');
        try {
            await fs.unlink(cachePath);
        } catch {
            // Cache file doesn't exist, that's fine
        }

        return NextResponse.json({ success: true, message: 'Cache cleared' });
    } catch (error) {
        console.error('Cache clear error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear cache' },
            { status: 500 }
        );
    }
}
