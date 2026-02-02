'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import PDFUploader from '@/components/admin/PDFUploader';
import ScheduleGrid from '@/components/admin/ScheduleGrid';
import type { PDFVersion } from '@/types';


const SEMESTERS = [1, 2] as const;

export default function AdminDashboard() {
    const [pdfs, setPdfs] = useState<PDFVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSemester, setActiveSemester] = useState<number>(1);
    const [activeWeekStartDate, setActiveWeekStartDate] = useState('');
    const [activeWeekEndDate, setActiveWeekEndDate] = useState('');
    const [activeWeekDisplay, setActiveWeekDisplay] = useState('');
    const [weekLoading, setWeekLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parseMessage, setParseMessage] = useState('');

    const fetchPdfs = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch from local API instead of Supabase
            const response = await fetch('/api/pdfs');
            const data = await response.json();
            if (Array.isArray(data)) {
                setPdfs(data);
            }
        } catch (error) {
            console.error('Error fetching PDFs:', error);
        }
        setLoading(false);
    }, []);

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (data.activeWeekDisplay) {
                setActiveWeekDisplay(data.activeWeekDisplay);
            }
            if (data.weekStartDate) setActiveWeekStartDate(data.weekStartDate);
            if (data.weekEndDate) setActiveWeekEndDate(data.weekEndDate);
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    }, []);

    // We no longer update week from this simple input, redirect to management page instead
    // But keeping the display for info

    const parsePdfs = async () => {
        setParsing(true);
        setParseMessage('');
        try {
            const res = await fetch('/api/parse', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setParseMessage(`✓ ${data.message}`);
                // Trigger ScheduleGrid refresh by forcing re-render
                window.location.reload();
            } else {
                setParseMessage(`✗ ${data.error || 'Failed to parse PDFs'}`);
            }
        } catch (error) {
            setParseMessage('✗ Failed to parse PDFs');
        }
        setParsing(false);
    };

    useEffect(() => {
        fetchPdfs();
        fetchConfig();
    }, [fetchPdfs, fetchConfig]);

    const activePdfs = pdfs.filter(p => p.is_active);
    const sem1Pdf = activePdfs.find(p => p.semester === 1);
    const sem2Pdf = activePdfs.find(p => p.semester === 2);

    const systemReady = sem1Pdf && sem2Pdf;

    return (
        <div className="space-y-8">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
                    <p className="text-slate-400">Manage timetable PDFs for room availability</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/pdf-management">
                        <Button variant="outline" size="sm" className="border-white/20 text-slate-300 hover:bg-white/10">
                            <FileText className="h-4 w-4 mr-2" />
                            Manage PDFs & Week
                        </Button>
                    </Link>
                    <Badge
                        variant={systemReady ? 'default' : 'secondary'}
                        className={systemReady ? 'bg-green-500' : 'bg-amber-500'}
                    >
                        {systemReady ? '✓ System Active' : '⚠ Upload Required'}
                    </Badge>
                </div>
            </div>

            {/* Week Configuration - READ ONLY HERE */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Active Schedule</CardTitle>
                    <CardDescription className="text-slate-400">Current configured week for the schedule</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center max-w-md">
                        <div className="flex-1 space-y-2">
                            <Label className="text-white">Active Week Display</Label>
                            <div className="p-2 rounded bg-white/5 border border-white/10 text-white font-medium">
                                {activeWeekDisplay || 'Not Configured'}
                            </div>
                        </div>
                        <Link href="/admin/pdf-management">
                            <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">
                                Configure Week
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm">Active PDFs</p>
                                <p className="text-3xl font-bold text-white">{activePdfs.length} / 2</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Semester 1</p>
                                <p className="text-xl font-semibold text-white">
                                    {sem1Pdf ? '✓ Uploaded' : 'Not uploaded'}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sem1Pdf ? 'bg-green-500/20' : 'bg-slate-500/20'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${sem1Pdf ? 'text-green-400' : 'text-slate-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Semester 2</p>
                                <p className="text-xl font-semibold text-white">
                                    {sem2Pdf ? '✓ Uploaded' : 'Not uploaded'}
                                </p>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sem2Pdf ? 'bg-green-500/20' : 'bg-slate-500/20'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${sem2Pdf ? 'text-green-400' : 'text-slate-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Semester Tabs */}
            <div className="flex gap-2">
                {SEMESTERS.map((sem) => (
                    <Button
                        key={sem}
                        variant={activeSemester === sem ? 'default' : 'outline'}
                        onClick={() => setActiveSemester(sem)}
                        className={activeSemester === sem
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'border-white/20 text-slate-300 hover:bg-white/10'
                        }
                    >
                        Semester {sem}
                        {(sem === 1 ? sem1Pdf : sem2Pdf) && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-green-400" />
                        )}
                    </Button>
                ))}
            </div>

            {/* PDF Uploader for selected semester */}
            <PDFUploader
                semester={activeSemester}
                title={`Semester ${activeSemester} Timetable`}
                description="Upload the complete timetable PDF (includes class & lab schedules)"
                currentPdf={activeSemester === 1 ? (sem1Pdf ? {
                    id: sem1Pdf.id,
                    name: sem1Pdf.name,
                    uploaded_at: sem1Pdf.uploaded_at
                } : null) : (sem2Pdf ? {
                    id: sem2Pdf.id,
                    name: sem2Pdf.name,
                    uploaded_at: sem2Pdf.uploaded_at
                } : null)}
                onUploadComplete={fetchPdfs}
            />

            {/* Parse PDFs Button */}
            <div className="flex flex-col items-center gap-3 py-6">
                <Button
                    onClick={parsePdfs}
                    disabled={parsing || !activePdfs.length}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-lg"
                    size="lg"
                >
                    {parsing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Parsing PDFs...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Parse PDFs & Update Schedule
                        </>
                    )}
                </Button>
                {parseMessage && (
                    <p className={`text-sm ${parseMessage.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                        {parseMessage}
                    </p>
                )}
                {!activePdfs.length && (
                    <p className="text-sm text-slate-500">Upload PDFs first to enable parsing</p>
                )}
            </div>

            {/* Parsed Schedule Grid */}
            <div className="mt-8">
                <h2 className="text-xl font-bold text-white mb-4">Parsed Schedule Data</h2>
                <ScheduleGrid />
            </div>

            {/* Recent Uploads */}
            {pdfs.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Upload History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {pdfs.slice(0, 5).map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-white">{pdf.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(pdf.uploaded_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="border-white/20 text-slate-300">
                                            Sem {pdf.semester}
                                        </Badge>
                                        {pdf.is_active && (
                                            <Badge className="bg-green-500">Active</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8">
                    <svg className="animate-spin h-8 w-8 mx-auto text-indigo-400" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            )}
        </div>
    );
}
