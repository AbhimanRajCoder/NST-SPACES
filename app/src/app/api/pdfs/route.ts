import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PDFInfo {
    id: string;
    name: string;
    file_path: string;
    semester: number;
    is_active: boolean;
    uploaded_at: string;
}

export async function GET() {
    try {
        const supabase = await createClient();
        const pdfs: PDFInfo[] = [];

        // Check each semester folder
        for (const semester of [1, 2]) {
            const { data: files, error } = await supabase
                .storage
                .from('timetables')
                .list(`semester${semester}`, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' },
                });

            if (error) {
                console.error(`Error listing semester ${semester} files:`, error);
                continue;
            }

            if (!files) continue;

            const pdfFiles = files.filter(f => f.name.endsWith('.pdf'));

            for (const file of pdfFiles) {
                // Extract original filename (remove timestamp prefix)
                const parts = file.name.split('_');
                const timestamp = parts[0];
                const originalName = parts.slice(1).join('_');

                // Get public URL
                const { data: { publicUrl } } = supabase
                    .storage
                    .from('timetables')
                    .getPublicUrl(`semester${semester}/${file.name}`);

                pdfs.push({
                    id: `${semester}-${timestamp}`,
                    name: originalName || file.name,
                    file_path: publicUrl,
                    semester,
                    is_active: true, // Most recent file per semester is active
                    uploaded_at: file.created_at || new Date().toISOString(),
                });
            }
        }

        // Sort by upload time (descending) and mark only the latest per semester as active
        pdfs.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

        // Mark only the most recent PDF per semester as active
        const activeSemesters = new Set<number>();
        for (const pdf of pdfs) {
            if (activeSemesters.has(pdf.semester)) {
                pdf.is_active = false;
            } else {
                pdf.is_active = true;
                activeSemesters.add(pdf.semester);
            }
        }

        return NextResponse.json(pdfs);
    } catch (error) {
        console.error('Error reading PDFs:', error);
        return NextResponse.json([], { status: 200 });
    }
}
