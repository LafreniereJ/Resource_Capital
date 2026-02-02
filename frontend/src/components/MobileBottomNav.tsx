'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    BarChart3,
    Newspaper,
    Map,
    User
} from 'lucide-react';

const NAV_ITEMS = [
    { href: '/', label: 'Home', icon: LayoutDashboard },
    { href: '/stocks', label: 'Stocks', icon: BarChart3 },
    { href: '/map', label: 'Map', icon: Map },
    { href: '/news', label: 'News', icon: Newspaper },
    { href: '/settings', label: 'Account', icon: User },
];

export default function MobileBottomNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
            <div className="flex items-center justify-around px-2 py-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center justify-center py-2 px-3 min-w-[64px] touch-target"
                        >
                            {active && (
                                <motion.div
                                    layoutId="mobileNavIndicator"
                                    className="absolute inset-0 bg-violet-500/10 rounded-xl"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                />
                            )}
                            <Icon
                                size={22}
                                className={`relative z-10 mb-1 transition-colors ${
                                    active ? 'text-violet-400' : 'text-gray-500'
                                }`}
                            />
                            <span
                                className={`relative z-10 text-[10px] font-semibold tracking-wide transition-colors ${
                                    active ? 'text-violet-300' : 'text-gray-600'
                                }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
