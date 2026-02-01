import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { importScheduleData, parseScheduleJSON, type ParsedScheduleEntry } from '@/lib/pdf-parser';

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        // Handle JSON import (schedule data)
        if (contentType.includes('application/json')) {
            const body = await request.json();

            if (body.type === 'schedule-import') {
                // Import schedule data from JSON
                const schedules = parseScheduleJSON(body.schedules);
                const result = await importScheduleData(schedules, body.merge || false);

                return NextResponse.json({
                    success: true,
                    message: `Imported ${result.count} schedule entries`,
                    count: result.count
                });
            }

            return NextResponse.json({ error: 'Invalid JSON import type' }, { status: 400 });
        }

        // Handle PDF file upload
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const semester = formData.get('semester') as string;
        const scheduleDataJson = formData.get('scheduleData') as string | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.endsWith('.pdf')) {
            return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
        }

        if (!semester) {
            return NextResponse.json({ error: 'Semester is required' }, { status: 400 });
        }

        // Create directory path
        const uploadDir = path.join(process.cwd(), 'public', 'timetables', `semester${semester}`);

        // Ensure directory exists
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = path.join(uploadDir, fileName);

        // Convert file to buffer and write
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // File path relative to public folder
        const relativePath = `/timetables/semester${semester}/${fileName}`;

        // If schedule data was provided with the upload, import it
        let scheduleImportResult = null;
        if (scheduleDataJson) {
            try {
                const scheduleData = JSON.parse(scheduleDataJson);
                const schedules: ParsedScheduleEntry[] = scheduleData.map((item: { room?: string; day?: string; slots?: Array<{ start?: string; end?: string; batch?: string; subject?: string }> }) => ({
                    room: String(item.room || ''),
                    day: String(item.day || ''),
                    occupied: (item.slots || []).map((slot: { start?: string; end?: string; batch?: string; subject?: string }) => ({
                        start: String(slot.start || ''),
                        end: String(slot.end || ''),
                        batch: slot.batch,
                        subject: slot.subject,
                        semester: parseInt(semester)
                    }))
                }));

                scheduleImportResult = await importScheduleData(schedules, true);
            } catch (parseError) {
                console.warn('Schedule data parsing failed:', parseError);
            }
        }

        return NextResponse.json({
            success: true,
            filePath: relativePath,
            message: scheduleImportResult
                ? `PDF uploaded and ${scheduleImportResult.count} schedule entries imported`
                : 'PDF uploaded. Schedule data should be imported separately.',
            schedulesImported: scheduleImportResult?.count || 0
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Upload failed' },
            { status: 500 }
        );
    }
}

// Re-parse/refresh schedule cache
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();

        if (body.action === 'import') {
            // Import new schedule data
            const schedules = parseScheduleJSON(body.schedules);
            const result = await importScheduleData(schedules, body.merge !== false);

            return NextResponse.json({
                success: true,
                count: result.count,
                message: `Imported ${result.count} schedule entries`
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action'
        }, { status: 400 });
    } catch (error) {
        console.error('Schedule import error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Import failed' },
            { status: 500 }
        );
    }
}
