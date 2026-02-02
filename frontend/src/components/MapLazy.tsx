"use client";

import dynamic from 'next/dynamic';

const MiningMap = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-gray-900 animate-pulse rounded-xl"></div>
});

export default function MapLazy() {
    return <MiningMap />;
}
