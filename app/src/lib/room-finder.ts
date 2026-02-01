import type { RoomSchedule, FreeRoom, TimeSlot } from '@/types';
import { OPERATING_HOURS } from '@/types';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Convert HH:mm to minutes since midnight
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// Convert minutes since midnight to HH:mm
function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Merge schedules from multiple sources for the same room
export function mergeRoomSchedules(schedules: RoomSchedule[]): Map<string, Map<string, TimeSlot[]>> {
    const merged = new Map<string, Map<string, TimeSlot[]>>();

    schedules.forEach(schedule => {
        if (!merged.has(schedule.room)) {
            merged.set(schedule.room, new Map());
        }
        const roomMap = merged.get(schedule.room)!;

        if (!roomMap.has(schedule.day)) {
            roomMap.set(schedule.day, []);
        }
        roomMap.get(schedule.day)!.push(...schedule.occupied);
    });

    return merged;
}

// Find free slots for a room on a given day
function findFreeSlots(
    occupiedSlots: TimeSlot[],
    operatingStart: string = OPERATING_HOURS.start,
    operatingEnd: string = OPERATING_HOURS.end
): TimeSlot[] {
    const startMinutes = timeToMinutes(operatingStart);
    const endMinutes = timeToMinutes(operatingEnd);

    // Sort and merge overlapping occupied slots
    const sorted = [...occupiedSlots].sort((a, b) =>
        timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    const mergedOccupied: TimeSlot[] = [];
    for (const slot of sorted) {
        const slotStart = Math.max(timeToMinutes(slot.start), startMinutes);
        const slotEnd = Math.min(timeToMinutes(slot.end), endMinutes);

        if (slotStart >= slotEnd) continue;

        if (mergedOccupied.length === 0) {
            mergedOccupied.push({ start: minutesToTime(slotStart), end: minutesToTime(slotEnd) });
        } else {
            const last = mergedOccupied[mergedOccupied.length - 1];
            const lastEnd = timeToMinutes(last.end);

            if (slotStart <= lastEnd) {
                last.end = minutesToTime(Math.max(lastEnd, slotEnd));
            } else {
                mergedOccupied.push({ start: minutesToTime(slotStart), end: minutesToTime(slotEnd) });
            }
        }
    }

    // Invert to find free slots
    const freeSlots: TimeSlot[] = [];
    let currentStart = startMinutes;

    for (const occupied of mergedOccupied) {
        const occStart = timeToMinutes(occupied.start);

        if (currentStart < occStart) {
            freeSlots.push({
                start: minutesToTime(currentStart),
                end: occupied.start
            });
        }

        currentStart = Math.max(currentStart, timeToMinutes(occupied.end));
    }

    // Add remaining time until end of operating hours
    if (currentStart < endMinutes) {
        freeSlots.push({
            start: minutesToTime(currentStart),
            end: operatingEnd
        });
    }

    return freeSlots;
}

// Get current day of week
export function getCurrentDay(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Kolkata', weekday: 'short' };
    const day = new Intl.DateTimeFormat('en-US', options).format(now);
    // Match the existing format used in data (Thur instead of Thu)
    if (day === 'Thu') return 'Thur';
    return day;
}

// Get current time in HH:mm format
export function getCurrentTime(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    // en-GB ensures HH:mm format
    return new Intl.DateTimeFormat('en-GB', options).format(now);
}

// Main function to find free rooms
export function findFreeRooms(
    schedules: RoomSchedule[],
    day: string,
    targetTime?: string,
    minDuration?: number // in minutes
): FreeRoom[] {
    const merged = mergeRoomSchedules(schedules);
    const freeRooms: FreeRoom[] = [];

    merged.forEach((dayMap, room) => {
        const occupiedSlots = dayMap.get(day) || [];
        const freeSlots = findFreeSlots(occupiedSlots);

        for (const slot of freeSlots) {
            const start = timeToMinutes(slot.start);
            const end = timeToMinutes(slot.end);
            const duration = end - start;

            // Filter by minimum duration
            if (minDuration && duration < minDuration) continue;

            // Filter by target time
            if (targetTime) {
                const target = timeToMinutes(targetTime);
                if (target < start || target >= end) continue;
            }

            freeRooms.push({
                room,
                day,
                freeFrom: slot.start,
                freeTill: slot.end,
                duration
            });
        }
    });

    // Sort by duration (longest first), then by room number
    return freeRooms.sort((a, b) => {
        if (b.duration !== a.duration) return b.duration - a.duration;
        return parseInt(a.room) - parseInt(b.room);
    });
}

// Get rooms that are currently free
export function getFreeNow(schedules: RoomSchedule[]): FreeRoom[] {
    const currentDay = getCurrentDay();
    const currentTime = getCurrentTime();

    return findFreeRooms(schedules, currentDay, currentTime);
}
