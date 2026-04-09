import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import StarRating from '../components/StarRating'
import { proxyImageUrl } from '../utils/imageProxy'
import rawData from '../data/tyre_dataset_with_id.json'
import './ProductDetail.css'

const tyreData = rawData.data

function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  return doc.body.textContent || ''
}

function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  doc.querySelectorAll('script, iframe, style, link').forEach((el) => el.remove())
  return doc.body.innerHTML
}

function formatUSD(value) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProductDetail() {
  const { id } = useParams()
  const product = tyreData.find((p) => String(p.id) === id)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(4)
  const [activeTab, setActiveTab] = useState('description')
  const { setCurrentProduct, setTryOnProduct } = useStore()

  useEffect(() => {
    if (product) {
      setCurrentProduct({
        id: product.id,
        brand: product.Brand || '',
        name: product.name || '',
        price: product.Price || 0,
        compatible_vehicles: (product['Compatible Vehicles'] || ''),
        product_description: product['Product Description'] || '',
        features_benefits: product['Features & Benefits'] || '',
        wheel_size: product.wheel_size || '',
        wheel_width: product.wheel_width || '',
        colour: product.colour || '',
        wheel_style: product.wheel_style || '',
        wheel_model_name: product.wheel_model_name || '',
        wheel_stud_pattern_pcd: product.wheel_stud_pattern_pcd || '',
      })
    }
    return () => setCurrentProduct(null)
  }, [product, setCurrentProduct])

  if (!product) {
    return (
      <div className="detail-empty">
        <h2>Product not found</h2>
        <Link to="/">Back to all products</Link>
      </div>
    )
  }

  const brandName = product.Brand
  const numericPrice = Number(product.Price) || 0
  const totalPrice = formatUSD(numericPrice * quantity)

  const features = product['Features & Benefits']
    ? product['Features & Benefits'].split('.,').map((f) => f.trim().replace(/\.$/, ''))
    : []

  const hash = Math.abs(product.id * 2654435761 | 0)
  const reviewCount = 2 + (hash % 5)
  const rating = 4.5 + (hash % 3) * 0.2

  const images = [product.Image, product.Image, product.Image, product.Image].map(proxyImageUrl)

  const specs = [
    product.wheel_size && { label: 'Wheel Size', value: product.wheel_size },
    product.wheel_width && { label: 'Width', value: product.wheel_width },
    product.colour && { label: 'Colour', value: product.colour },
    product.wheel_style && { label: 'Style', value: product.wheel_style },
    product.wheel_stud_pattern_pcd && { label: 'PCD', value: product.wheel_stud_pattern_pcd },
    product.wheel_model_name && { label: 'Model', value: product.wheel_model_name },
  ].filter(Boolean)

  return (
    <>
      <div className="detail">
        <div className="detail__inner">
          <div className="detail__breadcrumb">
            <Link to="/">Home</Link>
            <span className="detail__sep">/</span>
            <Link to="/">Alloy Wheels</Link>
            <span className="detail__sep">/</span>
            <span>{brandName}</span>
          </div>

          <div className="detail__top">
            <div className="detail__gallery">
              <div className="detail__thumbnails">
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`detail__thumb ${selectedImage === i ? 'detail__thumb--active' : ''}`}
                    onClick={() => setSelectedImage(i)}
                  >
                    <img
                      src={img}
                      alt={`View ${i + 1}`}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://placehold.co/80x80/1a1a2e/e67e22?text=${i + 1}&font=raleway`
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="detail__main-image">
                <img
                  src={images[selectedImage]}
                  alt={product.name || product.Brand}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = `https://placehold.co/700x700/1a1a2e/e67e22?text=${encodeURIComponent(product.wheel_size || brandName)}&font=raleway`
                  }}
                />
                <button
                  className="detail__try-on-btn"
                  onClick={() => setTryOnProduct({
                    name: product.name || '',
                    brand: product.Brand || '',
                    size: product.wheel_size || '',
                    width: product.wheel_width || '',
                    colour: product.colour || '',
                    imageUrl: product.Image || '',
                  })}
                  title="See these wheels on your car"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                    <path d="M12 8v4l3 3"/>
                    <path d="M9.5 3.5l1 2M14.5 3.5l-1 2M20.5 9.5l-2 1M20.5 14.5l-2-1M14.5 20.5l-1-2M9.5 20.5l1-2M3.5 14.5l2-1M3.5 9.5l2 1"/>
                  </svg>
                  Fit it on my ride
                </button>
              </div>
            </div>

            <div className="detail__info">
              <div className="detail__brand-logo">{brandName}</div>

              <h1 className="detail__title">{product.name || product.Brand}</h1>

              <StarRating rating={rating} reviewCount={reviewCount} />

              <ul className="detail__highlights">
                {product.wheel_size && <li>Diameter: {product.wheel_size}</li>}
                {product.wheel_width && <li>Width: {product.wheel_width}</li>}
                {product.colour && <li>Colour: {product.colour}</li>}
                {product.wheel_style && <li>Style: {product.wheel_style}</li>}
                {features.length > 0 && <li>{stripHtml(features[0])}</li>}
              </ul>

              <div className="detail__price-section">
                <span className="detail__price">{formatUSD(product.Price)}</span>
                <span className="detail__part-no">SKU: {product.sku || product.id}</span>
              </div>

              <p className="detail__price-total">
                <strong>Price for {quantity} wheels: {totalPrice}</strong>
              </p>

              <div className="detail__stock">
                <span className="detail__stock-dot" />
                Available - Ships within 2 working days
              </div>

              {specs.length > 0 && (
                <div className="detail__options">
                  <h3 className="detail__options-title">Specifications</h3>
                  <div className="detail__vehicle-tags">
                    {specs.map((spec) => (
                      <span key={spec.label} className="detail__vehicle-tag">
                        {spec.label}: {spec.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail__actions">
                <div className="detail__qty">
                  <button
                    className="detail__qty-btn"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span className="detail__qty-value">{quantity}</span>
                  <button
                    className="detail__qty-btn"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button className="detail__add-to-cart">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                  </svg>
                  Add to Cart
                </button>
              </div>

              <div className="detail__payment-icons">
                {['Mastercard', 'AMEX', 'Visa', 'Apple Pay', 'PayPal'].map((name) => (
                  <span key={name} className="detail__payment-icon">{name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="detail__tabs">
            <button
              className={`detail__tab ${activeTab === 'description' ? 'detail__tab--active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button
              className={`detail__tab ${activeTab === 'features' ? 'detail__tab--active' : ''}`}
              onClick={() => setActiveTab('features')}
            >
              Features & Benefits
            </button>
            <button
              className={`detail__tab ${activeTab === 'reviews' ? 'detail__tab--active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews ({reviewCount})
            </button>
          </div>

          <div className="detail__tab-content">
            {activeTab === 'description' && (
              <div className="detail__desc-card">
                {product['Product Description'] ? (
                  <div className="detail__desc-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product['Product Description']) }} />
                ) : (
                  <p className="detail__desc-text detail__desc-text--empty">No description available for this product.</p>
                )}

                {specs.length > 0 && (
                  <>
                    <h3 className="detail__desc-heading">Specifications:</h3>
                    <div className="detail__compat-grid">
                      {specs.map((spec) => (
                        <span key={spec.label} className="detail__compat-item">
                          {spec.label}: {spec.value}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="detail__desc-card">
                {product['Features & Benefits'] ? (
                  <div className="detail__desc-text" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product['Features & Benefits']) }} />
                ) : (
                  <p className="detail__desc-text detail__desc-text--empty">No features information available.</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="detail__desc-card">
                <div className="detail__reviews-summary">
                  <StarRating rating={rating} reviewCount={reviewCount} />
                  <p className="detail__reviews-avg">{rating.toFixed(1)} out of 5</p>
                </div>
                <div className="detail__reviews-list">
                  {Array.from({ length: reviewCount }, (_, i) => (
                    <div key={i} className="detail__review">
                      <div className="detail__review-header">
                        <StarRating rating={4 + (i % 2)} />
                        <span className="detail__review-date">
                          {new Date(2026, 0, 15 + i * 5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="detail__review-title">
                        {['Great wheel for the price', 'Excellent finish and fitment', 'Good value for money', 'Very satisfied with purchase', 'Highly recommended'][i % 5]}
                      </p>
                      <p className="detail__review-body">
                        {['Fitted these to my car and the difference is noticeable. Great look and solid build quality.',
                          'These wheels have transformed the look of my vehicle. Excellent finish and perfect fitment.',
                          'Excellent quality at a reasonable price point. Would definitely buy again.',
                          'Installation was straightforward and the wheels look exactly as pictured. No complaints.',
                          'Been running these for a few months now and they still look brand new. Great product.'][i % 5]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default ProductDetail
