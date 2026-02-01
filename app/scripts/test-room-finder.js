/**
 * Test script to verify room finder algorithm accuracy
 */

const fs = require('fs');
const path = require('path');

// Load schedule data
const schedulesPath = path.join(__dirname, '..', 'src', 'data', 'schedules.json');
const { schedules } = JSON.parse(fs.readFileSync(schedulesPath, 'utf-8'));

// Constants
const OPERATING_HOURS = { start: '09:00', end: '19:30' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thur'];
const ROOMS = ['401', '402', '403', '404', '405', '501', '502', '503', '504', '505'];

// Helper functions
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Merge schedules by room and day
function mergeRoomSchedules(schedules) {
    const merged = new Map();

    schedules.forEach(schedule => {
        const key = `${schedule.room}-${schedule.day}`;
        if (!merged.has(key)) {
            merged.set(key, {
                room: schedule.room,
                day: schedule.day,
                occupied: []
            });
        }
        merged.get(key).occupied.push(...schedule.occupied);
    });

    return merged;
}

// Find free slots for a room
function findFreeSlots(occupiedSlots) {
    const startMinutes = timeToMinutes(OPERATING_HOURS.start);
    const endMinutes = timeToMinutes(OPERATING_HOURS.end);

    // Sort and merge overlapping slots
    const sorted = [...occupiedSlots].sort((a, b) =>
        timeToMinutes(a.start) - timeToMinutes(b.start)
    );

    const mergedOccupied = [];
    for (const slot of sorted) {
        const slotStart = Math.max(timeToMinutes(slot.start), startMinutes);
        const slotEnd = Math.min(timeToMinutes(slot.end), endMinutes);

        if (slotStart >= slotEnd) continue;

        if (mergedOccupied.length === 0) {
            mergedOccupied.push({ start: slotStart, end: slotEnd });
        } else {
            const last = mergedOccupied[mergedOccupied.length - 1];
            if (slotStart <= last.end) {
                last.end = Math.max(last.end, slotEnd);
            } else {
                mergedOccupied.push({ start: slotStart, end: slotEnd });
            }
        }
    }

    // Invert to find free slots
    const freeSlots = [];
    let currentStart = startMinutes;

    for (const occupied of mergedOccupied) {
        if (currentStart < occupied.start) {
            freeSlots.push({
                start: minutesToTime(currentStart),
                end: minutesToTime(occupied.start)
            });
        }
        currentStart = Math.max(currentStart, occupied.end);
    }

    if (currentStart < endMinutes) {
        freeSlots.push({
            start: minutesToTime(currentStart),
            end: OPERATING_HOURS.end
        });
    }

    return freeSlots;
}

// Check if a room is free at a specific time
function isRoomFreeAt(freeSlots, targetTime) {
    const target = timeToMinutes(targetTime);
    return freeSlots.some(slot => {
        const start = timeToMinutes(slot.start);
        const end = timeToMinutes(slot.end);
        return target >= start && target < end;
    });
}

// Main test
console.log('=== Room Finder Algorithm Test ===\n');

const merged = mergeRoomSchedules(schedules);

// Test cases
const testCases = [
    { day: 'Mon', time: '10:00', description: 'Monday 10:00 AM' },
    { day: 'Mon', time: '12:00', description: 'Monday 12:00 PM (lunch)' },
    { day: 'Mon', time: '15:00', description: 'Monday 3:00 PM' },
    { day: 'Tue', time: '09:00', description: 'Tuesday 9:00 AM' },
    { day: 'Tue', time: '14:00', description: 'Tuesday 2:00 PM' },
    { day: 'Wed', time: '10:00', description: 'Wednesday 10:00 AM' },
    { day: 'Thur', time: '09:30', description: 'Thursday 9:30 AM' },
];

for (const testCase of testCases) {
    console.log(`\n--- ${testCase.description} ---`);

    const freeRooms = [];
    const occupiedRooms = [];

    for (const room of ROOMS) {
        const key = `${room}-${testCase.day}`;
        const entry = merged.get(key);
        const occupiedSlots = entry ? entry.occupied : [];
        const freeSlots = findFreeSlots(occupiedSlots);

        if (isRoomFreeAt(freeSlots, testCase.time)) {
            // Find which slot they're free in
            for (const slot of freeSlots) {
                const start = timeToMinutes(slot.start);
                const end = timeToMinutes(slot.end);
                const target = timeToMinutes(testCase.time);
                if (target >= start && target < end) {
                    freeRooms.push({ room, freeFrom: slot.start, freeTill: slot.end });
                    break;
                }
            }
        } else {
            // Find which slot they're occupied in
            for (const slot of occupiedSlots) {
                const start = timeToMinutes(slot.start);
                const end = timeToMinutes(slot.end);
                const target = timeToMinutes(testCase.time);
                if (target >= start && target < end) {
                    occupiedRooms.push({
                        room,
                        occupiedFrom: slot.start,
                        occupiedTill: slot.end,
                        batch: slot.batch,
                        subject: slot.subject
                    });
                    break;
                }
            }
        }
    }

    console.log(`Free rooms (${freeRooms.length}):`);
    if (freeRooms.length === 0) {
        console.log('  None');
    } else {
        freeRooms.forEach(r => console.log(`  Room ${r.room}: ${r.freeFrom} - ${r.freeTill}`));
    }

    console.log(`Occupied rooms (${occupiedRooms.length}):`);
    occupiedRooms.forEach(r => console.log(`  Room ${r.room}: ${r.occupiedFrom} - ${r.occupiedTill} (${r.batch})`));
}

// Detailed Monday 10:00 AM analysis
console.log('\n\n=== Detailed Monday 10:00 AM Analysis ===\n');

for (const room of ROOMS) {
    const key = `${room}-Mon`;
    const entry = merged.get(key);
    const occupiedSlots = entry ? entry.occupied : [];

    console.log(`Room ${room}:`);
    console.log('  Occupied slots:');
    if (occupiedSlots.length === 0) {
        console.log('    None');
    } else {
        occupiedSlots.forEach(slot => {
            console.log(`    ${slot.start} - ${slot.end}: ${slot.batch} (${slot.subject})`);
        });
    }

    const freeSlots = findFreeSlots(occupiedSlots);
    console.log('  Free slots:');
    if (freeSlots.length === 0) {
        console.log('    None');
    } else {
        freeSlots.forEach(slot => console.log(`    ${slot.start} - ${slot.end}`));
    }

    const isFreeAt10 = isRoomFreeAt(freeSlots, '10:00');
    console.log(`  Is free at 10:00? ${isFreeAt10 ? 'YES' : 'NO'}`);
    console.log('');
}

console.log('\n=== Test Complete ===');
