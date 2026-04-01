import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import ProductCard from '../components/ProductCard'
import { useStore } from '../context/StoreContext'
import tyreData from '../data/tyre_dataset_with_id.json'
import './ProductListing.css'

const BRANDS = [...new Set(tyreData.map((p) => {
  const parts = p.Brand.split(' ')
  return parts[0]
}))].sort()

const RIM_SIZES = [...new Set(tyreData.map((p) => {
  const match = p.Brand.match(/\bR\s*(\d{2})\b/)
  return match ? match[1] : null
}).filter(Boolean))].sort((a, b) => Number(a) - Number(b))

const TOP_BRANDS = (() => {
  const counts = {}
  tyreData.forEach((p) => {
    const brand = p.Brand.split(' ')[0]
    counts[brand] = (counts[brand] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name]) => name)
})()

const ITEMS_PER_PAGE = 20

function ProductListing() {
  const [selectedBrands, setSelectedBrands] = useState([])
  const [priceRange, setPriceRange] = useState([0, 50000])
  const [sortBy, setSortBy] = useState('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState({ brand: true, price: true, vehicle: false })
  const [selectedSizes, setSelectedSizes] = useState([])

  const {
    highlightedProductIds,
    clearHighlightedProducts,
    updateFilters,
    notifyFilterChange,
  } = useStore()

  const highlightedSet = useMemo(
    () => new Set(highlightedProductIds),
    [highlightedProductIds],
  )

  const prevBrandsRef = useRef(selectedBrands)
  const prevPriceRef = useRef(priceRange)

  const syncFiltersToContext = useCallback(
    (brands, price, label) => {
      updateFilters({ brands, priceRange: price })
      notifyFilterChange({ brands, priceRange: price }, label)
    },
    [updateFilters, notifyFilterChange],
  )

  const filteredProducts = useMemo(() => {
    let result = tyreData

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.Brand.toLowerCase().includes(q) ||
          (p['Compatible Vehicles'] || '').toLowerCase().includes(q) ||
          (p['Product Description'] || '').toLowerCase().includes(q)
      )
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) =>
        selectedBrands.some((b) => p.Brand.toLowerCase().startsWith(b.toLowerCase()))
      )
    }

    if (selectedSizes.length > 0) {
      result = result.filter((p) => {
        const match = p.Brand.match(/\bR\s*(\d{2})\b/)
        return match && selectedSizes.includes(match[1])
      })
    }

    result = result.filter((p) => {
      const price = parseFloat((p.Price || '0').replace(/,/g, ''))
      return price >= priceRange[0] && price <= priceRange[1]
    })

    if (sortBy === 'price-asc') {
      result = [...result].sort(
        (a, b) => parseFloat((a.Price || '0').replace(/,/g, '')) - parseFloat((b.Price || '0').replace(/,/g, ''))
      )
    } else if (sortBy === 'price-desc') {
      result = [...result].sort(
        (a, b) => parseFloat((b.Price || '0').replace(/,/g, '')) - parseFloat((a.Price || '0').replace(/,/g, ''))
      )
    } else if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => a.Brand.localeCompare(b.Brand))
    }

    if (highlightedSet.size > 0 && sortBy === 'default') {
      const highlighted = []
      const rest = []
      for (const p of result) {
        if (highlightedSet.has(p.id)) {
          highlighted.push(p)
        } else {
          rest.push(p)
        }
      }
      result = [...highlighted, ...rest]
    }

    return result
  }, [searchQuery, selectedBrands, selectedSizes, priceRange, sortBy, highlightedSet])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function toggleBrand(brand) {
    setSelectedBrands((prev) => {
      const next = prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
      return next
    })
    const adding = !selectedBrands.includes(brand)
    const next = adding ? [...selectedBrands, brand] : selectedBrands.filter((b) => b !== brand)
    const label = adding
      ? `Filter applied: brand "${brand}"`
      : `Filter removed: brand "${brand}"`
    syncFiltersToContext(next, priceRange, label)
    setPage(1)
  }

  const priceDebounceRef = useRef(null)
  function handlePriceChange(newRange) {
    setPriceRange(newRange)
    setPage(1)
    clearTimeout(priceDebounceRef.current)
    priceDebounceRef.current = setTimeout(() => {
      const label = `Price range set: ₹${newRange[0].toLocaleString()} – ₹${newRange[1].toLocaleString()}`
      syncFiltersToContext(selectedBrands, newRange, label)
    }, 800)
  }

  useEffect(() => {
    return () => clearTimeout(priceDebounceRef.current)
  }, [])

  useEffect(() => {
    if (highlightedProductIds.length > 0) {
      setPage(1)
      setSortBy('default')
    }
  }, [highlightedProductIds])

  function toggleSize(size) {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
    setPage(1)
  }

  function handleBrandTab(brand) {
    const next = selectedBrands.includes(brand) ? selectedBrands.filter((b) => b !== brand) : [brand]
    setSelectedBrands(next)
    setPage(1)
    syncFiltersToContext(next, priceRange, next.length ? `Filter applied: brand "${brand}"` : 'Brand filter cleared')
  }

  function clearAllFilters() {
    setSelectedBrands([])
    setSelectedSizes([])
    setSearchQuery('')
    setPriceRange([0, 50000])
    setPage(1)
    syncFiltersToContext([], [0, 50000], 'All filters cleared')
  }

  const hasActiveFilters = selectedBrands.length > 0 || selectedSizes.length > 0 || searchQuery || priceRange[0] > 0 || priceRange[1] < 50000

  function toggleFilterSection(key) {
    setFilterOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const displayedBrands = BRANDS.slice(0, 25)

  return (
    <div className="listing-page">
      <div className="listing-hero">
        <div className="listing-hero__inner">
          <div className="listing-hero__breadcrumb">
            <a href="#">Home</a>
            <span className="listing-hero__sep">/</span>
            <a href="#">Tyres &amp; Accessories</a>
            <span className="listing-hero__sep">/</span>
            <span>Tyres</span>
          </div>
          <h1 className="listing-hero__title">Tyres</h1>

          <div className="listing-hero__brands">
            {TOP_BRANDS.map((brand) => (
              <button
                key={brand}
                className={`listing-hero__brand-tab ${selectedBrands.length === 1 && selectedBrands[0] === brand ? 'listing-hero__brand-tab--active' : ''}`}
                onClick={() => handleBrandTab(brand)}
              >
                {brand.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="listing-hero__divider" />

          <div className="listing-hero__sizes">
            <span className="listing-hero__sizes-label">CLICK A TYRE SIZE BUTTON BELOW TO SEARCH:</span>
            <div className="listing-hero__size-buttons">
              {RIM_SIZES.map((size) => (
                <button
                  key={size}
                  className={`listing-hero__size-btn ${selectedSizes.includes(size) ? 'listing-hero__size-btn--active' : ''}`}
                  onClick={() => toggleSize(size)}
                >
                  {size}&quot;
                </button>
              ))}
            </div>
            <button
              className="listing-hero__search-btn"
              onClick={() => setPage(1)}
            >
              SEARCH
            </button>
          </div>

          <div className="listing-hero__info-bar">
            <span className="listing-hero__info-text">
              Showing {filteredProducts.length} tyres — use filters on the left to refine results
            </span>
            <button className="listing-hero__clear-link" onClick={clearAllFilters}>
              Clear all filters
            </button>
          </div>
        </div>
      </div>

      {highlightedProductIds.length > 0 && (
        <div className="listing-ai-banner">
          <div className="listing-ai-banner__inner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>
              AI recommended {highlightedProductIds.length} product{highlightedProductIds.length > 1 ? 's' : ''} — highlighted below
            </span>
            <button
              className="listing-ai-banner__clear"
              onClick={clearHighlightedProducts}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="listing">
        <div className="listing__inner">
          <aside className="listing__sidebar">
            <div className="sidebar__header">
              <h2 className="sidebar__title">FILTER BY</h2>
              <button className="sidebar__clear-link" onClick={clearAllFilters}>
                Clear All
              </button>
            </div>
            <div className="sidebar__header-accent" />

            <div className="sidebar__section">
              <button
                className="sidebar__section-toggle"
                onClick={() => toggleFilterSection('brand')}
              >
                <span>BRAND</span>
                <span className={`sidebar__chevron ${filterOpen.brand ? 'sidebar__chevron--open' : ''}`}>
                  ‹
                </span>
              </button>
              {filterOpen.brand && (
                <div className="sidebar__section-content">
                  <div className="sidebar__search">
                    <input
                      type="text"
                      placeholder="Search brands..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="sidebar__search-input"
                    />
                  </div>
                  <ul className="sidebar__checklist">
                    {displayedBrands.map((brand) => (
                      <li key={brand} className="sidebar__check-item">
                        <label className="sidebar__check-label">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand)}
                            onChange={() => toggleBrand(brand)}
                            className="sidebar__checkbox"
                          />
                          <span className="sidebar__check-name">{brand}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="sidebar__section">
              <button
                className="sidebar__section-toggle"
                onClick={() => toggleFilterSection('price')}
              >
                <span>PRICE RANGE</span>
                <span className={`sidebar__chevron ${filterOpen.price ? 'sidebar__chevron--open' : ''}`}>
                  ‹
                </span>
              </button>
              {filterOpen.price && (
                <div className="sidebar__section-content">
                  <div className="sidebar__price-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange[0] || ''}
                      onChange={(e) => handlePriceChange([Number(e.target.value) || 0, priceRange[1]])}
                      className="sidebar__price-input"
                    />
                    <span className="sidebar__price-sep">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange[1] || ''}
                      onChange={(e) => handlePriceChange([priceRange[0], Number(e.target.value) || 50000])}
                      className="sidebar__price-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main className="listing__main">
            <div className="listing__toolbar">
              <span className="listing__result-count" />
              <div className="listing__sort">
                <label htmlFor="sort-select">Sort:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="listing__sort-select"
                >
                  <option value="default">Best Sellers</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
              </div>
            </div>

            <div className="listing__grid">
              {paginatedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  highlighted={highlightedSet.has(product.id)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="listing__empty">
                <p>No products match your filters.</p>
                <button onClick={() => { setSelectedBrands([]); setSearchQuery(''); setPriceRange([0, 50000]) }}>
                  Clear filters
                </button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="listing__pagination">
                <button
                  className="listing__page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← Prev
                </button>
                <div className="listing__page-numbers">
                  {(() => {
                    const maxVisible = 5
                    const pages = []

                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i)
                    } else if (page <= 3) {
                      for (let i = 1; i <= maxVisible; i++) pages.push(i)
                      pages.push('...')
                    } else if (page >= totalPages - 2) {
                      pages.push('...')
                      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i)
                    } else {
                      pages.push('...')
                      for (let i = page - 1; i <= page + 1; i++) pages.push(i)
                      pages.push('...')
                    }

                    return pages.map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="listing__page-ellipsis">...</span>
                      ) : (
                        <button
                          key={p}
                          className={`listing__page-num ${page === p ? 'listing__page-num--active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )
                  })()}
                </div>
                <button
                  className="listing__page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProductListing
