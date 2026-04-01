import { createContext, useContext, useState, useCallback, useRef } from 'react'

const StoreContext = createContext(null)

const MAX_PRICE = 1000

export function StoreProvider({ children }) {
  const [highlightedProductIds, setHighlightedProductIds] = useState([])
  const [currentProduct, setCurrentProduct] = useState(null)
  const [activeFilters, setActiveFilters] = useState({
    brands: [],
    priceRange: [0, MAX_PRICE],
    sizes: [],
    widths: [],
    colours: [],
  })
  const [filterVersion, setFilterVersion] = useState(0)
  const filterListenersRef = useRef([])

  const updateHighlightedProducts = useCallback((ids) => {
    setHighlightedProductIds(ids || [])
  }, [])

  const clearHighlightedProducts = useCallback(() => {
    setHighlightedProductIds([])
  }, [])

  const updateFilters = useCallback((filters) => {
    setActiveFilters((prev) => {
      const next = { ...prev, ...filters }
      return next
    })
    setFilterVersion((v) => v + 1)
  }, [])

  const onFilterChange = useCallback((listener) => {
    filterListenersRef.current.push(listener)
    return () => {
      filterListenersRef.current = filterListenersRef.current.filter(
        (l) => l !== listener,
      )
    }
  }, [])

  const notifyFilterChange = useCallback((filters, label) => {
    filterListenersRef.current.forEach((fn) => fn(filters, label))
  }, [])

  return (
    <StoreContext.Provider
      value={{
        highlightedProductIds,
        updateHighlightedProducts,
        clearHighlightedProducts,
        currentProduct,
        setCurrentProduct,
        activeFilters,
        updateFilters,
        filterVersion,
        onFilterChange,
        notifyFilterChange,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
