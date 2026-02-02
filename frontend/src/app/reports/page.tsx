import { getReports } from '@/lib/db';
import ReportsClient from './ReportsClient';
import { reportsMetadata } from '@/lib/metadata';

export const metadata = reportsMetadata;

export default async function ReportsPage() {
    const reports = getReports();
    return <ReportsClient initialReports={reports} />;
}
