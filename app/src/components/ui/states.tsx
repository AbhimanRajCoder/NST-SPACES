'use client';

import { cn } from '@/lib/utils';
import {
    Building2,
    Calendar,
    FileText,
    Inbox,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    Search,
    CalendarX
} from 'lucide-react';
import { Button } from './button';

// ============================================================================
// SEMANTIC COLORS - Color system for consistent UI states
// ============================================================================

export const semanticColors = {
    // Success states
    success: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        icon: 'text-emerald-500',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        solid: 'bg-emerald-500',
        hover: 'hover:bg-emerald-500/20',
    },
    // Warning states
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: 'text-amber-500',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        solid: 'bg-amber-500',
        hover: 'hover:bg-amber-500/20',
    },
    // Error states
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'text-red-500',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40',
        solid: 'bg-red-500',
        hover: 'hover:bg-red-500/20',
    },
    // Info states
    info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'text-blue-500',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        solid: 'bg-blue-500',
        hover: 'hover:bg-blue-500/20',
    },
    // Neutral/muted states
    muted: {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        icon: 'text-slate-500',
        badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        solid: 'bg-slate-500',
        hover: 'hover:bg-slate-500/20',
    },
    // Primary/accent states
    primary: {
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/30',
        text: 'text-indigo-400',
        icon: 'text-indigo-500',
        badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        solid: 'bg-indigo-500',
        hover: 'hover:bg-indigo-500/20',
    },
};

// ============================================================================
// LOADING STATES
// ============================================================================

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    return (
        <Loader2 className={cn('animate-spin text-indigo-400', sizeClasses[size], className)} />
    );
}

interface LoadingStateProps {
    message?: string;
    variant?: 'minimal' | 'card' | 'fullscreen';
    className?: string;
}

export function LoadingState({
    message = 'Loading...',
    variant = 'card',
    className
}: LoadingStateProps) {
    if (variant === 'minimal') {
        return (
            <div className={cn('flex items-center justify-center gap-3 py-8', className)}>
                <LoadingSpinner size="md" />
                <span className="text-slate-400">{message}</span>
            </div>
        );
    }

    if (variant === 'fullscreen') {
        return (
            <div className={cn('fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50', className)}>
                <div className="text-center">
                    <LoadingSpinner size="lg" className="mx-auto mb-4" />
                    <p className="text-slate-300">{message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
            <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <LoadingSpinner size="lg" />
                </div>
            </div>
            <p className="text-slate-400">{message}</p>
        </div>
    );
}

// ============================================================================
// EMPTY STATES
// ============================================================================

type EmptyStateIconType = 'rooms' | 'calendar' | 'file' | 'inbox' | 'search' | 'calendar-x';

interface EmptyStateProps {
    icon?: EmptyStateIconType;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({
    icon = 'inbox',
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    const icons: Record<EmptyStateIconType, React.ReactNode> = {
        rooms: <Building2 className="h-10 w-10" />,
        calendar: <Calendar className="h-10 w-10" />,
        file: <FileText className="h-10 w-10" />,
        inbox: <Inbox className="h-10 w-10" />,
        search: <Search className="h-10 w-10" />,
        'calendar-x': <CalendarX className="h-10 w-10" />,
    };

    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 flex items-center justify-center mb-5 shadow-lg">
                <div className="text-slate-400">
                    {icons[icon]}
                </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
            {description && (
                <p className="text-slate-400 text-sm max-w-sm mb-4">{description}</p>
            )}
            {action && (
                <Button
                    onClick={action.onClick}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
}

// No data for specific period
interface NoDataForPeriodProps {
    period: string;
    suggestion?: string;
    onRetry?: () => void;
    className?: string;
}

export function NoDataForPeriod({
    period,
    suggestion,
    onRetry,
    className
}: NoDataForPeriodProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
                <CalendarX className="h-10 w-10 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">No data for {period}</h3>
            <p className="text-slate-400 text-sm max-w-sm mb-4">
                {suggestion || 'Data for this period is not available yet. Try selecting a different time.'}
            </p>
            {onRetry && (
                <Button
                    onClick={onRetry}
                    variant="outline"
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                >
                    Try Different Time
                </Button>
            )}
        </div>
    );
}

// ============================================================================
// STATUS INDICATORS
// ============================================================================

interface StatusBadgeProps {
    status: 'success' | 'warning' | 'error' | 'info' | 'muted';
    children: React.ReactNode;
    showDot?: boolean;
    className?: string;
}

export function StatusBadge({ status, children, showDot = true, className }: StatusBadgeProps) {
    const colors = semanticColors[status];

    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
            colors.badge,
            className
        )}>
            {showDot && (
                <span className={cn('w-1.5 h-1.5 rounded-full', colors.solid)} />
            )}
            {children}
        </span>
    );
}

interface WeekIndicatorProps {
    week: string;
    isCurrent?: boolean;
    isFallback?: boolean;
    className?: string;
}

export function WeekIndicator({ week, isCurrent = true, isFallback = false, className }: WeekIndicatorProps) {
    return (
        <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-full border',
            isFallback
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-slate-800/50 border-white/10',
            className
        )}>
            <Calendar className={cn('h-4 w-4', isFallback ? 'text-amber-400' : 'text-indigo-400')} />
            <span className="text-sm">
                {isFallback && (
                    <span className="text-amber-400 mr-1">Showing:</span>
                )}
                <span className={isFallback ? 'text-amber-200' : 'text-white'} >{week}</span>
            </span>
            {isCurrent && !isFallback && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
        </div>
    );
}

// ============================================================================
// ALERT BANNERS
// ============================================================================

interface AlertBannerProps {
    type: 'success' | 'warning' | 'error' | 'info';
    title?: string;
    message: string;
    onDismiss?: () => void;
    className?: string;
}

export function AlertBanner({ type, title, message, onDismiss, className }: AlertBannerProps) {
    const colors = semanticColors[type];
    const icons = {
        success: <CheckCircle2 className="h-5 w-5" />,
        warning: <AlertCircle className="h-5 w-5" />,
        error: <AlertCircle className="h-5 w-5" />,
        info: <Clock className="h-5 w-5" />,
    };

    return (
        <div className={cn(
            'flex items-start gap-3 p-4 rounded-xl border',
            colors.bg,
            colors.border,
            className
        )}>
            <div className={colors.icon}>
                {icons[type]}
            </div>
            <div className="flex-1">
                {title && <p className={cn('font-medium', colors.text)}>{title}</p>}
                <p className="text-slate-300 text-sm">{message}</p>
            </div>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    ×
                </button>
            )}
        </div>
    );
}

// ============================================================================
// DATA AVAILABILITY INDICATOR
// ============================================================================

interface DataAvailabilityProps {
    hasData: boolean;
    currentWeek: string;
    fallbackWeek?: string;
    onWeekChange?: (week: string) => void;
    className?: string;
}

export function DataAvailability({
    hasData,
    currentWeek,
    fallbackWeek,
    className
}: DataAvailabilityProps) {
    if (hasData) {
        return (
            <WeekIndicator
                week={currentWeek}
                isCurrent={true}
                className={className}
            />
        );
    }

    if (fallbackWeek) {
        return (
            <div className={cn('space-y-2', className)}>
                <AlertBanner
                    type="warning"
                    message={`Data for the current week is not available. Showing data for ${fallbackWeek}.`}
                />
                <WeekIndicator
                    week={fallbackWeek}
                    isCurrent={false}
                    isFallback={true}
                />
            </div>
        );
    }

    return (
        <AlertBanner
            type="warning"
            title="No Schedule Data"
            message="No timetable data is currently available. Please check back later or contact the admin."
            className={className}
        />
    );
}

// ============================================================================
// SKELETON LOADERS
// ============================================================================

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('animate-pulse bg-slate-700/50 rounded', className)} />
    );
}

export function RoomCardSkeleton() {
    return (
        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-700" />
                    <div>
                        <div className="h-3 w-10 bg-slate-700 rounded mb-1" />
                        <div className="h-4 w-14 bg-slate-700 rounded" />
                    </div>
                </div>
                <div className="h-5 w-12 bg-slate-700 rounded-full" />
            </div>
            <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 h-16 bg-slate-700/50 rounded-lg" />
                <div className="flex-1 h-16 bg-slate-700/50 rounded-lg" />
            </div>
        </div>
    );
}

export function RoomCardSkeletonGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <RoomCardSkeleton key={i} />
            ))}
        </div>
    );
}
