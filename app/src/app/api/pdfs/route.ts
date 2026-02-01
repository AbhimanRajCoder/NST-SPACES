import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import path from 'path';

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
        const timetablesDir = path.join(process.cwd(), 'public', 'timetables');
        const pdfs: PDFInfo[] = [];

        // Check each semester folder
        for (const semester of [1, 2]) {
            const semesterDir = path.join(timetablesDir, `semester${semester}`);

            try {
                const files = await readdir(semesterDir);
                const pdfFiles = files.filter(f => f.endsWith('.pdf'));

                for (const file of pdfFiles) {
                    const filePath = path.join(semesterDir, file);
                    const fileStat = await stat(filePath);

                    // Extract original filename (remove timestamp prefix)
                    const parts = file.split('_');
                    const timestamp = parts[0];
                    const originalName = parts.slice(1).join('_');

                    pdfs.push({
                        id: `${semester}-${timestamp}`,
                        name: originalName || file,
                        file_path: `/timetables/semester${semester}/${file}`,
                        semester,
                        is_active: true, // Most recent file per semester is active
                        uploaded_at: fileStat.mtime.toISOString(),
                    });
                }
            } catch {
                // Directory doesn't exist, skip
                continue;
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
