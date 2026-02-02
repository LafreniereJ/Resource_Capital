import { Metadata } from 'next';
import AlertsManager from './AlertsManager';

export const metadata: Metadata = {
    title: 'Price Alerts | Resource Capital',
    description: 'Set up price alerts for TSX/TSXV mining stocks. Get notified when stocks hit your target prices.',
    openGraph: {
        title: 'Price Alerts | Resource Capital',
        description: 'Never miss a price move. Set custom alerts for mining stocks.',
        type: 'website',
    },
};

export default function AlertsPage() {
    return <AlertsManager />;
}
