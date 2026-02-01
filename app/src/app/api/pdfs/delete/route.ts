import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir } from 'fs/promises';
import path from 'path';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pdfId = searchParams.get('id');
        const filePath = searchParams.get('path');

        if (!pdfId && !filePath) {
            return NextResponse.json({ error: 'PDF ID or path is required' }, { status: 400 });
        }

        // If we have a direct file path, delete it
        if (filePath) {
            const absolutePath = path.join(process.cwd(), 'public', filePath);
            try {
                await unlink(absolutePath);
                return NextResponse.json({ success: true, message: 'PDF deleted successfully' });
            } catch (err) {
                console.error('Error deleting file:', err);
                return NextResponse.json({ error: 'File not found or could not be deleted' }, { status: 404 });
            }
        }

        // If we have an ID, we need to find the file first
        // ID format: semester-timestamp
        if (pdfId) {
            const [semesterStr, timestamp] = pdfId.split('-');
            const semester = parseInt(semesterStr, 10);

            if (isNaN(semester) || !timestamp) {
                return NextResponse.json({ error: 'Invalid PDF ID format' }, { status: 400 });
            }

            const semesterDir = path.join(process.cwd(), 'public', 'timetables', `semester${semester}`);

            try {
                const files = await readdir(semesterDir);
                // Find file that starts with the timestamp
                const targetFile = files.find(f => f.startsWith(`${timestamp}_`));

                if (!targetFile) {
                    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
                }

                const absolutePath = path.join(semesterDir, targetFile);
                await unlink(absolutePath);

                return NextResponse.json({ success: true, message: 'PDF deleted successfully' });
            } catch (err) {
                console.error('Error:', err);
                return NextResponse.json({ error: 'Could not delete PDF' }, { status: 500 });
            }
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}
