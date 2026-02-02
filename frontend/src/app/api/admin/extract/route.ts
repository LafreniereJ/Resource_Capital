
import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
        }

        const scriptPath = path.join(process.cwd(), '../data-pipeline/process_item.py');

        // Spawn python process
        // Note: In development, using 'python'. In production, might need full path.
        const pythonProcess = spawn('python', [scriptPath, id.toString()]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        return new Promise<NextResponse>((resolve) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(NextResponse.json({ success: true, message: 'Extraction complete' }));
                } else {
                    console.error('Python Error:', errorOutput);
                    resolve(NextResponse.json({
                        error: 'Extraction failed',
                        details: errorOutput
                    }, { status: 500 }));
                }
            });
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
