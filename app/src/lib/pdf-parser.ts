/**
 * PDF Parser for Timetable Extraction
 * 
 * This module provides schedule data management.
 * Schedule data is stored as JSON and can be imported/updated via the admin panel.
 * 
 * For PDF parsing, a separate manual process or external service should be used
 * to extract the data and then import it via the API.
 */


import path from 'path';
import type { RoomSchedule, TimeSlot } from '@/types';

export interface ParsedSlot {
    start: string;
    end: string;
    batch?: string;
    subject?: string;
    semester?: number;
}

export interface ParsedScheduleEntry {
    room: string;
    day: string;
    occupied: ParsedSlot[];
}

export interface ParsedPDFResult {
    success: boolean;
    semester: number;
    schedules: ParsedScheduleEntry[];
    rawText?: string;
    error?: string;
}

export interface ScheduleCache {
    lastUpdated: string;
    schedules: ParsedScheduleEntry[];
}

// Schedule Cache Management via Supabase
// We store/retrieve 'schedules.json' from the 'timetables' bucket (or a separate one).
// Using 'timetables' bucket for simplicity: 'data/schedules.json'

const CACHE_FILE_PATH = 'data/schedules.json';

// Save parsed schedules to Supabase
export async function saveParsedSchedules(schedules: ParsedScheduleEntry[]): Promise<void> {
    const supabase = await createClient();

    const data = JSON.stringify({
        lastUpdated: new Date().toISOString(),
        schedules
    }, null, 2);

    await supabase
        .storage
        .from('timetables')
        .upload(CACHE_FILE_PATH, data, {
            upsert: true,
            contentType: 'application/json'
        });
}

// Load cached schedules from Supabase
export async function loadCachedSchedules(): Promise<ParsedScheduleEntry[] | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .storage
            .from('timetables')
            .download(CACHE_FILE_PATH);

        if (error || !data) return null;

        const text = await data.text();
        const parsed: ScheduleCache = JSON.parse(text);
        return parsed.schedules;
    } catch {
        return null;
    }
}

// Get the last cache update time
export async function getCacheLastUpdated(): Promise<string | null> {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .storage
            .from('timetables')
            .download(CACHE_FILE_PATH);

        if (error || !data) return null;

        const text = await data.text();
        const parsed: ScheduleCache = JSON.parse(text);
        return parsed.lastUpdated;
    } catch {
        return null;
    }
}

// Check if PDFs are available
import { createClient } from '@/lib/supabase/server';

export async function hasPDFData(): Promise<boolean> {
    const supabase = await createClient();

    for (const semester of [1, 2]) {
        const { data: files } = await supabase
            .storage
            .from('timetables')
            .list(`semester${semester}`, { limit: 1 });

        if (files && files.length > 0) {
            const hasPdf = files.some(f => f.name.endsWith('.pdf'));
            if (hasPdf) return true;
        }
    }

    return false;
}

// Check if we have actual parsed schedule data in cache
export async function hasScheduleData(): Promise<boolean> {
    const cached = await loadCachedSchedules();
    return cached !== null && cached.length > 0;
}

// Check if we have any data source available (cache or PDFs to parse)
export async function hasAnyDataSource(): Promise<boolean> {
    // Check cache first
    const cached = await loadCachedSchedules();
    if (cached && cached.length > 0) {
        return true;
    }

    // Check for PDFs
    return await hasPDFData();
}

// Get all parsed schedules (from cache or empty array)
export async function getAllParsedSchedules(): Promise<ParsedScheduleEntry[]> {
    const cached = await loadCachedSchedules();
    return cached || [];
}

// Convert ParsedScheduleEntry to RoomSchedule format
export function toRoomSchedule(entry: ParsedScheduleEntry): RoomSchedule {
    return {
        room: entry.room,
        day: entry.day,
        occupied: entry.occupied.map(slot => ({
            start: slot.start,
            end: slot.end
        }))
    };
}

// Merge time slots (combines overlapping/adjacent slots)
function mergeTimeSlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    const merged: TimeSlot[] = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];

        if (current.start <= last.end) {
            last.end = current.end > last.end ? current.end : last.end;
        } else {
            merged.push({ ...current });
        }
    }

    return merged;
}

// Parse schedule data from JSON format (for importing)
export function parseScheduleJSON(jsonData: unknown): ParsedScheduleEntry[] {
    if (!Array.isArray(jsonData)) {
        throw new Error('Schedule data must be an array');
    }

    return jsonData.map((item, index) => {
        if (!item.room || !item.day || !Array.isArray(item.occupied)) {
            throw new Error(`Invalid schedule entry at index ${index}`);
        }

        return {
            room: String(item.room),
            day: String(item.day),
            occupied: item.occupied.map((slot: Record<string, unknown>) => ({
                start: String(slot.start || ''),
                end: String(slot.end || ''),
                batch: slot.batch ? String(slot.batch) : undefined,
                subject: slot.subject ? String(slot.subject) : undefined,
                semester: slot.semester ? Number(slot.semester) : undefined
            }))
        };
    });
}

// Import schedule data from JSON
export async function importScheduleData(
    schedules: ParsedScheduleEntry[],
    merge: boolean = false
): Promise<{ success: boolean; count: number }> {
    let finalSchedules = schedules;

    if (merge) {
        // Merge with existing schedules
        const existing = await loadCachedSchedules() || [];
        const scheduleMap = new Map<string, ParsedScheduleEntry>();

        // Add existing schedules
        for (const entry of existing) {
            const key = `${entry.room}-${entry.day}`;
            scheduleMap.set(key, { ...entry, occupied: [...entry.occupied] });
        }

        // Merge new schedules
        for (const entry of schedules) {
            const key = `${entry.room}-${entry.day}`;
            if (scheduleMap.has(key)) {
                const existing = scheduleMap.get(key)!;
                existing.occupied.push(...entry.occupied);
                existing.occupied = mergeTimeSlots(existing.occupied);
            } else {
                scheduleMap.set(key, { ...entry, occupied: [...entry.occupied] });
            }
        }

        finalSchedules = Array.from(scheduleMap.values());
    }

    await saveParsedSchedules(finalSchedules);

    return { success: true, count: finalSchedules.length };
}

// Clear all schedule data
export async function clearScheduleData(): Promise<void> {
    const supabase = await createClient();
    try {
        await supabase
            .storage
            .from('timetables')
            .remove([CACHE_FILE_PATH]);
    } catch {
        // Ignore error
    }
}

// Get all unique rooms from schedules
export function getAllRooms(schedules: RoomSchedule[]): string[] {
    const rooms = new Set<string>();
    schedules.forEach(s => rooms.add(s.room));
    return Array.from(rooms).sort((a, b) => parseInt(a) - parseInt(b));
}
