import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Data & Investment Disclaimer | Resource Capital',
    description: 'Important disclaimers about data accuracy and investment risks when using Resource Capital mining intelligence platform.',
    robots: 'index, follow',
}

export default function DisclaimerPage() {
    return (
        <main className="min-h-screen bg-[var(--color-bg-base)] text-gray-200 selection:bg-[var(--color-accent-muted)]">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6 py-16">
                <div className="mb-8">
                    <Link href="/" className="text-sm text-gray-500 hover:text-cyan-400 transition">
                        ← Back to Home
                    </Link>
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">Data & Investment Disclaimer</h1>
                <p className="text-gray-500 mb-12">Last updated: January 20, 2026</p>

                {/* Important Notice Box */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 mb-12">
                    <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        IMPORTANT NOTICE
                    </h2>
                    <p className="text-gray-200 leading-relaxed text-lg">
                        The information provided on Resource Capital is for <strong>informational and educational purposes only</strong>. It should not be construed as investment advice, financial advice, trading advice, or any other type of advice. <strong>You should not make any investment decisions based solely on the information presented on this platform.</strong>
                    </p>
                </div>

                <div className="prose prose-invert prose-lg max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Not Investment Advice</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Resource Capital is a data aggregation and information platform. We are <strong>not</strong> a registered investment advisor, broker-dealer, or financial planner. The content on this platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                            <li>Does not constitute personalized investment advice</li>
                            <li>Does not take into account your individual financial situation</li>
                            <li>Should not be relied upon for making investment decisions</li>
                            <li>Does not constitute a recommendation to buy, sell, or hold any security</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Data Accuracy and Timeliness</h2>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-4">
                            <p className="text-amber-300 font-bold">MARKET DATA MAY BE DELAYED OR INACCURATE</p>
                        </div>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            While we strive to provide accurate information, we cannot guarantee the accuracy, completeness, or timeliness of any data presented on this platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Stock Prices:</strong> May be delayed up to 15 minutes or more</li>
                            <li><strong>Metal Prices:</strong> Sourced from third-party providers and may not reflect real-time market conditions</li>
                            <li><strong>Company Data:</strong> Compiled from public sources and may contain errors or omissions</li>
                            <li><strong>Financial Statements:</strong> Based on publicly available filings and may not be current</li>
                            <li><strong>Project Metrics:</strong> Extracted from technical reports and may be subject to interpretation</li>
                            <li><strong>News:</strong> Aggregated from third-party sources and not independently verified</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Mining Investment Risks</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Investing in mining companies carries significant risks, including but not limited to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Commodity Price Volatility:</strong> Metal prices can fluctuate dramatically</li>
                            <li><strong>Exploration Risk:</strong> Exploration projects may fail to find economic deposits</li>
                            <li><strong>Development Risk:</strong> Projects may face permitting, financing, or technical challenges</li>
                            <li><strong>Operational Risk:</strong> Mining operations face environmental, safety, and geopolitical risks</li>
                            <li><strong>Market Risk:</strong> Mining stocks, especially junior miners on TSXV, can be highly volatile</li>
                            <li><strong>Liquidity Risk:</strong> Some mining stocks may have low trading volumes</li>
                            <li><strong>Regulatory Risk:</strong> Changes in mining laws or environmental regulations</li>
                            <li><strong>Loss of Capital:</strong> You may lose some or all of your investment</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Third-Party Data Sources</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We aggregate data from various third-party sources including:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Yahoo Finance (via yfinance)</li>
                            <li>TMX Group</li>
                            <li>Mining company press releases and filings</li>
                            <li>SEDAR+ (Canadian securities filings)</li>
                            <li>RSS news feeds from mining news outlets</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            We do not control or verify the accuracy of data from these sources. Data may contain errors, omissions, or become outdated without notice.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Forward-Looking Statements</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Some information on this platform may include forward-looking statements or projections from company filings and reports. These statements involve risks and uncertainties, and actual results may differ materially from those projected. Forward-looking information should not be relied upon as predictions of future events.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Consult a Professional</h2>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-6">
                            <p className="text-cyan-300 leading-relaxed">
                                Before making any investment decisions, we strongly recommend that you:
                            </p>
                            <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                                <li>Consult with a qualified financial advisor</li>
                                <li>Conduct your own independent research</li>
                                <li>Consider your personal financial situation and risk tolerance</li>
                                <li>Read all official company filings and disclosures</li>
                                <li>Understand that past performance is not indicative of future results</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">No Warranties</h2>
                        <p className="text-gray-300 leading-relaxed">
                            The information and services provided by Resource Capital are offered on an &quot;as is&quot; and &quot;as available&quot; basis, without any warranties of any kind, either express or implied. We disclaim all warranties, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            In no event shall Resource Capital, its officers, directors, employees, or affiliates be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of or inability to use this platform, including but not limited to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                            <li>Financial losses from investment decisions</li>
                            <li>Reliance on any information provided</li>
                            <li>Errors or omissions in data or content</li>
                            <li>Data delays or interruptions</li>
                            <li>Unauthorized access to your account</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">Your Responsibility</h2>
                        <p className="text-gray-300 leading-relaxed">
                            By using Resource Capital, you acknowledge and agree that:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2 mt-4">
                            <li>You are solely responsible for your investment decisions</li>
                            <li>You have read and understood this disclaimer</li>
                            <li>You will conduct your own due diligence before investing</li>
                            <li>You will not hold Resource Capital liable for any losses</li>
                        </ul>
                    </section>
                </div>

                {/* Acknowledgment Box */}
                <div className="bg-neutral-900/50 border border-white/10 rounded-2xl p-8 mt-12">
                    <p className="text-gray-400 text-center">
                        By using Resource Capital, you acknowledge that you have read, understood, and agree to this disclaimer.
                    </p>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                        <Link href="/terms" className="hover:text-cyan-400 transition">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-cyan-400 transition">Privacy Policy</Link>
                        <Link href="/" className="hover:text-cyan-400 transition">Home</Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
