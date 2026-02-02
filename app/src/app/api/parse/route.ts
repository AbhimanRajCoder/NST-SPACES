import { NextResponse } from 'next/server';
import { getSchedulesFromPdfs } from '@/lib/pdf-extractor';
import { saveParsedSchedules } from '@/lib/pdf-parser';

export async function POST() {
    try {
        // Get schedules from PDFs using the extractor
        const schedules = await getSchedulesFromPdfs();

        if (schedules.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No schedules found. Make sure PDFs are uploaded.'
            }, { status: 400 });
        }

        // Convert to ParsedScheduleEntry format and save
        const parsedEntries = schedules.map(s => ({
            room: s.room,
            day: s.day,
            occupied: s.occupied.map(slot => ({
                start: slot.start,
                end: slot.end
            }))
        }));

        await saveParsedSchedules(parsedEntries);

        return NextResponse.json({
            success: true,
            message: `Parsed ${schedules.length} schedule entries from PDFs`,
            count: schedules.length
        });

    } catch (error) {
        console.error('Parse error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to parse PDFs'
        }, { status: 500 });
    }
}
