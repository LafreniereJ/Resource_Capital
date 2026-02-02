'use client'

import { useState, useEffect, useCallback } from 'react'

interface WatchlistCompany {
    ticker: string
    name: string
    exchange: string
    commodity: string
    addedAt: string
}

interface WatchlistProject {
    id: number
    name: string
    companyTicker: string
    companyName: string
    commodity: string
    addedAt: string
}

export function useWatchlist() {
    const [companies, setCompanies] = useState<WatchlistCompany[]>([])
    const [projects, setProjects] = useState<WatchlistProject[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const storedCompanies = localStorage.getItem('rc_watchlist_companies')
        const storedProjects = localStorage.getItem('rc_watchlist_projects')

        if (storedCompanies) {
            try {
                setCompanies(JSON.parse(storedCompanies))
            } catch {
                setCompanies([])
            }
        }

        if (storedProjects) {
            try {
                setProjects(JSON.parse(storedProjects))
            } catch {
                setProjects([])
            }
        }

        setIsLoaded(true)
    }, [])

    // Check if company is in watchlist
    const isCompanyWatched = useCallback((ticker: string) => {
        return companies.some(c => c.ticker === ticker)
    }, [companies])

    // Check if project is in watchlist
    const isProjectWatched = useCallback((id: number) => {
        return projects.some(p => p.id === id)
    }, [projects])

    // Add company to watchlist
    const addCompany = useCallback((company: Omit<WatchlistCompany, 'addedAt'>) => {
        const newCompany: WatchlistCompany = {
            ...company,
            addedAt: new Date().toISOString(),
        }

        setCompanies(prev => {
            // Don't add if already exists
            if (prev.some(c => c.ticker === company.ticker)) {
                return prev
            }
            const updated = [...prev, newCompany]
            localStorage.setItem('rc_watchlist_companies', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Remove company from watchlist
    const removeCompany = useCallback((ticker: string) => {
        setCompanies(prev => {
            const updated = prev.filter(c => c.ticker !== ticker)
            localStorage.setItem('rc_watchlist_companies', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Toggle company in watchlist
    const toggleCompany = useCallback((company: Omit<WatchlistCompany, 'addedAt'>) => {
        if (isCompanyWatched(company.ticker)) {
            removeCompany(company.ticker)
            return false
        } else {
            addCompany(company)
            return true
        }
    }, [isCompanyWatched, addCompany, removeCompany])

    // Add project to watchlist
    const addProject = useCallback((project: Omit<WatchlistProject, 'addedAt'>) => {
        const newProject: WatchlistProject = {
            ...project,
            addedAt: new Date().toISOString(),
        }

        setProjects(prev => {
            // Don't add if already exists
            if (prev.some(p => p.id === project.id)) {
                return prev
            }
            const updated = [...prev, newProject]
            localStorage.setItem('rc_watchlist_projects', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Remove project from watchlist
    const removeProject = useCallback((id: number) => {
        setProjects(prev => {
            const updated = prev.filter(p => p.id !== id)
            localStorage.setItem('rc_watchlist_projects', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Toggle project in watchlist
    const toggleProject = useCallback((project: Omit<WatchlistProject, 'addedAt'>) => {
        if (isProjectWatched(project.id)) {
            removeProject(project.id)
            return false
        } else {
            addProject(project)
            return true
        }
    }, [isProjectWatched, addProject, removeProject])

    return {
        companies,
        projects,
        isLoaded,
        isCompanyWatched,
        isProjectWatched,
        addCompany,
        removeCompany,
        toggleCompany,
        addProject,
        removeProject,
        toggleProject,
    }
}
