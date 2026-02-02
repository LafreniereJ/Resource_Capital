
/**
 * Calculates data completeness as a percentage
 */
export function calculateCompleteness(data: Record<string, any>, requiredFields: string[]): number {
    if (!requiredFields.length) return 100;

    const filledFields = requiredFields.filter(field => {
        const value = data[field];
        return value !== null && value !== undefined && value !== '' && value !== 0;
    });

    return Math.round((filledFields.length / requiredFields.length) * 100);
}

/**
 * Returns a grade (A-F) based on completeness percentage
 */
export function getCompletenessGrade(percentage: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (percentage >= 90) return 'A';
    if (percentage >= 75) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
}

/**
 * Required fields for different entity types
 */
export const REQUIRED_FIELDS = {
    company: [
        'name',
        'ticker',
        'exchange',
        'commodity',
        'current_price',
        'market_cap',
        'description',
        'website',
    ],
    project: [
        'name',
        'location',
        'stage',
        'commodity',
        'latitude',
        'longitude',
    ],
    projectEconomics: [
        'npv_million',
        'irr_percent',
        'payback_years',
        'aisc_per_oz',
        'initial_capex_million',
        'mine_life_years',
    ],
    reserves: [
        'category',
        'tonnage_mt',
        'grade_value',
        'contained_metal',
        'report_date',
    ],
};

/**
 * Gets missing fields from a data object
 */
export function getMissingFields(data: Record<string, any>, requiredFields: string[]): string[] {
    return requiredFields.filter(field => {
        const value = data[field];
        return value === null || value === undefined || value === '' || value === 0;
    });
}
