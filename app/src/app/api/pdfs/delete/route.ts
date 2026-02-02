import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pdfId = searchParams.get('id');
        // The path param from client is now a full URL or storage path. 
        // Our updated GET route returns `file_path` as the public URL.
        // But for deletion we need the storage path (semesterX/filename).

        let targetPath: string | null = null;

        const supabase = await createClient();

        if (pdfId) {
            // ID format: semester-timestamp
            // We need to find the filename. 
            // In the new system, we can't easily find by just ID unless we list again or store metadata.
            // But let's see if we can derive it.
            // If we list the bucket, we can find the file.

            const [semesterStr, timestamp] = pdfId.split('-');
            const semester = parseInt(semesterStr, 10);

            if (isNaN(semester) || !timestamp) {
                return NextResponse.json({ error: 'Invalid PDF ID format' }, { status: 400 });
            }

            const { data: files, error } = await supabase
                .storage
                .from('timetables')
                .list(`semester${semester}`);

            if (error) {
                return NextResponse.json({ error: `Could not list PDFs: ${error.message}` }, { status: 500 });
            }

            const targetFile = files?.find(f => f.name.startsWith(`${timestamp}_`));

            if (targetFile) {
                targetPath = `semester${semester}/${targetFile.name}`;
            }
        }

        // If we have a path parameter, it might be the public URL or partial path.
        // The client likely sends what it got from GET.
        // GET returns public URL. 
        // We shouldn't rely on parsing public URL strictly if ID is better.
        // But let's support path if it looks like `semesterX/file`.
        const paramPath = searchParams.get('path');
        if (!targetPath && paramPath) {
            // If it contains /timetables/semesterX/... extract it
            // Current GET returns public URL which is long.
            // Previous GET returned `/timetables/semesterX/file` (relative).

            // Let's assume the client passes the ID for deletion usually. 
            // If path is passed, we try to extract `semesterX/filename`.
            if (paramPath.includes('semester')) {
                const match = paramPath.match(/semester\d+\/.+\.pdf/);
                if (match) {
                    targetPath = match[0];
                }
            }
        }

        if (!targetPath) {
            return NextResponse.json({ error: 'PDF not found or invalid identifier' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .storage
            .from('timetables')
            .remove([targetPath]);

        if (deleteError) {
            return NextResponse.json({ error: `Could not delete PDF: ${deleteError.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'PDF deleted successfully' });

    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Delete failed' },
            { status: 500 }
        );
    }
}
