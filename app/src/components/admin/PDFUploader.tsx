'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PDFUploaderProps {
    semester: number;
    title: string;
    description: string;
    currentPdf?: {
        id: string;
        name: string;
        uploaded_at: string;
    } | null;
    onUploadComplete: () => void;
}

export default function PDFUploader({
    semester,
    title,
    description,
    currentPdf,
    onUploadComplete
}: PDFUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState('');

    const handleUpload = useCallback(async (file: File) => {
        if (!file.name.endsWith('.pdf')) {
            setError('Only PDF files are allowed');
            return;
        }

        setUploading(true);
        setError('');

        try {
            // Create form data for upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('semester', semester.toString());

            // Upload via API route (saves to public/timetables folder)
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Clear the rooms cache so new PDF data is used
            await fetch('/api/rooms', { method: 'POST' });

            onUploadComplete();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Upload failed';
            setError(errorMessage);
        } finally {
            setUploading(false);
        }
    }, [semester, onUploadComplete]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    return (
        <Card className={`bg-white/5 border-white/10 transition-all ${dragOver ? 'border-indigo-500 bg-indigo-500/10' : ''}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            {title}
                            <Badge variant="default" className="text-xs bg-indigo-600">
                                Sem {semester}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-slate-400">{description}</CardDescription>
                    </div>
                    {currentPdf && (
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                            Active
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {currentPdf && (
                    <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{currentPdf.name}</p>
                                <p className="text-xs text-slate-400">
                                    Uploaded {new Date(currentPdf.uploaded_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-200 text-sm border border-red-500/30">
                        {error}
                    </div>
                )}

                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`
            relative border-2 border-dashed rounded-xl p-8 text-center
            transition-all cursor-pointer
            ${dragOver
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                        }
          `}
                >
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={uploading}
                    />

                    {uploading ? (
                        <div className="flex flex-col items-center gap-3">
                            <svg className="animate-spin h-8 w-8 text-indigo-400" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <p className="text-sm text-slate-300">Uploading...</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <p className="text-sm text-slate-300 mb-1">
                                Drag & drop a PDF or click to browse
                            </p>
                            <p className="text-xs text-slate-500">
                                {currentPdf ? 'Upload a new file to replace the current one' : 'PDF files only (class + lab timetable)'}
                            </p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
