import { createContext, useContext, useState, useCallback } from 'react'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [highlightedProductIds, setHighlightedProductIds] = useState([])
  const [currentProduct, setCurrentProduct] = useState(null)

  const updateHighlightedProducts = useCallback((ids) => {
    setHighlightedProductIds(ids || [])
  }, [])

  const clearHighlightedProducts = useCallback(() => {
    setHighlightedProductIds([])
  }, [])

  return (
    <StoreContext.Provider
      value={{
        highlightedProductIds,
        updateHighlightedProducts,
        clearHighlightedProducts,
        currentProduct,
        setCurrentProduct,
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
