'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

interface OnboardingStep {
    title: string
    description: string
    icon: React.ReactNode
    action?: {
        label: string
        href: string
    }
}

const onboardingSteps: OnboardingStep[] = [
    {
        title: 'Welcome to Resource Capital',
        description: 'Your institutional-grade mining intelligence platform. Track TSX/TSXV mining companies, explore projects, and stay informed with real-time market data.',
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
    },
    {
        title: 'Track Stock Prices',
        description: 'Monitor 200+ TSX/TSXV mining companies with 15-minute delayed prices. Sort by price, change, or market cap to find opportunities.',
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        action: {
            label: 'Browse Stocks',
            href: '/stocks',
        },
    },
    {
        title: 'Explore Mining Projects',
        description: 'Discover mining projects across Canada with our interactive map. View project details, resource estimates, and development stages.',
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        ),
        action: {
            label: 'Open Map',
            href: '/map',
        },
    },
    {
        title: 'Compare Companies',
        description: 'Analyze companies side by side. Compare financials, valuations, and performance metrics to make informed decisions.',
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
        ),
        action: {
            label: 'Compare Companies',
            href: '/compare',
        },
    },
    {
        title: 'Build Your Watchlist',
        description: 'Save your favorite companies and projects to track. Get quick access to the stocks that matter most to you.',
        icon: (
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        ),
        action: {
            label: 'View Watchlist',
            href: '/watchlist',
        },
    },
]

export function Onboarding() {
    const { user } = useAuth()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)

    useEffect(() => {
        // Only show for logged-in users who haven't completed onboarding
        if (user) {
            const hasCompletedOnboarding = localStorage.getItem('rc_onboarding_complete')
            if (!hasCompletedOnboarding) {
                // Delay showing the modal slightly for smoother UX
                const timer = setTimeout(() => setIsOpen(true), 1000)
                return () => clearTimeout(timer)
            }
        }
    }, [user])

    const handleNext = () => {
        if (currentStep < onboardingSteps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = () => {
        localStorage.setItem('rc_onboarding_complete', 'true')
        setIsOpen(false)
    }

    const handleSkip = () => {
        localStorage.setItem('rc_onboarding_complete', 'true')
        setIsOpen(false)
    }

    const handleAction = (href: string) => {
        localStorage.setItem('rc_onboarding_complete', 'true')
        setIsOpen(false)
        router.push(href)
    }

    if (!isOpen) return null

    const step = onboardingSteps[currentStep]
    const isLastStep = currentStep === onboardingSteps.length - 1

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-neutral-800">
                    <div
                        className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-accent-secondary)]/20 flex items-center justify-center text-[var(--color-accent)]">
                        {step.icon}
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                    <p className="text-neutral-400 mb-8 leading-relaxed">{step.description}</p>

                    {/* Step dots */}
                    <div className="flex justify-center gap-2 mb-8">
                        {onboardingSteps.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    index === currentStep
                                        ? 'w-6 bg-[var(--color-accent)]'
                                        : index < currentStep
                                        ? 'bg-[var(--color-accent)]/50'
                                        : 'bg-neutral-700'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {currentStep > 0 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
                            >
                                Back
                            </button>
                        )}

                        {step.action ? (
                            <button
                                onClick={() => handleAction(step.action!.href)}
                                className="flex-1 py-3 px-4 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] text-white font-semibold rounded-xl shadow-lg transition-all hover:opacity-90"
                            >
                                {step.action.label}
                            </button>
                        ) : null}

                        <button
                            onClick={handleNext}
                            className={`flex-1 py-3 px-4 font-medium rounded-xl transition-colors ${
                                step.action
                                    ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                                    : 'bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-secondary)] text-white font-semibold shadow-lg hover:opacity-90'
                            }`}
                        >
                            {isLastStep ? 'Get Started' : 'Next'}
                        </button>
                    </div>

                    {/* Skip link */}
                    <button
                        onClick={handleSkip}
                        className="mt-4 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        Skip tutorial
                    </button>
                </div>
            </div>
        </div>
    )
}

// Hook to reset onboarding (for testing or settings)
export function useOnboarding() {
    const resetOnboarding = () => {
        localStorage.removeItem('rc_onboarding_complete')
    }

    const hasCompletedOnboarding = () => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('rc_onboarding_complete') === 'true'
    }

    return { resetOnboarding, hasCompletedOnboarding }
}
