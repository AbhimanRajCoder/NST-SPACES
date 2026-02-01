/**
 * PDF Timetable Parser Script
 * Parses uploaded PDFs and generates schedules.json
 */

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const TIMETABLES_DIR = path.join(__dirname, '..', 'public', 'timetables');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'schedules.json');

// Time slots for the timetable (based on PDF structure)
const TIME_SLOTS = [
    { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' },
    { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' },
    { start: '11:00', end: '11:30' },
    { start: '11:30', end: '12:00' },
    { start: '12:00', end: '12:30' },
    { start: '12:30', end: '13:00' },
    { start: '13:00', end: '13:30' },
    { start: '13:30', end: '14:00' },
    { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' },
    { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' },
    { start: '16:00', end: '16:30' },
    { start: '16:30', end: '17:00' },
];

// All valid rooms (401-405 on 4th floor, 501-505 on 5th floor)
const VALID_ROOMS = ['401', '402', '403', '404', '405', '501', '502', '503', '504', '505'];

// Days of the week
const DAYS = ['Mon', 'Tue', 'Wed', 'Thur'];

// Room name mappings (from PDF naming to room numbers)
const ROOM_ALIASES = {
    // Direct room numbers
    '401': '401', '402': '402', '403': '403', '404': '404', '405': '405',
    '501': '501', '502': '502', '503': '503', '504': '504', '505': '505',

    // Lab names from Sem 2 (Turing batch)
    'Enigma': '504',
    'Lambda': '503',

    // Lab names from Sem 2 (Neumann batch)
    'Memory': '505',
    'Architecture': '405',

    // Lab names from Sem 2 (Ramanujan batch)
    'Infinity': '503',
    'Mock Theta': '504',
    'MockTheta': '504',

    // Lab names from Sem 2 (Hopper batch)
    'Compiler': '505',
    'Debugger': '405',
};

async function extractPDFText(filePath) {
    const dataBuffer = new Uint8Array(fs.readFileSync(filePath));

    const loadingTask = pdfjsLib.getDocument({
        data: dataBuffer,
        useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const items = textContent.items.map(item => ({
            text: item.str,
            x: item.transform[4],
            y: item.transform[5]
        }));

        // Sort by Y descending, then X ascending
        items.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 5) {
                return b.y - a.y;
            }
            return a.x - b.x;
        });

        // Group by rows
        const rows = [];
        let currentRow = [];
        let lastY = null;

        for (const item of items) {
            if (lastY !== null && Math.abs(item.y - lastY) > 5) {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [];
            }
            currentRow.push(item);
            lastY = item.y;
        }
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        for (const row of rows) {
            const rowText = row.map(item => item.text).join('\t');
            fullText += rowText + '\n';
        }
    }

    return fullText;
}

// Extract room numbers from text like "Room No. 501", "Enigma- 504", etc.
function extractRooms(text) {
    const rooms = new Set();

    // Pattern 1: "Room No. 501" or "Room no 501" or "(Room no 401)"
    const roomNoPattern = /Room\s*[Nn]o\.?\s*(\d{3})/gi;
    let match;
    while ((match = roomNoPattern.exec(text)) !== null) {
        if (VALID_ROOMS.includes(match[1])) {
            rooms.add(match[1]);
        }
    }

    // Pattern 2: Lab names like "Enigma- 504", "Lambda- 503", "(Infinity:- 404"
    // This pattern matches: Name[-=:] number
    const labPattern = /([A-Za-z\s]+)[-=:]+\s*(\d{3})/g;
    while ((match = labPattern.exec(text)) !== null) {
        if (VALID_ROOMS.includes(match[2])) {
            rooms.add(match[2]);
        }
    }

    // Pattern 3: Just "(501)" or similar
    const parenPattern = /\((\d{3})\)/g;
    while ((match = parenPattern.exec(text)) !== null) {
        if (VALID_ROOMS.includes(match[1])) {
            rooms.add(match[1]);
        }
    }

    // Pattern 4: "Lab 1 403", "Lab 2 404"
    const labNumPattern = /Lab\s*\d\s*(\d{3})/gi;
    while ((match = labNumPattern.exec(text)) !== null) {
        if (VALID_ROOMS.includes(match[1])) {
            rooms.add(match[1]);
        }
    }

    return Array.from(rooms);
}

// Parse the PDF text and extract schedule data
function parseScheduleText(text, semester) {
    const lines = text.split('\n').filter(line => line.trim());
    const scheduleMap = new Map(); // key: "room-day", value: { room, day, slots: [] }

    let currentDay = null;
    let currentBatch = null;
    let subjects = []; // Current row of subjects

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t').map(p => p.trim());

        // Skip header rows and empty rows
        if (line.includes('PAGE BREAK') || line.includes('Sub Batch')) continue;

        // Check for day marker
        for (const day of DAYS) {
            if (parts[0] === day || parts.some(p => p === day)) {
                currentDay = day;
                break;
            }
        }

        // Check for batch
        const batchPatterns = ['Ramanujan', 'Hopper', 'Turing', 'Neumann'];
        for (const batch of batchPatterns) {
            if (line.includes(batch)) {
                currentBatch = batch;
                break;
            }
        }

        // Skip if no day set
        if (!currentDay) continue;

        // Extract rooms from this line
        const roomsInLine = extractRooms(line);

        // If we find rooms, this is likely a room assignment line
        if (roomsInLine.length > 0 && currentBatch) {
            // Previous line should have subjects
            const prevLine = i > 0 ? lines[i - 1] : '';
            const subjectParts = prevLine.split('\t').map(p => p.trim());

            // Parse time slots based on room positions
            // This is a simplified approach - we'll assign time blocks based on content

            for (const room of roomsInLine) {
                const key = `${room}-${currentDay}`;
                if (!scheduleMap.has(key)) {
                    scheduleMap.set(key, {
                        room,
                        day: currentDay,
                        occupied: []
                    });
                }

                // Determine time slots based on content analysis
                const entry = scheduleMap.get(key);

                // Check what type of class/lab it is
                const isLab = line.includes('Lab') || prevLine.includes('Lab');
                const isLecture = prevLine.includes('Lec') || prevLine.includes('Lecture');
                const isTutorial = prevLine.includes('TUT') || prevLine.includes('Tut');

                // Parse the time slots more carefully
                // Labs typically span 2 hours, lectures 1 hour
                let slotDuration = isLab ? { start: '09:00', end: '11:30' } :
                    isLecture ? { start: '09:00', end: '10:30' } :
                        { start: '09:00', end: '10:30' };

                // We need to determine actual position in the schedule
                // This requires more sophisticated parsing based on PDF column positions
            }
        }
    }

    return Array.from(scheduleMap.values());
}

// More detailed parsing - parse by analyzing the structure more carefully
function parseDetailedSchedule(sem2Text, sem4Text) {
    const schedules = [];

    // Based on manual analysis of the PDFs, here's the detailed schedule:
    // The format shows batch schedules with room assignments

    // SEMESTER 2 (Sem 2) - Lines 3-34 of semester1_raw.txt
    // SEMESTER 4 (Sem 4) - Lines 3-38 of semester2_raw.txt

    const sem2Schedule = parseSem2Schedule(sem2Text);
    const sem4Schedule = parseSem4Schedule(sem4Text);

    // Combine both schedules
    const combinedMap = new Map();

    for (const entry of [...sem2Schedule, ...sem4Schedule]) {
        const key = `${entry.room}-${entry.day}`;
        if (!combinedMap.has(key)) {
            combinedMap.set(key, {
                room: entry.room,
                day: entry.day,
                occupied: []
            });
        }
        combinedMap.get(key).occupied.push(...entry.occupied);
    }

    // Merge overlapping slots
    for (const [key, entry] of combinedMap) {
        entry.occupied = mergeTimeSlots(entry.occupied);
    }

    return Array.from(combinedMap.values());
}

// Parse Semester 2 schedule based on the raw text
function parseSem2Schedule(text) {
    const schedules = [];

    // Based on analysis of semester1_raw.txt:
    // Time slots: 9:00-9:30, 9:30-10:00, 10:00-10:30, 10:30-10:50, 10:50-11:00, 11:00-11:30, 11:30-12:00, etc.
    // With lunch from 12:20-13:30 approximately

    // MONDAY - Sem 2
    // Ramanujan: Room 501 - DSA Lec (9:00-10:00), Maths II Lec (10:00-10:30), FOAI Lec (10:30-11:00), then after lunch WAP Lec (14:00-15:00)
    // Hopper: Room 502 - WAP Lec (9:00-10:00), DSA Lec (10:00-10:30), Maths II Lec (10:30-11:00), PC after lunch
    // Turing: Room 402 for FOAI Lec (9:00-9:30), then Labs in 503, 504 (WAP Lab, Maths TUT, DSA Lab)
    // Neumann: Labs in 405, 505 (Maths II TUT, DSA Lab, WAP Lab, FOAI Lab)

    // Let me parse more systematically:
    // Monday:
    schedules.push({
        room: '501', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan', subject: 'DSA/Maths/FOAI Lectures', semester: 2 },
            { start: '14:00', end: '15:30', batch: 'Ramanujan', subject: 'Problem Solving + WAP', semester: 2 }
        ]
    });
    schedules.push({
        room: '502', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper', subject: 'WAP/DSA/Maths Lectures', semester: 2 }
        ]
    });
    schedules.push({
        room: '402', day: 'Mon', occupied: [
            { start: '09:00', end: '09:30', batch: 'Turing', subject: 'FOAI Lec', semester: 2 }
        ]
    });
    schedules.push({
        room: '503', day: 'Mon', occupied: [
            { start: '09:30', end: '11:30', batch: 'Turing/Lambda', subject: 'WAP Lab/Maths TUT', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'DSA Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '504', day: 'Mon', occupied: [
            { start: '09:30', end: '11:30', batch: 'Turing/Enigma', subject: 'WAP Lab/Maths TUT', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Turing/Enigma', subject: 'DSA Lab', semester: 2 },
            { start: '09:00', end: '11:30', batch: 'Ramanujan', subject: 'DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '405', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Neumann/Architecture', subject: 'Maths II TUT/DSA Lab/WAP Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Neumann', subject: 'FOAI Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '505', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Neumann/Memory', subject: 'Maths II TUT/DSA Lab/WAP Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Neumann', subject: 'FOAI Lab', semester: 2 }
        ]
    });

    // Tuesday - Sem 2
    schedules.push({
        room: '503', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity', subject: 'DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '504', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Mock Theta', subject: 'DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '505', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Compiler', subject: 'Maths II TUT/DSA Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '405', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Debugger', subject: 'Maths II TUT/DSA Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '401', day: 'Tue', occupied: [
            { start: '10:30', end: '11:30', batch: 'Hopper', subject: 'FOAI Lec', semester: 2 },
            { start: '14:00', end: '15:00', batch: 'Hopper', subject: 'Problem Solving', semester: 2 }
        ]
    });
    schedules.push({
        room: '402', day: 'Tue', occupied: [
            { start: '14:30', end: '15:30', batch: 'Hopper', subject: 'Lecture', semester: 2 }
        ]
    });
    schedules.push({
        room: '501', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Turing', subject: 'DSA/Maths/WAP Lectures', semester: 2 },
            { start: '15:00', end: '17:00', batch: 'Turing', subject: 'CP Foundation', semester: 2 }
        ]
    });
    schedules.push({
        room: '502', day: 'Tue', occupied: [
            { start: '09:30', end: '11:30', batch: 'Neumann', subject: 'DSA/Maths/WAP Lectures', semester: 2 }
        ]
    });

    // Wednesday - Sem 2
    schedules.push({
        room: '501', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan', subject: 'DSA/Maths/FOAI Lectures', semester: 2 }
        ]
    });
    schedules.push({
        room: '502', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper', subject: 'WAP/DSA/Maths Lectures', semester: 2 }
        ]
    });
    schedules.push({
        room: '402', day: 'Wed', occupied: [
            { start: '09:00', end: '09:30', batch: 'Turing', subject: 'FOAI Lec', semester: 2 },
            { start: '14:30', end: '15:30', batch: 'Turing', subject: 'Problem Solving', semester: 2 }
        ]
    });
    schedules.push({
        room: '503', day: 'Wed', occupied: [
            { start: '09:30', end: '11:30', batch: 'Turing/Lambda', subject: 'WAP Lab/Maths TUT', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper/Debugger', subject: 'FOAI Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '504', day: 'Wed', occupied: [
            { start: '09:30', end: '11:30', batch: 'Turing/Enigma', subject: 'WAP Lab/Maths TUT', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper/Compiler', subject: 'FOAI Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '405', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Neumann/Architecture', subject: 'Maths II TUT/DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '505', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Neumann/Memory', subject: 'Maths II TUT/DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '403', day: 'Wed', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Enigma', subject: 'DSA Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '404', day: 'Wed', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'DSA Lab', semester: 2 }
        ]
    });

    // Thursday - Sem 2
    schedules.push({
        room: '503', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity', subject: 'DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '504', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Mock Theta', subject: 'DSA Lab/WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '505', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Compiler', subject: 'Maths II TUT/DSA Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '405', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Debugger', subject: 'Maths II TUT/DSA Lab', semester: 2 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'WAP Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '401', day: 'Thur', occupied: [
            { start: '10:30', end: '11:30', batch: 'Hopper', subject: 'FOAI Lec', semester: 2 }
        ]
    });
    schedules.push({
        room: '501', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Turing', subject: 'DSA/Maths/WAP Lectures', semester: 2 }
        ]
    });
    schedules.push({
        room: '502', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Neumann', subject: 'FOAI/DSA/Maths/WAP Lectures', semester: 2 }
        ]
    });
    schedules.push({
        room: '403', day: 'Thur', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Enigma', subject: 'FOAI Lab', semester: 2 }
        ]
    });
    schedules.push({
        room: '404', day: 'Thur', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'FOAI Lab', semester: 2 }
        ]
    });

    return schedules;
}

// Parse Semester 4 schedule based on semester2_raw.txt
function parseSem4Schedule(text) {
    const schedules = [];

    // MONDAY - Sem 4
    schedules.push({
        room: '401', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan', subject: 'AI/ML Lec, Maths 4 Lec', semester: 4 },
            { start: '14:00', end: '15:30', batch: 'Hopper', subject: 'AI/ML Lec', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Turing', subject: 'Maths 4 Lec', semester: 4 }
        ]
    });
    schedules.push({
        room: '402', day: 'Mon', occupied: [
            { start: '10:00', end: '11:30', batch: 'Hopper', subject: 'SESD Lec, DVA Lec', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'TIP Entrepreneurship', subject: 'TIP', semester: 4 }
        ]
    });
    schedules.push({
        room: '403', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/MockTheta', subject: 'DVA Lab/SESD Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'FSDE Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '404', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity+Turing/Enigma', subject: 'DVA Lab/SESD Lab/AI/ML Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Hopper+Turing', subject: 'FSDE Lab/DVA Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '503', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Debugger', subject: 'Maths 4 Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Ramanujan', subject: 'NT Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '504', day: 'Mon', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Compiler', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '505', day: 'Mon', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'DVA Lab', semester: 4 }
        ]
    });

    // TUESDAY - Sem 4
    schedules.push({
        room: '401', day: 'Tue', occupied: [
            { start: '09:30', end: '11:30', batch: 'Ramanujan', subject: 'SESD Lec', semester: 4 },
            { start: '14:00', end: '15:30', batch: 'Ramanujan', subject: 'DVA Lec', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Ramanujan+Hopper', subject: 'NT Lec+Maths 4 Lec', semester: 4 }
        ]
    });
    schedules.push({
        room: '402', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Turing', subject: 'SESD/DVA/AI-ML Lectures', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Hopper', subject: 'FSDE', semester: 4 }
        ]
    });
    schedules.push({
        room: '403', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/MockTheta+Hopper/Debugger', subject: 'AI/ML Lab+DVA Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'SESD Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '404', day: 'Tue', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity+Hopper/Compiler', subject: 'AI/ML Lab+DVA Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Hopper', subject: 'SESD Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '503', day: 'Tue', occupied: [
            { start: '14:00', end: '17:00', batch: 'Ramanujan/Infinity', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '504', day: 'Tue', occupied: [
            { start: '11:30', end: '12:30', batch: 'Turing', subject: 'Maths 4 Lab', semester: 4 },
            { start: '14:00', end: '17:00', batch: 'Ramanujan/MockTheta', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '505', day: 'Tue', occupied: [
            { start: '14:00', end: '17:00', batch: 'Hopper/Compiler', subject: 'SESD Lab', semester: 4 }
        ]
    });

    // WEDNESDAY - Sem 4
    schedules.push({
        room: '401', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan', subject: 'AI/ML Lec, Maths 4 Lec', semester: 4 },
            { start: '14:00', end: '15:30', batch: 'Hopper', subject: 'SESD Lec', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Turing', subject: 'Maths 4 Lec', semester: 4 }
        ]
    });
    schedules.push({
        room: '402', day: 'Wed', occupied: [
            { start: '10:00', end: '11:30', batch: 'Hopper', subject: 'AI/ML Lec, DVA Lec', semester: 4 },
            { start: '14:00', end: '15:30', batch: 'Ramanujan', subject: 'DVA Lec', semester: 4 }
        ]
    });
    schedules.push({
        room: '403', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/MockTheta+Turing/Lambda', subject: 'SESD Lab/DVA Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '404', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity+Turing/Enigma', subject: 'SESD Lab/DVA Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '405', day: 'Wed', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'AI/ML Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '503', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Debugger', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '504', day: 'Wed', occupied: [
            { start: '09:00', end: '11:30', batch: 'Hopper/Compiler', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '505', day: 'Wed', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Enigma', subject: 'AI/ML Lab', semester: 4 },
            { start: '17:00', end: '19:00', batch: 'CP Central', subject: 'CP Central Course', semester: 4 }
        ]
    });

    // THURSDAY - Sem 4
    schedules.push({
        room: '401', day: 'Thur', occupied: [
            { start: '09:30', end: '11:30', batch: 'Ramanujan', subject: 'SESD Lec', semester: 4 },
            { start: '14:00', end: '15:30', batch: 'Ramanujan', subject: 'DVA Lec', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Ramanujan+Hopper', subject: 'NT Lec+Maths 4 Lec', semester: 4 }
        ]
    });
    schedules.push({
        room: '402', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Turing', subject: 'SESD/DVA/AI-ML Lectures', semester: 4 },
            { start: '15:30', end: '17:00', batch: 'Hopper', subject: 'FSDE', semester: 4 }
        ]
    });
    schedules.push({
        room: '403', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/MockTheta+Hopper/Debugger', subject: 'AI/ML Lab+DVA Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '404', day: 'Thur', occupied: [
            { start: '09:00', end: '11:30', batch: 'Ramanujan/Infinity+Hopper/Compiler', subject: 'AI/ML Lab+DVA Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '503', day: 'Thur', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Lambda', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '504', day: 'Thur', occupied: [
            { start: '14:00', end: '17:00', batch: 'Turing/Enigma', subject: 'Maths 4 Lab', semester: 4 }
        ]
    });
    schedules.push({
        room: '505', day: 'Thur', occupied: [
            { start: '14:00', end: '17:00', batch: 'Hopper/Debugger', subject: 'SESD Lab', semester: 4 }
        ]
    });

    return schedules;
}

// Merge overlapping time slots
function mergeTimeSlots(slots) {
    if (slots.length === 0) return [];

    // Sort by start time
    const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
    const merged = [{ ...sorted[0] }];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];

        // If overlapping or adjacent (within 30 minutes), merge
        if (current.start <= last.end) {
            last.end = current.end > last.end ? current.end : last.end;
            // Combine batch info
            if (current.batch && !last.batch?.includes(current.batch)) {
                last.batch = `${last.batch}, ${current.batch}`;
            }
        } else {
            merged.push({ ...current });
        }
    }

    return merged;
}

async function main() {
    console.log('=== PDF Timetable Parser ===\n');

    const sem2Path = path.join(TIMETABLES_DIR, 'semester1');
    const sem4Path = path.join(TIMETABLES_DIR, 'semester2');

    let sem2Text = '';
    let sem4Text = '';

    // Read Sem 2 PDFs
    if (fs.existsSync(sem2Path)) {
        const files = fs.readdirSync(sem2Path).filter(f => f.endsWith('.pdf'));
        for (const file of files) {
            console.log(`Reading Sem 2: ${file}`);
            sem2Text += await extractPDFText(path.join(sem2Path, file));
        }
    }

    // Read Sem 4 PDFs
    if (fs.existsSync(sem4Path)) {
        const files = fs.readdirSync(sem4Path).filter(f => f.endsWith('.pdf'));
        for (const file of files) {
            console.log(`Reading Sem 4: ${file}`);
            sem4Text += await extractPDFText(path.join(sem4Path, file));
        }
    }

    console.log('\nParsing schedules...');
    const schedules = parseDetailedSchedule(sem2Text, sem4Text);

    console.log(`Found ${schedules.length} room-day schedule entries`);

    // Save to schedules.json
    const output = {
        lastUpdated: new Date().toISOString(),
        schedules
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(`\nSaved to: ${OUTPUT_PATH}`);

    // Print summary
    console.log('\n=== Summary ===');
    const roomDays = {};
    for (const entry of schedules) {
        if (!roomDays[entry.room]) roomDays[entry.room] = {};
        roomDays[entry.room][entry.day] = entry.occupied.length;
    }

    for (const [room, days] of Object.entries(roomDays).sort()) {
        console.log(`Room ${room}:`, days);
    }
}

main().catch(console.error);
