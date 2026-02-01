import { readdir } from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';
import type { RoomSchedule, TimeSlot } from '@/types';

// Get the most recent PDF for each semester
async function getActivePdfPaths(): Promise<string[]> {
    const pdfs: string[] = [];
    const timetablesDir = path.join(process.cwd(), 'public', 'timetables');

    for (const semester of [1, 2]) {
        const semesterDir = path.join(timetablesDir, `semester${semester}`);
        try {
            const files = await readdir(semesterDir);
            const pdfFiles = files.filter(f => f.endsWith('.pdf')).sort().reverse();
            if (pdfFiles.length > 0) {
                pdfs.push(path.join(semesterDir, pdfFiles[0]));
            }
        } catch {
            // Directory doesn't exist
        }
    }

    return pdfs;
}

// Extract text from PDF
async function extractPdfText(pdfPath: string): Promise<string> {
    try {
        const result = execSync(`pdftotext -layout "${pdfPath}" -`, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024
        });
        return result;
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return '';
    }
}

// Extract all room numbers from text
function extractRoomNumbers(text: string): string[] {
    const rooms: string[] = [];

    const patterns = [
        /Room\s*(?:No\.?|no)?\s*(\d{3})/gi,
        /\(Room\s*(?:no)?\s*(\d{3})\)/gi,
        /\((\d{3})\)/g,  // Just (401), (402), etc.
        /Enigma[=:\s-]+(\d{3})/gi,
        /Lambda[=:\s-]+(\d{3})/gi,
        /Memory[=:\s-]+(\d{3})/gi,
        /Architecture[=:\s-]+(\d{3})/gi,
        /Infinity[=:\s-]+(\d{3})/gi,
        /Mock\s*Theta[=:\s-]+(\d{3})/gi,
        /MockTheta[=:\s-]+(\d{3})/gi,
        /Compiler[=:\s-]+(\d{3})/gi,
        /Debugger[=:\s-]+(\d{3})/gi,
        /Lab\s*\d?\s*(\d{3})/gi,  // Lab 1 403, Lab 2 404
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const room = match[1];
            // Only include valid room numbers (3 digits, 4xx or 5xx)
            if (room && (room.startsWith('4') || room.startsWith('5')) && !rooms.includes(room)) {
                rooms.push(room);
            }
        }
    }

    return rooms;
}

// Estimate time slot based on horizontal position in line
function estimateTimeSlot(position: number, lineLength: number): TimeSlot | null {
    const relativePos = position / Math.max(lineLength, 1);

    // Skip if in lunch area (roughly middle of the line)
    if (relativePos > 0.45 && relativePos < 0.55) {
        return null;
    }

    if (relativePos < 0.12) {
        return { start: '09:00', end: '10:00' };
    } else if (relativePos < 0.22) {
        return { start: '09:30', end: '10:30' };
    } else if (relativePos < 0.32) {
        return { start: '10:30', end: '11:30' };
    } else if (relativePos < 0.42) {
        return { start: '11:00', end: '12:00' };
    } else if (relativePos < 0.58) {
        // Lunch area - skip
        return null;
    } else if (relativePos < 0.68) {
        return { start: '14:00', end: '15:00' };
    } else if (relativePos < 0.78) {
        return { start: '14:30', end: '15:30' };
    } else if (relativePos < 0.88) {
        return { start: '15:30', end: '16:30' };
    } else {
        return { start: '17:00', end: '18:00' };
    }
}

// Parse schedule from text
function parseScheduleFromText(text: string): RoomSchedule[] {
    const scheduleMap = new Map<string, Map<string, TimeSlot[]>>();
    const lines = text.split('\n');

    // Find day markers and their line indices
    const dayMarkers: { day: string; lineIndex: number }[] = [];
    const dayRegex = /^\s*(Mon|Tue|Wed|Thur|Fri)\s*$/;

    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(dayRegex);
        if (match) {
            dayMarkers.push({ day: match[1], lineIndex: i });
        }
    }

    // Assign lines to days
    // Lines between day markers belong to the PREVIOUS day marker
    // For the first section (before Mon), we look ahead to see which day it belongs to

    for (let dayIdx = 0; dayIdx < dayMarkers.length; dayIdx++) {
        const { day, lineIndex } = dayMarkers[dayIdx];
        if (day === 'Fri') continue; // Skip Friday (contest day)

        // Calculate line range for this day
        // Include 4 lines before the marker and all lines until next marker
        const startLine = dayIdx === 0 ? 0 : dayMarkers[dayIdx - 1].lineIndex + 1;
        const endLine = dayIdx < dayMarkers.length - 1
            ? dayMarkers[dayIdx + 1].lineIndex
            : lines.length;

        // Also include lines just before the day marker (they belong to this day)
        const actualStart = Math.max(0, lineIndex - 4);

        // Process lines for this day
        for (let i = actualStart; i < endLine; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            if (line.match(dayRegex)) continue; // Skip day marker line itself
            if (line.includes('CONTEST')) continue;

            // Extract rooms from line
            const lineRooms = extractRoomNumbers(line);

            for (const room of lineRooms) {
                // Find position of room mentions in line
                const roomPatterns = [
                    new RegExp(`Room\\s*(?:No\\.?|no)?\\s*${room}`, 'gi'),
                    new RegExp(`\\(Room\\s*(?:no)?\\s*${room}\\)`, 'gi'),
                    new RegExp(`\\(${room}\\)`, 'g'),
                    new RegExp(`Enigma[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Lambda[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Memory[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Architecture[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Infinity[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Mock\\s*Theta[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`MockTheta[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Compiler[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Debugger[=:\\s-]+${room}`, 'gi'),
                    new RegExp(`Lab\\s*\\d?\\s*${room}`, 'gi'),
                ];

                for (const pattern of roomPatterns) {
                    let match;
                    while ((match = pattern.exec(line)) !== null) {
                        const timeSlot = estimateTimeSlot(match.index, line.length);
                        if (timeSlot) {
                            if (!scheduleMap.has(room)) {
                                scheduleMap.set(room, new Map());
                            }
                            if (!scheduleMap.get(room)!.has(day)) {
                                scheduleMap.get(room)!.set(day, []);
                            }
                            scheduleMap.get(room)!.get(day)!.push(timeSlot);
                        }
                    }
                }
            }
        }
    }

    // Convert to RoomSchedule array
    const result: RoomSchedule[] = [];
    for (const [room, dayMap] of scheduleMap) {
        for (const [day, slots] of dayMap) {
            if (slots.length > 0) {
                result.push({
                    room,
                    day,
                    occupied: mergeTimeSlots(slots)
                });
            }
        }
    }

    return result;
}

// Merge overlapping time slots
function mergeTimeSlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    const merged: TimeSlot[] = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];

        // Merge if overlapping or adjacent
        const lastEnd = timeToMinutes(last.end);
        const currentStart = timeToMinutes(current.start);

        if (currentStart <= lastEnd + 30) { // Within 30 min = merge
            if (current.end > last.end) {
                last.end = current.end;
            }
        } else {
            merged.push({ ...current });
        }
    }

    return merged;
}

function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Main export
export async function getSchedulesFromPdfs(): Promise<RoomSchedule[]> {
    const pdfPaths = await getActivePdfPaths();

    if (pdfPaths.length === 0) {
        return [];
    }

    const allSchedules: RoomSchedule[] = [];

    for (const pdfPath of pdfPaths) {
        console.log('Parsing PDF:', pdfPath);
        const text = await extractPdfText(pdfPath);
        if (text.length > 0) {
            const schedules = parseScheduleFromText(text);
            console.log(`Found ${schedules.length} schedules`);
            allSchedules.push(...schedules);
        }
    }

    // Merge same room/day entries from different PDFs
    return mergeAllSchedules(allSchedules);
}

function mergeAllSchedules(schedules: RoomSchedule[]): RoomSchedule[] {
    const merged = new Map<string, RoomSchedule>();

    for (const schedule of schedules) {
        const key = `${schedule.room}-${schedule.day}`;
        if (merged.has(key)) {
            const existing = merged.get(key)!;
            existing.occupied = mergeTimeSlots([...existing.occupied, ...schedule.occupied]);
        } else {
            merged.set(key, { ...schedule, occupied: [...schedule.occupied] });
        }
    }

    return Array.from(merged.values());
}

export async function hasPdfFiles(): Promise<boolean> {
    const pdfs = await getActivePdfPaths();
    return pdfs.length > 0;
}
