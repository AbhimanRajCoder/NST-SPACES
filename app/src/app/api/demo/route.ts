import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAllParsedSchedules, hasScheduleData, hasPDFData, getCacheLastUpdated, type ParsedScheduleEntry } from '@/lib/pdf-parser';

export async function GET() {
    try {
        // Get PDF file info
        const supabase = await createClient();
        const pdfFiles: { semester: number; files: string[] }[] = [];

        for (const semester of [1, 2]) {
            const { data: files } = await supabase
                .storage
                .from('timetables')
                .list(`semester${semester}`, { limit: 100 });

            if (files) {
                const pdfs = files.filter(f => f.name.endsWith('.pdf')).map(f => f.name);
                pdfFiles.push({ semester, files: pdfs });
            } else {
                pdfFiles.push({ semester, files: [] });
            }
        }

        // Check for data availability
        const hasData = await hasScheduleData();
        const hasPDFs = await hasPDFData();
        const lastUpdated = await getCacheLastUpdated();

        // Get schedules from cache
        const schedules: ParsedScheduleEntry[] = await getAllParsedSchedules();

        // Group schedules by room
        const byRoom: { [room: string]: { [day: string]: ParsedScheduleEntry['occupied'] } } = {};
        for (const schedule of schedules) {
            if (!byRoom[schedule.room]) {
                byRoom[schedule.room] = {};
            }
            byRoom[schedule.room][schedule.day] = schedule.occupied;
        }

        // Group schedules by day
        const byDay: { [day: string]: { room: string; occupied: ParsedScheduleEntry['occupied'] }[] } = {};
        for (const schedule of schedules) {
            if (!byDay[schedule.day]) {
                byDay[schedule.day] = [];
            }
            byDay[schedule.day].push({
                room: schedule.room,
                occupied: schedule.occupied
            });
        }

        // Get unique values
        const uniqueRooms = [...new Set(schedules.map(s => s.room))].sort();
        const uniqueDays = ['Mon', 'Tue', 'Wed', 'Thur'];
        const uniqueBatches = [...new Set(
            schedules.flatMap(s => s.occupied.map(o => o.batch).filter(Boolean))
        )].sort() as string[];

        // Determine status message
        let statusMessage: string;
        if (hasData) {
            statusMessage = `Schedule data loaded with ${schedules.length} entries. Last updated: ${lastUpdated || 'unknown'}`;
        } else if (hasPDFs) {
            statusMessage = 'PDFs uploaded but schedule data not imported. Please import schedule data via POST /api/schedules.';
        } else {
            statusMessage = 'No PDFs uploaded and no schedule data available. Please upload PDFs first.';
        }

        const response = {
            status: 'success',
            timestamp: new Date().toISOString(),
            hasData,
            hasPDFs,
            lastUpdated,
            statusMessage,
            pdfInfo: {
                hasPdfFiles: pdfFiles.some(p => p.files.length > 0),
                uploadedFiles: pdfFiles
            },
            summary: {
                totalSchedules: schedules.length,
                uniqueRooms: uniqueRooms.length,
                uniqueDays: uniqueDays.length,
                uniqueBatches: uniqueBatches.length,
                rooms: uniqueRooms,
                days: uniqueDays,
                batches: uniqueBatches
            },
            data: {
                raw: schedules,
                byRoom,
                byDay
            }
        };

        return NextResponse.json(response, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error) {
        console.error('Schedule data route error:', error);
        return NextResponse.json({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 500 });
    }
}
