import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

const configPath = path.join(process.cwd(), 'src', 'data', 'config.json');

// Format date for display (e.g., "19th Jan")
function formatDateForDisplay(dateStr: string): string {
    try {
        const date = parseISO(dateStr);
        const day = date.getDate();
        const suffix = getDaySuffix(day);
        return `${day}${suffix} ${format(date, 'MMM')}`;
    } catch {
        return dateStr;
    }
}

function getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Check if today is within the configured week
function isCurrentWeek(startDate: string, endDate: string): boolean {
    try {
        const today = new Date();
        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));
        return isWithinInterval(today, { start, end });
    } catch {
        return false;
    }
}

export async function GET() {
    try {
        const data = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(data);

        const weekStartDate = config.weekStartDate || '';
        const weekEndDate = config.weekEndDate || '';

        // Generate display string
        let activeWeekDisplay = 'Unknown Week';
        if (weekStartDate && weekEndDate) {
            const startDisplay = formatDateForDisplay(weekStartDate);
            const endDisplay = formatDateForDisplay(weekEndDate);
            activeWeekDisplay = `${startDisplay} - ${endDisplay}`;
        }

        return NextResponse.json({
            weekStartDate,
            weekEndDate,
            activeWeekDisplay,
            isCurrentWeek: isCurrentWeek(weekStartDate, weekEndDate)
        });
    } catch (error) {
        // Return default if file doesn't exist or error
        return NextResponse.json({
            weekStartDate: '',
            weekEndDate: '',
            activeWeekDisplay: 'Unknown Week',
            isCurrentWeek: false
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { weekStartDate, weekEndDate } = body;

        if (!weekStartDate || !weekEndDate) {
            return NextResponse.json({
                success: false,
                error: 'weekStartDate and weekEndDate are required'
            }, { status: 400 });
        }

        const config = { weekStartDate, weekEndDate };
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        // Generate display string for response
        const startDisplay = formatDateForDisplay(weekStartDate);
        const endDisplay = formatDateForDisplay(weekEndDate);
        const activeWeekDisplay = `${startDisplay} - ${endDisplay}`;

        return NextResponse.json({
            success: true,
            weekStartDate,
            weekEndDate,
            activeWeekDisplay,
            isCurrentWeek: isCurrentWeek(weekStartDate, weekEndDate)
        });
    } catch (error) {
        console.error('Error writing config:', error);
        return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
    }
}

