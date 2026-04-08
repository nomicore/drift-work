import { createContext, useContext, useState } from 'react'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [currentProduct, setCurrentProduct] = useState(null)

  return (
    <StoreContext.Provider value={{ currentProduct, setCurrentProduct }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
