import { Metadata } from 'next';
import PortfolioSimulator from './PortfolioSimulator';

export const metadata: Metadata = {
    title: 'Portfolio Simulator | Resource Capital',
    description: 'Simulate mining stock investments. See what your portfolio would be worth today if you had invested in the past.',
    openGraph: {
        title: 'Portfolio Simulator | Resource Capital',
        description: 'Test your investment ideas with historical data.',
        type: 'website',
    },
};

export default function SimulatorPage() {
    return <PortfolioSimulator />;
}
