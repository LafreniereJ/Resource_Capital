'use client';
import { motion } from "framer-motion";
import React from "react";

export default function AuroraBackground({ children }: { children?: React.ReactNode }) {
    return (
        <div className="relative flex flex-col items-center justify-center bg-zinc-950 text-slate-950 transition-bg">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className={`
            absolute -inset-[10px] opacity-40
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,#3b82f6_10%,#a5f3fc_15%,#93c5fd_20%,#ddd6fe_25%,#60a5fa_30%)] // Blue/Teal/Purple tones
            [background-image:var(--dark-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px] invert dark:invert-0
            after:content-[""] after:absolute after:inset-0 after:[background-image:var(--dark-gradient),var(--aurora)]
            after:[background-size:200%,_100%] 
            after:animate-aurora after:[background-attachment:fixed] after:mix-blend-difference
            pointer-events-none
            dark:invert-0 dark:[background-image:var(--dark-gradient),var(--aurora)]
            dark:[background-size:200%,_100%]
            dark:animate-aurora dark:[background-attachment:fixed] dark:mix-blend-difference
          `}
                ></div>
                {/* Custom mining-themed overlay colors if needed */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 2 }}
                    className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_50%)] animate-slow-spin"
                />
            </div>
            <div className="relative z-10 w-full">{children}</div>
        </div>
    );
}
