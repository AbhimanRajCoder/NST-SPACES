-- RoomFinder Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PDF versions table (semester-based)
CREATE TABLE IF NOT EXISTS pdf_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  is_active BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick active PDF lookup
CREATE INDEX IF NOT EXISTS idx_pdf_active ON pdf_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pdf_semester ON pdf_versions(semester);

-- Optional: Room schedules table for caching parsed data (Phase 2)
CREATE TABLE IF NOT EXISTS room_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room TEXT NOT NULL,
  day TEXT NOT NULL,
  occupied JSONB NOT NULL DEFAULT '[]',
  pdf_version_id UUID REFERENCES pdf_versions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for room queries
CREATE INDEX IF NOT EXISTS idx_room_day ON room_schedules(room, day);

-- Create storage bucket (run in Supabase Dashboard > Storage)
-- Bucket name: timetables
-- Public: false
-- File size limit: 10MB
-- Allowed MIME types: application/pdf

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE pdf_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read pdf_versions
CREATE POLICY "Allow authenticated read pdf_versions" ON pdf_versions
  FOR SELECT TO authenticated USING (true);

-- Policy: Allow authenticated users to insert pdf_versions
CREATE POLICY "Allow authenticated insert pdf_versions" ON pdf_versions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Allow authenticated users to update pdf_versions
CREATE POLICY "Allow authenticated update pdf_versions" ON pdf_versions
  FOR UPDATE TO authenticated USING (true);

-- Policy: Allow anonymous users to read active pdf_versions (for student frontend)
CREATE POLICY "Allow anon read active pdf_versions" ON pdf_versions
  FOR SELECT TO anon USING (is_active = true);

-- Policy: Allow anyone to read room_schedules
CREATE POLICY "Allow all read room_schedules" ON room_schedules
  FOR SELECT USING (true);

-- Storage policies (run in Supabase Dashboard > Storage > Policies)
-- Or use SQL:

-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'timetables');

-- CREATE POLICY "Allow authenticated downloads" ON storage.objects
--   FOR SELECT TO authenticated USING (bucket_id = 'timetables');

-- =====================================================
-- MIGRATION: If you already have the old schema with 'type' column,
-- run this migration instead:
-- =====================================================
-- ALTER TABLE pdf_versions DROP COLUMN IF EXISTS type;
-- ALTER TABLE pdf_versions ADD COLUMN semester INTEGER NOT NULL DEFAULT 1;
-- ALTER TABLE pdf_versions ADD CONSTRAINT semester_check CHECK (semester IN (1, 2));
-- CREATE INDEX IF NOT EXISTS idx_pdf_semester ON pdf_versions(semester);
