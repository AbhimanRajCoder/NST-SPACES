import { NextRequest, NextResponse } from 'next/server';
import {
    importScheduleData,
    parseScheduleJSON,
    clearScheduleData,
    getAllParsedSchedules,
    getCacheLastUpdated,
    type ParsedScheduleEntry
} from '@/lib/pdf-parser';

// Get current schedule data
export async function GET() {
    try {
        const schedules = await getAllParsedSchedules();
        const lastUpdated = await getCacheLastUpdated();

        return NextResponse.json({
            success: true,
            lastUpdated,
            count: schedules.length,
            schedules
        });
    } catch (error) {
        console.error('Get schedule data error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get schedule data' },
            { status: 500 }
        );
    }
}

// Import new schedule data
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { schedules, merge = true } = body;

        if (!schedules || !Array.isArray(schedules)) {
            return NextResponse.json(
                { success: false, error: 'Invalid schedule data format' },
                { status: 400 }
            );
        }

        const parsedSchedules = parseScheduleJSON(schedules);
        const result = await importScheduleData(parsedSchedules, merge);

        return NextResponse.json({
            success: true,
            message: `Imported ${result.count} schedule entries`,
            count: result.count
        });
    } catch (error) {
        console.error('Import schedule data error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 }
        );
    }
}

// Clear all schedule data
export async function DELETE() {
    try {
        await clearScheduleData();

        return NextResponse.json({
            success: true,
            message: 'Schedule data cleared'
        });
    } catch (error) {
        console.error('Clear schedule data error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to clear schedule data' },
            { status: 500 }
        );
    }
}
