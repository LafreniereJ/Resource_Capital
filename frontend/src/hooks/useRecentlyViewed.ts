'use client'

import { useState, useEffect, useCallback } from 'react'

interface RecentlyViewedItem {
    type: 'company' | 'project' | 'news'
    id: string
    title: string
    subtitle?: string
    url: string
    viewedAt: string
}

const MAX_ITEMS = 20

export function useRecentlyViewed() {
    const [items, setItems] = useState<RecentlyViewedItem[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('rc_recently_viewed')
        if (stored) {
            try {
                setItems(JSON.parse(stored))
            } catch {
                setItems([])
            }
        }
        setIsLoaded(true)
    }, [])

    // Add item to recently viewed
    const addItem = useCallback((item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
        setItems(prev => {
            // Remove existing entry for same item
            const filtered = prev.filter(i => !(i.type === item.type && i.id === item.id))

            // Add new item at the beginning
            const updated = [
                { ...item, viewedAt: new Date().toISOString() },
                ...filtered,
            ].slice(0, MAX_ITEMS) // Keep only MAX_ITEMS

            localStorage.setItem('rc_recently_viewed', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Add company to recently viewed
    const addCompany = useCallback((ticker: string, name: string) => {
        addItem({
            type: 'company',
            id: ticker,
            title: ticker,
            subtitle: name,
            url: `/companies/${ticker}`,
        })
    }, [addItem])

    // Add project to recently viewed
    const addProject = useCallback((id: number, name: string, companyTicker: string) => {
        addItem({
            type: 'project',
            id: String(id),
            title: name,
            subtitle: companyTicker,
            url: `/companies/${companyTicker}/projects/${id}`,
        })
    }, [addItem])

    // Add news to recently viewed
    const addNews = useCallback((id: number, title: string) => {
        addItem({
            type: 'news',
            id: String(id),
            title: title,
            url: `/news/${id}`,
        })
    }, [addItem])

    // Clear all history
    const clearHistory = useCallback(() => {
        setItems([])
        localStorage.removeItem('rc_recently_viewed')
    }, [])

    // Remove single item
    const removeItem = useCallback((type: string, id: string) => {
        setItems(prev => {
            const updated = prev.filter(i => !(i.type === type && i.id === id))
            localStorage.setItem('rc_recently_viewed', JSON.stringify(updated))
            return updated
        })
    }, [])

    // Get items by type
    const getCompanies = useCallback(() => {
        return items.filter(i => i.type === 'company')
    }, [items])

    const getProjects = useCallback(() => {
        return items.filter(i => i.type === 'project')
    }, [items])

    const getNews = useCallback(() => {
        return items.filter(i => i.type === 'news')
    }, [items])

    return {
        items,
        isLoaded,
        addItem,
        addCompany,
        addProject,
        addNews,
        clearHistory,
        removeItem,
        getCompanies,
        getProjects,
        getNews,
    }
}
