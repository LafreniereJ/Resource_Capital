import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Privacy Policy | Resource Capital',
    description: 'Privacy Policy for Resource Capital mining intelligence platform. Learn how we collect, use, and protect your data.',
    robots: 'index, follow',
}

export default function PrivacyPage() {
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

                <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
                <p className="text-gray-500 mb-12">Last updated: January 20, 2026</p>

                <div className="prose prose-invert prose-lg max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Resource Capital (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mining intelligence platform.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>

                        <h3 className="text-xl font-bold text-white mt-6 mb-3">2.1 Information You Provide</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Account Information:</strong> Email address, password (encrypted), and profile details</li>
                            <li><strong>Payment Information:</strong> Processed securely through Stripe; we do not store credit card numbers</li>
                            <li><strong>Preferences:</strong> Watchlists, display settings, notification preferences</li>
                            <li><strong>Communications:</strong> Messages you send to our support team</li>
                        </ul>

                        <h3 className="text-xl font-bold text-white mt-6 mb-3">2.2 Information Collected Automatically</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
                            <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
                            <li><strong>Cookies:</strong> Session cookies for authentication and preference cookies</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">We use your information to:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process your transactions and manage your subscription</li>
                            <li>Personalize your experience (watchlists, recently viewed)</li>
                            <li>Send service-related notifications and updates</li>
                            <li>Respond to your inquiries and support requests</li>
                            <li>Detect, prevent, and address technical issues and abuse</li>
                            <li>Analyze usage patterns to improve our platform</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Information Sharing</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We do not sell your personal information. We may share your information with:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Service Providers:</strong> Third parties that help us operate our platform (hosting, payment processing, analytics)</li>
                            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                        </ul>

                        <h3 className="text-xl font-bold text-white mt-6 mb-3">Third-Party Services We Use</h3>
                        <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-6">
                            <ul className="text-gray-300 space-y-3">
                                <li><strong>Supabase:</strong> Database and authentication services</li>
                                <li><strong>Stripe:</strong> Payment processing</li>
                                <li><strong>Vercel:</strong> Hosting and deployment</li>
                                <li><strong>Google OAuth:</strong> Optional third-party login</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Cookies and Tracking</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">We use the following types of cookies:</p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Essential Cookies:</strong> Required for authentication and basic functionality</li>
                            <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                            <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            You can control cookies through your browser settings. Disabling certain cookies may limit functionality.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We implement appropriate security measures to protect your information:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li>Encryption of data in transit (TLS/HTTPS)</li>
                            <li>Encryption of sensitive data at rest</li>
                            <li>Secure authentication with hashed passwords</li>
                            <li>Regular security assessments</li>
                            <li>Access controls and audit logging</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">7. Data Retention</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information for legal or legitimate business purposes, such as compliance with laws, resolving disputes, and enforcing agreements.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Depending on your location, you may have the following rights:
                        </p>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal obligations)</li>
                            <li><strong>Export:</strong> Request your data in a portable format</li>
                            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                        </ul>
                        <p className="text-gray-300 leading-relaxed mt-4">
                            To exercise these rights, contact us at <span className="text-cyan-400">privacy@resourcecapital.com</span>
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">9. International Data Transfers</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">10. Children&apos;s Privacy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Our Service is not directed to individuals under 18. We do not knowingly collect personal information from children. If we become aware of such collection, we will delete the information.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Policy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
                        <p className="text-gray-300 leading-relaxed">
                            If you have questions about this Privacy Policy or our data practices, please contact us:
                        </p>
                        <div className="bg-neutral-900/50 border border-white/10 rounded-xl p-6 mt-4">
                            <p className="text-gray-300">Email: <span className="text-cyan-400">privacy@resourcecapital.com</span></p>
                            <p className="text-gray-300 mt-2">Resource Capital</p>
                            <p className="text-gray-500">Toronto, Ontario, Canada</p>
                        </div>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                        <Link href="/terms" className="hover:text-cyan-400 transition">Terms of Service</Link>
                        <Link href="/disclaimer" className="hover:text-cyan-400 transition">Data Disclaimer</Link>
                        <Link href="/" className="hover:text-cyan-400 transition">Home</Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
