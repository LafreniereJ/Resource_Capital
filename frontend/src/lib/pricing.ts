
export const PRICING_TIERS = {
    SILVER: {
        id: 'silver',
        name: 'Silver',
        cost: 0,
        features: ['15-min Delayed Data', '1 Watchlist', 'Basic Search'],
        metalColor: 'bg-slate-200',
        badgeColor: 'badge-ghost',
        buttonColor: 'btn-ghost',
    },
    GOLD: {
        id: 'gold',
        name: 'Gold',
        description: 'For serious investors & analysts',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_GOLD || 'price_gold', // Note: use public env if needed on client
        cost: 29,
        interval: 'month',
        features: [
            'Real-time Market Data',
            'Unlimited Watchlists',
            'Advanced Screening',
            'Email Price Alerts',
            'Commodity Correlations'
        ],
        metalColor: 'bg-yellow-400',
        badgeColor: 'badge-warning',
        buttonColor: 'btn-warning',
        popular: true,
    },
    PLATINUM: {
        id: 'platinum',
        name: 'Platinum',
        description: 'For funds & institutions',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PLATINUM || 'price_platinum',
        cost: 299,
        interval: 'month',
        features: [
            'Everything in Gold',
            'API Access (10k req/day)',
            'Bulk Data Exports',
            'Priority Support',
            'Multi-seat Management'
        ],
        metalColor: 'bg-zinc-300', // Platinum look
        badgeColor: 'badge-neutral',
        buttonColor: 'btn-neutral',
    },
};
