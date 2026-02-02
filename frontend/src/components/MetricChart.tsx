'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricChartProps {
    data: any[];
    metricName: string;
    color?: string;
}

export default function MetricChart({ data, metricName, color = "#fbbf24" }: MetricChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-40 flex items-center justify-center text-gray-500 text-sm">No data available for {metricName}</div>;
    }

    // Format data for chart
    // Expects data to have 'filing_date' or 'period_end' and 'metric_value'
    const chartData = data.map(d => ({
        date: d.period_end || d.filing_date || 'Unknown',
        value: d.metric_value,
        unit: d.unit
    })).reverse(); // Assuming DB returns desc, we want asc for chart

    return (
        <div className="h-64 w-full">
            <h3 className="text-sm font-medium text-gray-400 mb-4">{metricName} Trend</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={10}
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                    />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: any) => [value?.toLocaleString(), metricName]}
                    />
                    <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
