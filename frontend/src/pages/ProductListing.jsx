import { useState, useMemo, useEffect } from 'react'
import ProductCard from '../components/ProductCard'
import { useStore } from '../context/StoreContext'
import rawData from '../data/tyre_dataset_with_id.json'
import './ProductListing.css'

const tyreData = rawData.data

const BRANDS = [...new Set(tyreData.map((p) => p.Brand))].sort()

const WHEEL_SIZES = [...new Set(
  tyreData.map((p) => p.wheel_size).filter(Boolean)
)].sort((a, b) => parseFloat(a) - parseFloat(b))

const WHEEL_WIDTHS = [...new Set(
  tyreData.map((p) => p.wheel_width).filter(Boolean)
)].sort((a, b) => parseFloat(a) - parseFloat(b))

const COLOURS = [...new Set(
  tyreData.map((p) => p.colour).filter(Boolean)
)].sort()

const TOP_BRANDS = (() => {
  const counts = {}
  tyreData.forEach((p) => {
    counts[p.Brand] = (counts[p.Brand] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name]) => name)
})()

const MAX_PRICE = 1000
const ITEMS_PER_PAGE = 20

function formatUSD(value) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProductListing() {
  const [selectedBrands, setSelectedBrands] = useState([])
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE])
  const [sortBy, setSortBy] = useState('default')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState({
    brand: true,
    price: true,
    wheelSize: true,
    wheelWidth: true,
    colour: true,
  })
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedWidths, setSelectedWidths] = useState([])
  const [selectedColours, setSelectedColours] = useState([])

  const {
    highlightedProductIds,
    clearHighlightedProducts,
  } = useStore()

  const highlightedSet = useMemo(
    () => new Set(highlightedProductIds.map(String)),
    [highlightedProductIds],
  )

  const filteredProducts = useMemo(() => {
    let result = tyreData

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.Brand || '').toLowerCase().includes(q) ||
          (p['Product Description'] || '').toLowerCase().includes(q) ||
          (p.wheel_model_name || '').toLowerCase().includes(q)
      )
    }

    if (selectedBrands.length > 0) {
      result = result.filter((p) =>
        selectedBrands.some((b) => p.Brand === b)
      )
    }

    if (selectedSizes.length > 0) {
      result = result.filter((p) => selectedSizes.includes(p.wheel_size))
    }

    if (selectedWidths.length > 0) {
      result = result.filter((p) => selectedWidths.includes(p.wheel_width))
    }

    if (selectedColours.length > 0) {
      result = result.filter((p) => selectedColours.includes(p.colour))
    }

    result = result.filter((p) => {
      const price = Number(p.Price) || 0
      return price >= priceRange[0] && price <= priceRange[1]
    })

    if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => (Number(a.Price) || 0) - (Number(b.Price) || 0))
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => (Number(b.Price) || 0) - (Number(a.Price) || 0))
    } else if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    }

    if (highlightedSet.size > 0 && sortBy === 'default') {
      const highlighted = []
      const rest = []
      for (const p of result) {
        if (highlightedSet.has(String(p.id))) {
          highlighted.push(p)
        } else {
          rest.push(p)
        }
      }
      result = [...highlighted, ...rest]
    }

    return result
  }, [searchQuery, selectedBrands, selectedSizes, selectedWidths, selectedColours, priceRange, sortBy, highlightedSet])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = filteredProducts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  function toggleBrand(brand) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
    setPage(1)
  }

  function handlePriceChange(newRange) {
    setPriceRange(newRange)
    setPage(1)
  }

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

  function toggleWidth(width) {
    setSelectedWidths((prev) =>
      prev.includes(width) ? prev.filter((w) => w !== width) : [...prev, width]
    )
    setPage(1)
  }

  function toggleColour(colour) {
    setSelectedColours((prev) =>
      prev.includes(colour) ? prev.filter((c) => c !== colour) : [...prev, colour]
    )
    setPage(1)
  }

  function handleBrandTab(brand) {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [brand]
    )
    setPage(1)
  }

  function clearAllFilters() {
    setSelectedBrands([])
    setSelectedSizes([])
    setSelectedWidths([])
    setSelectedColours([])
    setSearchQuery('')
    setPriceRange([0, MAX_PRICE])
    setPage(1)
  }

  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    selectedWidths.length > 0 ||
    selectedColours.length > 0 ||
    searchQuery ||
    priceRange[0] > 0 ||
    priceRange[1] < MAX_PRICE

  function toggleFilterSection(key) {
    setFilterOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="listing-page">
      <div className="listing-hero">
        <div className="listing-hero__inner">
          <div className="listing-hero__breadcrumb">
            <a href="#">Home</a>
            <span className="listing-hero__sep">/</span>
            <a href="#">Wheels &amp; Accessories</a>
            <span className="listing-hero__sep">/</span>
            <span>Alloy Wheels</span>
          </div>
          <h1 className="listing-hero__title">Alloy Wheels</h1>

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
            <span className="listing-hero__sizes-label">SELECT A WHEEL SIZE:</span>
            <div className="listing-hero__size-buttons">
              {WHEEL_SIZES.map((size) => (
                <button
                  key={size}
                  className={`listing-hero__size-btn ${selectedSizes.includes(size) ? 'listing-hero__size-btn--active' : ''}`}
                  onClick={() => toggleSize(size)}
                >
                  {size}
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
              Showing {filteredProducts.length} wheel{filteredProducts.length !== 1 ? 's' : ''} — use filters on the left to refine results
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

            {/* Brand filter */}
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
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                      className="sidebar__search-input"
                    />
                  </div>
                  <ul className="sidebar__checklist">
                    {BRANDS.map((brand) => (
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

            {/* Wheel Size filter */}
            <div className="sidebar__section">
              <button
                className="sidebar__section-toggle"
                onClick={() => toggleFilterSection('wheelSize')}
              >
                <span>WHEEL SIZE</span>
                <span className={`sidebar__chevron ${filterOpen.wheelSize ? 'sidebar__chevron--open' : ''}`}>
                  ‹
                </span>
              </button>
              {filterOpen.wheelSize && (
                <div className="sidebar__section-content">
                  <ul className="sidebar__checklist">
                    {WHEEL_SIZES.map((size) => (
                      <li key={size} className="sidebar__check-item">
                        <label className="sidebar__check-label">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(size)}
                            onChange={() => toggleSize(size)}
                            className="sidebar__checkbox"
                          />
                          <span className="sidebar__check-name">{size}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Wheel Width filter */}
            <div className="sidebar__section">
              <button
                className="sidebar__section-toggle"
                onClick={() => toggleFilterSection('wheelWidth')}
              >
                <span>WHEEL WIDTH</span>
                <span className={`sidebar__chevron ${filterOpen.wheelWidth ? 'sidebar__chevron--open' : ''}`}>
                  ‹
                </span>
              </button>
              {filterOpen.wheelWidth && (
                <div className="sidebar__section-content">
                  <ul className="sidebar__checklist">
                    {WHEEL_WIDTHS.map((width) => (
                      <li key={width} className="sidebar__check-item">
                        <label className="sidebar__check-label">
                          <input
                            type="checkbox"
                            checked={selectedWidths.includes(width)}
                            onChange={() => toggleWidth(width)}
                            className="sidebar__checkbox"
                          />
                          <span className="sidebar__check-name">{width}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Colour filter */}
            <div className="sidebar__section">
              <button
                className="sidebar__section-toggle"
                onClick={() => toggleFilterSection('colour')}
              >
                <span>COLOUR</span>
                <span className={`sidebar__chevron ${filterOpen.colour ? 'sidebar__chevron--open' : ''}`}>
                  ‹
                </span>
              </button>
              {filterOpen.colour && (
                <div className="sidebar__section-content">
                  <ul className="sidebar__checklist">
                    {COLOURS.map((colour) => (
                      <li key={colour} className="sidebar__check-item">
                        <label className="sidebar__check-label">
                          <input
                            type="checkbox"
                            checked={selectedColours.includes(colour)}
                            onChange={() => toggleColour(colour)}
                            className="sidebar__checkbox"
                          />
                          <span className="sidebar__check-name">{colour}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
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
                  highlighted={highlightedSet.has(String(product.id))}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="listing__empty">
                <p>No products match your filters.</p>
                <button onClick={clearAllFilters}>
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
