import { NextResponse } from 'next/server';
import { getAllParsedSchedules, type ParsedScheduleEntry } from '@/lib/pdf-parser';

export async function GET() {
    try {
        const schedules: ParsedScheduleEntry[] = await getAllParsedSchedules();

        // Return ONLY raw data
        return NextResponse.json(schedules, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error) {
        console.error('Schedule data route error:', error);
        return NextResponse.json(
            error instanceof Error ? error.message : 'Unknown error',
            { status: 500 }
        );
    }
}
