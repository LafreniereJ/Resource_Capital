import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Terms of Service | Resource Capital',
    description: 'Terms of Service for Resource Capital mining intelligence platform.',
    robots: 'index, follow',
}

export default function TermsPage() {
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

                <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
                <p className="text-gray-500 mb-12">Last updated: January 20, 2026</p>

                <div className="prose prose-invert prose-lg max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            By accessing or using Resource Capital (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Resource Capital provides mining industry intelligence including stock data, company information, project details, news aggregation, and analytical tools for TSX and TSXV listed mining companies. The Service is intended for informational purposes only.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            When you create an account with us, you must provide accurate and complete information. You are responsible for:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Maintaining the security of your account credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized access</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Subscription and Payments</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Certain features of the Service require a paid subscription. By subscribing, you agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Pay all applicable fees at the rates in effect at the time of purchase</li>
                            <li>Automatic renewal of subscriptions unless cancelled before the renewal date</li>
                            <li>Provide accurate billing information</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            Refunds are handled on a case-by-case basis. Contact support for refund requests.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Acceptable Use</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Use the Service for any unlawful purpose</li>
                            <li>Attempt to gain unauthorized access to our systems</li>
                            <li>Scrape, copy, or redistribute our data without permission</li>
                            <li>Use automated systems to access the Service beyond normal usage</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Redistribute subscription content to non-subscribers</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-300 leading-relaxed">
                            All content, features, and functionality of the Service are owned by Resource Capital and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">7. Data and Privacy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Your use of the Service is also governed by our <Link href="/privacy" className="text-cyan-400 hover:underline">Privacy Policy</Link>, which describes how we collect, use, and protect your personal information.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">8. Disclaimer of Warranties</h2>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-4">
                            <p className="text-amber-300 font-bold mb-2">IMPORTANT NOTICE</p>
                            <p className="text-gray-300 leading-relaxed">
                                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR TIMELINESS OF ANY DATA OR INFORMATION PROVIDED THROUGH THE SERVICE.
                            </p>
                        </div>
                        <p className="text-gray-300 leading-relaxed">
                            Market data may be delayed or inaccurate. Historical data is provided for informational purposes only and should not be relied upon for trading decisions.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
                        <p className="text-gray-300 leading-relaxed">
                            To the maximum extent permitted by law, Resource Capital shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to financial losses from investment decisions.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">10. Indemnification</h2>
                        <p className="text-gray-300 leading-relaxed">
                            You agree to indemnify and hold harmless Resource Capital and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these terms.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">11. Termination</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may terminate or suspend your access to the Service immediately, without prior notice, for any reason including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Continued use of the Service after changes constitutes acceptance of the modified terms.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">13. Governing Law</h2>
                        <p className="text-gray-300 leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario, Canada, without regard to its conflict of law provisions.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">14. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have any questions about these Terms, please contact us at:
                        </p>
                        <p className="text-cyan-400 mt-2">legal@resourcecapital.com</p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                        <Link href="/privacy" className="hover:text-cyan-400 transition">Privacy Policy</Link>
                        <Link href="/disclaimer" className="hover:text-cyan-400 transition">Data Disclaimer</Link>
                        <Link href="/" className="hover:text-cyan-400 transition">Home</Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
