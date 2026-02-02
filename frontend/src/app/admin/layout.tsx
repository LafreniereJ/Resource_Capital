'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';

const adminNavItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/queue', label: 'Queue', icon: '📋' },
    { href: '/admin/data', label: 'Data Overrides', icon: '🔧' },
    { href: '/admin/flags', label: 'Feature Flags', icon: '🚩' },
    { href: '/admin/system', label: 'System Health', icon: '💻' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <Navbar />
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 min-h-[calc(100vh-64px)] bg-slate-800 border-r border-slate-700 p-4">
                    <div className="mb-6">
                        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Admin Panel
                        </h2>
                    </div>
                    <nav className="space-y-1">
                        {adminNavItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    <span>{item.icon}</span>
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-8 pt-6 border-t border-slate-700">
                        <div className="px-3 py-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                System Online
                            </div>
                            <div className="text-slate-600">
                                Last refresh: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
