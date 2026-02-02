'use client';

import { AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { calculateCompleteness, getCompletenessGrade, REQUIRED_FIELDS, getMissingFields } from '@/lib/data-quality';

// Re-export for backward compatibility if needed, though we updated the main usage
export { calculateCompleteness, getCompletenessGrade, REQUIRED_FIELDS, getMissingFields };

interface DataCompletenessProps {
    percentage: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Visual progress bar showing data completeness
 */
export function DataCompleteness({
    percentage,
    showLabel = true,
    size = 'md',
    className = ''
}: DataCompletenessProps) {
    const grade = getCompletenessGrade(percentage);

    const gradeColors = {
        A: { bg: 'bg-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
        B: { bg: 'bg-cyan-500', text: 'text-cyan-400', bar: 'bg-cyan-500' },
        C: { bg: 'bg-amber-500', text: 'text-amber-400', bar: 'bg-amber-500' },
        D: { bg: 'bg-orange-500', text: 'text-orange-400', bar: 'bg-orange-500' },
        F: { bg: 'bg-red-500', text: 'text-red-400', bar: 'bg-red-500' },
    };

    const colors = gradeColors[grade];

    const heights = {
        sm: 'h-1',
        md: 'h-1.5',
        lg: 'h-2',
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showLabel && (
                <span className={`text-xs font-bold ${colors.text}`}>
                    {percentage}%
                </span>
            )}
            <div className={`flex-1 ${heights[size]} bg-white/10 rounded-full overflow-hidden`}>
                <div
                    className={`${heights[size]} ${colors.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

interface DataQualityBadgeProps {
    percentage: number;
    className?: string;
}

/**
 * Small badge showing data quality grade
 */
export function DataQualityBadge({ percentage, className = '' }: DataQualityBadgeProps) {
    const grade = getCompletenessGrade(percentage);

    const gradeStyles = {
        A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        B: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        C: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        D: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        F: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const gradeLabels = {
        A: 'Excellent',
        B: 'Good',
        C: 'Fair',
        D: 'Limited',
        F: 'Incomplete',
    };

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border ${gradeStyles[grade]} ${className}`}
            title={`Data completeness: ${percentage}% (${gradeLabels[grade]})`}
        >
            {grade}
        </span>
    );
}

interface MissingDataAlertProps {
    missingFields: string[];
    entityType?: string;
    className?: string;
}

/**
 * Alert showing which data fields are missing
 */
export function MissingDataAlert({
    missingFields,
    entityType = 'record',
    className = ''
}: MissingDataAlertProps) {
    if (!missingFields.length) return null;

    const formatFieldName = (field: string) => {
        return field
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    return (
        <div className={`flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg ${className}`}>
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
                <p className="text-amber-400 font-medium mb-1">
                    This {entityType} is missing some data:
                </p>
                <p className="text-gray-400">
                    {missingFields.slice(0, 5).map(formatFieldName).join(', ')}
                    {missingFields.length > 5 && ` +${missingFields.length - 5} more`}
                </p>
            </div>
        </div>
    );
}

interface ConfidenceIndicatorProps {
    level: 'high' | 'medium' | 'low' | 'unverified';
    showLabel?: boolean;
    className?: string;
}

/**
 * Shows confidence level for a piece of data
 */
export function ConfidenceIndicator({
    level,
    showLabel = true,
    className = ''
}: ConfidenceIndicatorProps) {
    const config = {
        high: {
            icon: CheckCircle,
            label: 'Verified',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
        },
        medium: {
            icon: Info,
            label: 'Reported',
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/10',
        },
        low: {
            icon: HelpCircle,
            label: 'Estimated',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
        },
        unverified: {
            icon: AlertTriangle,
            label: 'Unverified',
            color: 'text-gray-500',
            bgColor: 'bg-gray-500/10',
        },
    };

    const { icon: Icon, label, color, bgColor } = config[level];

    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColor} ${color} ${className}`}
            title={`Confidence: ${label}`}
        >
            <Icon className="w-3 h-3" />
            {showLabel && <span className="text-[10px] font-medium">{label}</span>}
        </span>
    );
}

/**
 * Gets missing fields from a data object
 */
// getMissingFields is imported from @/lib/data-quality

export default DataCompleteness;
