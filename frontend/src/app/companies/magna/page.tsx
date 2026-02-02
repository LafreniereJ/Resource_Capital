import { getCompany, getProject, getProjectMetrics } from '@/lib/db';

export default async function MagnaPage() {
    const company = await getCompany('NICU') as any;

    if (!company) {
        return <div className="p-10 text-white">Company not found in DB. Please run pipeline.</div>;
    }

    const project = await getProject(company.id) as any;
    const metrics = project ? await getProjectMetrics(project.id) as any[] : [];

    return (
        <main className="min-h-screen bg-neutral-950 text-gray-200 p-8 font-sans">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-tr from-yellow-600 to-yellow-300 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)]"></div>
                    <div>
                        <h1 className="text-4xl font-bold text-white tracking-tight">{company.name}</h1>
                        <p className="text-yellow-500 font-mono text-lg">{company.ticker} : {company.exchange}</p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Project Card */}
                <div className="col-span-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                    <h2 className="text-xl font-semibold text-white mb-4">Core Asset</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Project Name</p>
                            <p className="text-lg text-white font-medium">{project.name}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                            <p className="text-white">{project.location}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Stage</p>
                            <div className="badge badge-warning gap-2 mt-1">
                                {project.stage}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Primary Commodity</p>
                            <p className="text-white">{project.commodity}</p>
                        </div>
                    </div>
                </div>

                {/* Drill Results Table */}
                <div className="col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-white">Latest Drill Intercepts</h2>
                        <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded-full border border-green-900/50">
                            Source: SEDAR+ (Jun 25, 2024)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table w-full text-sm">
                            <thead className="bg-gray-800/50 text-gray-300">
                                <tr>
                                    <th>Hole ID</th>
                                    <th>Metric</th>
                                    <th>Value</th>
                                    <th>Interval</th>
                                    <th>Snippet</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((m) => (
                                    <tr key={m.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition">
                                        <td className="font-mono text-yellow-500">{m.hole_id}</td>
                                        <td className="font-semibold text-white">{m.metric_name}</td>
                                        <td className="font-mono text-lg">{m.metric_value} <span className="text-xs text-gray-500">{m.unit}</span></td>
                                        <td className="text-gray-400">{m.interval_length}m</td>
                                        <td className="text-xs text-gray-500 italic max-w-xs truncate">{m.raw_text_snippet}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
