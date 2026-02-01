/**
 * Schedule Data Module
 * 
 * This module provides schedule data management functions.
 * Schedule data is now stored as JSON in /data/schedules.json 
 * and can be imported/updated via the admin panel.
 * 
 * The hardcoded demo data has been removed.
 * To add schedule data, upload PDFs and import the schedule data via the API.
 */

// Re-export types and functions from pdf-parser for backward compatibility
export {
    type ParsedSlot as ScheduleSlot,
    type ParsedScheduleEntry as ScheduleEntry,
    getAllParsedSchedules,
    loadCachedSchedules,
    toRoomSchedule,
    hasScheduleData,
    importScheduleData,
    clearScheduleData
} from './pdf-parser';

// Static helper functions
export function getAllRooms(): string[] {
    return ['401', '402', '403', '404', '405', '501', '502', '503', '504', '505'];
}

export function getAllDays(): string[] {
    return ['Mon', 'Tue', 'Wed', 'Thur'];
}

export function getAllBatches(): string[] {
    // Standard batches at ADYPU
    return ['Hopper', 'Turing', 'Neumann', 'Ramanujan', 'CP', 'TIP'];
}
