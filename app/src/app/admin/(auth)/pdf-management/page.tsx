'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, WeekPicker } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { Trash2, Upload, FileText, Calendar as CalendarIcon, Plus, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { PDFVersion } from '@/types';

interface WeekConfig {
    id: string;
    startDate: string;
    endDate: string;
    label: string;
    semester: number;
    pdfs: PDFVersion[];
}

export default function PDFManagementPage() {
    const [pdfs, setPdfs] = useState<PDFVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [activeWeekStartDate, setActiveWeekStartDate] = useState('');
    const [activeWeekEndDate, setActiveWeekEndDate] = useState('');
    const [activeWeekDisplay, setActiveWeekDisplay] = useState('');
    const [weekLoading, setWeekLoading] = useState(false);

    // Week picker state
    const [showWeekPicker, setShowWeekPicker] = useState(false);
    const [weekStartDate, setWeekStartDate] = useState<Date | undefined>(undefined);
    const [weekEndDate, setWeekEndDate] = useState<Date | undefined>(undefined);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadSemester, setUploadSemester] = useState<number>(1);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showUploadModal, setShowUploadModal] = useState(false);

    const fetchPdfs = useCallback(async () => {
        setLoading(true);
        try {
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
            if (data.weekStartDate) {
                setActiveWeekStartDate(data.weekStartDate);
                // Also update the picker state so it reflects current config
                try {
                    setWeekStartDate(new Date(data.weekStartDate));
                } catch { }
            }
            if (data.weekEndDate) {
                setActiveWeekEndDate(data.weekEndDate);
                try {
                    setWeekEndDate(new Date(data.weekEndDate));
                } catch { }
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    }, []);

    useEffect(() => {
        fetchPdfs();
        fetchConfig();
    }, [fetchPdfs, fetchConfig]);

    const updateWeek = async () => {
        if (!weekStartDate || !weekEndDate) {
            alert("Please select a valid date range");
            return;
        }

        setWeekLoading(true);
        try {
            // Format dates as YYYY-MM-DD for storage
            const startDateStr = format(weekStartDate, 'yyyy-MM-dd');
            const endDateStr = format(weekEndDate, 'yyyy-MM-dd');

            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    weekStartDate: startDateStr,
                    weekEndDate: endDateStr
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setActiveWeekDisplay(data.activeWeekDisplay);
                setActiveWeekStartDate(data.weekStartDate);
                setActiveWeekEndDate(data.weekEndDate);
            }
        } catch (error) {
            console.error('Failed to update week:', error);
        }
        setWeekLoading(false);
    };

    const setWeekFromCalendar = () => {
        if (weekStartDate && weekEndDate) {
            // No longer setting string directly, waiting for save
        }
        setShowWeekPicker(false);
    };

    const setQuickWeek = (days: number) => {
        const today = new Date();
        const monday = new Date(today);
        // Adjust to previous Monday if today is not Monday (assuming ISO/European week starts Monday)
        const day = monday.getDay() || 7;
        if (day !== 1) monday.setHours(-24 * (day - 1));

        monday.setDate(monday.getDate() + days); // Move to target week
        const friday = addDays(monday, 4);

        setWeekStartDate(monday);
        setWeekEndDate(friday);
    };

    const deletePdf = async (pdf: PDFVersion) => {
        if (!confirm(`Are you sure you want to delete "${pdf.name}"?`)) {
            return;
        }

        setDeleting(pdf.id);
        try {
            const response = await fetch(`/api/pdfs/delete?id=${encodeURIComponent(pdf.id)}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                await fetchPdfs();
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete PDF');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete PDF');
        }
        setDeleting(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
        } else if (file) {
            alert('Please select a PDF file');
        }
    };

    const uploadPdf = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('semester', uploadSemester.toString());

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setSelectedFile(null);
                setShowUploadModal(false);
                await fetchPdfs();
            } else {
                const data = await response.json();
                alert(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        }
        setUploading(false);
    };

    const sem1Pdfs = pdfs.filter(p => p.semester === 1);
    const sem2Pdfs = pdfs.filter(p => p.semester === 2);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="outline" size="sm" className="border-white/20 text-slate-300 hover:bg-white/10">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">PDF Management</h1>
                        <p className="text-slate-400">Manage timetable PDFs and weeks</p>
                    </div>
                </div>
                <Button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload New PDF
                </Button>
            </div>

            {/* Week Configuration with Calendar */}
            <Card className="bg-slate-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-indigo-400" />
                        Week Configuration
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Select the current week range using the calendar or quick actions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickWeek(0)}
                            className="border-white/20 text-slate-300 hover:bg-white/10"
                        >
                            This Week
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickWeek(7)}
                            className="border-white/20 text-slate-300 hover:bg-white/10"
                        >
                            Next Week
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickWeek(-7)}
                            className="border-white/20 text-slate-300 hover:bg-white/10"
                        >
                            Last Week
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowWeekPicker(!showWeekPicker)}
                            className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20"
                        >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Custom Date Range
                        </Button>
                    </div>

                    {/* Calendar Week Picker */}
                    {showWeekPicker && (
                        <div className="p-4 rounded-xl bg-slate-800/50 border border-white/10 space-y-4">
                            <WeekPicker
                                startDate={weekStartDate}
                                endDate={weekEndDate}
                                onStartChange={setWeekStartDate}
                                onEndChange={setWeekEndDate}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowWeekPicker(false)}
                                    className="border-white/20 text-slate-300 hover:bg-white/10"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={setWeekFromCalendar}
                                    disabled={!weekStartDate || !weekEndDate}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Apply Dates
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Current Week Display and Save */}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label className="text-white">Current Active Week</Label>
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium">
                                {activeWeekDisplay || 'Not Configured (Select dates above)'}
                            </div>
                        </div>
                        <Button
                            onClick={updateWeek}
                            disabled={weekLoading || !weekStartDate || !weekEndDate}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {weekLoading ? 'Saving...' : 'Save Week'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 border-0">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm">Total PDFs</p>
                                <p className="text-3xl font-bold text-white">{pdfs.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Semester 1 PDFs</p>
                                <p className="text-xl font-semibold text-white">{sem1Pdfs.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Semester 2 PDFs</p>
                                <p className="text-xl font-semibold text-white">{sem2Pdfs.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Semester 1 PDFs */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-white">Semester 1 Timetables</CardTitle>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                {sem1Pdfs.length} files
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {sem1Pdfs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No PDFs uploaded for Semester 1</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sem1Pdfs.map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{pdf.name}</p>
                                            <p className="text-sm text-slate-400">
                                                Uploaded: {new Date(pdf.uploaded_at).toLocaleDateString()} at{' '}
                                                {new Date(pdf.uploaded_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {pdf.is_active && (
                                            <Badge className="bg-green-500">Active</Badge>
                                        )}
                                        <a
                                            href={pdf.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                            </svg>
                                        </a>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deletePdf(pdf)}
                                            disabled={deleting === pdf.id}
                                            className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                        >
                                            {deleting === pdf.id ? (
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Semester 2 PDFs */}
            <Card className="bg-white/5 border-white/10">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-white">Semester 2 Timetables</CardTitle>
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                                {sem2Pdfs.length} files
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {sem2Pdfs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No PDFs uploaded for Semester 2</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sem2Pdfs.map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                                            <FileText className="h-6 w-6 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{pdf.name}</p>
                                            <p className="text-sm text-slate-400">
                                                Uploaded: {new Date(pdf.uploaded_at).toLocaleDateString()} at{' '}
                                                {new Date(pdf.uploaded_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {pdf.is_active && (
                                            <Badge className="bg-green-500">Active</Badge>
                                        )}
                                        <a
                                            href={pdf.file_path}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                            </svg>
                                        </a>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deletePdf(pdf)}
                                            disabled={deleting === pdf.id}
                                            className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                        >
                                            {deleting === pdf.id ? (
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4">
                        <Card className="bg-slate-900 border-white/10">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-white">Upload New PDF</CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowUploadModal(false);
                                            setSelectedFile(null);
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-white/10"
                                    >
                                        <X className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Semester Selection */}
                                <div className="space-y-2">
                                    <Label className="text-white">Select Semester</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={uploadSemester === 1 ? 'default' : 'outline'}
                                            onClick={() => setUploadSemester(1)}
                                            className={uploadSemester === 1
                                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                                : 'border-white/20 text-slate-300 hover:bg-white/10'
                                            }
                                        >
                                            Semester 1
                                        </Button>
                                        <Button
                                            variant={uploadSemester === 2 ? 'default' : 'outline'}
                                            onClick={() => setUploadSemester(2)}
                                            className={uploadSemester === 2
                                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                                : 'border-white/20 text-slate-300 hover:bg-white/10'
                                            }
                                        >
                                            Semester 2
                                        </Button>
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="space-y-2">
                                    <Label className="text-white">Select PDF File</Label>
                                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-indigo-500/50 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="pdf-upload"
                                        />
                                        <label
                                            htmlFor="pdf-upload"
                                            className="cursor-pointer block"
                                        >
                                            {selectedFile ? (
                                                <div className="flex items-center justify-center gap-3">
                                                    <FileText className="h-8 w-8 text-red-400" />
                                                    <div className="text-left">
                                                        <p className="text-white font-medium">{selectedFile.name}</p>
                                                        <p className="text-sm text-slate-400">
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                                    <p className="text-slate-300">Click to select PDF</p>
                                                    <p className="text-sm text-slate-500">or drag and drop</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Upload Button */}
                                <Button
                                    onClick={uploadPdf}
                                    disabled={!selectedFile || uploading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {uploading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload PDF
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
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
