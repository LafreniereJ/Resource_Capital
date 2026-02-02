'use client';

import React from 'react';

export function BackgroundEffects() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Primary Accent Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-accent)]/10 blur-[120px] animate-pulse"
                style={{ animationDuration: '8s' }} />

            {/* Secondary Gradient Mid Glow */}
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--color-gradient-mid)]/10 blur-[120px] animate-pulse"
                style={{ animationDuration: '10s', animationDelay: '2s' }} />

            {/* Subtle Central Glow */}
            <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-[var(--color-accent)]/5 blur-[150px] opacity-50" />

            {/* Noise / Grain Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>
    );
}
