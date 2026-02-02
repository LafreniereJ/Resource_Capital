import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// In-memory store for overrides (in production, use a database table)
const dataOverrides: Array<{
    id: number;
    entity_type: 'company' | 'project' | 'news';
    entity_id: number;
    field_name: string;
    original_value: string | null;
    override_value: string;
    reason: string;
    created_by: string;
    created_at: string;
    is_active: boolean;
}> = [];

let nextOverrideId = 1;

export async function GET() {
    return NextResponse.json({
        overrides: dataOverrides.filter(o => o.is_active),
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { entity_type, entity_id, field_name, override_value, reason } = body;

        if (!entity_type || !entity_id || !field_name || !override_value) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get original value
        let originalValue: string | null = null;
        try {
            const tableName = entity_type === 'company' ? 'companies' :
                             entity_type === 'project' ? 'projects' : 'news';

            const { data } = await supabase
                .from(tableName)
                .select(field_name)
                .eq('id', parseInt(entity_id))
                .single();

            if (data) {
                originalValue = String(data[field_name as keyof typeof data] ?? null);
            }
        } catch {
            // Continue without original value
        }

        // Create override record
        const override = {
            id: nextOverrideId++,
            entity_type,
            entity_id: parseInt(entity_id),
            field_name,
            original_value: originalValue,
            override_value,
            reason: reason || 'Manual correction',
            created_by: 'admin', // Would come from auth in production
            created_at: new Date().toISOString(),
            is_active: true,
        };

        dataOverrides.push(override);

        // Apply the override to the database
        try {
            const tableName = entity_type === 'company' ? 'companies' :
                             entity_type === 'project' ? 'projects' : 'news';

            await supabase
                .from(tableName)
                .update({ [field_name]: override_value })
                .eq('id', parseInt(entity_id));
        } catch (err) {
            console.error('Failed to apply override to database:', err);
            // Override is still tracked even if DB update fails
        }

        return NextResponse.json({ success: true, override });
    } catch (error) {
        console.error('Error creating override:', error);
        return NextResponse.json(
            { error: 'Failed to create override' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = parseInt(searchParams.get('id') || '0');

        const overrideIndex = dataOverrides.findIndex(o => o.id === id);
        if (overrideIndex === -1) {
            return NextResponse.json(
                { error: 'Override not found' },
                { status: 404 }
            );
        }

        const override = dataOverrides[overrideIndex];

        // Restore original value if available
        if (override.original_value !== null) {
            try {
                const tableName = override.entity_type === 'company' ? 'companies' :
                                 override.entity_type === 'project' ? 'projects' : 'news';

                await supabase
                    .from(tableName)
                    .update({ [override.field_name]: override.original_value })
                    .eq('id', override.entity_id);
            } catch (err) {
                console.error('Failed to restore original value:', err);
            }
        }

        // Mark as inactive instead of deleting (audit trail)
        dataOverrides[overrideIndex].is_active = false;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting override:', error);
        return NextResponse.json(
            { error: 'Failed to delete override' },
            { status: 500 }
        );
    }
}
