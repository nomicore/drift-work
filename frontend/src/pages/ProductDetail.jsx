import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import StarRating from '../components/StarRating'
import tyreData from '../data/tyre_dataset_with_id.json'
import './ProductDetail.css'

function ProductDetail() {
  const { id } = useParams()
  const product = tyreData.find((p) => p.id === id)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(4)
  const [activeTab, setActiveTab] = useState('description')
  const { setCurrentProduct } = useStore()

  useEffect(() => {
    if (product) {
      setCurrentProduct({
        id: product.id,
        brand: product.Brand || '',
        price: product.Price || '',
        compatible_vehicles: product['Compatible Vehicles'] || '',
        product_description: product['Product Description'] || '',
        features_benefits: product['Features & Benefits'] || '',
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

  const brandParts = product.Brand.split(' ')
  const brandName = brandParts.slice(0, 2).join(' ')
  const price = product.Price ? product.Price.replace(/,/g, '') : '0'
  const numericPrice = parseFloat(price)
  const totalPrice = (numericPrice * quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const features = product['Features & Benefits']
    ? product['Features & Benefits'].split('.,').map((f) => f.trim().replace(/\.$/, ''))
    : []

  const compatibleVehicles = product['Compatible Vehicles']
    ? product['Compatible Vehicles'].split(',').map((v) => v.trim())
    : []

  const hash = id.charCodeAt(5) + id.charCodeAt(6)
  const reviewCount = 2 + (hash % 5)
  const rating = 4.5 + (hash % 3) * 0.2

  const images = [product.Image, product.Image, product.Image, product.Image]

  return (
    <>
      <div className="detail">
        <div className="detail__inner">
          <div className="detail__breadcrumb">
            <Link to="/">Home</Link>
            <span className="detail__sep">/</span>
            <Link to="/">Tyres</Link>
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
                      onError={(e) => {
                        e.target.src = `https://placehold.co/80x80/f0f0f0/999?text=${i + 1}`
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="detail__main-image">
                <img
                  src={images[selectedImage]}
                  alt={product.Brand}
                  onError={(e) => {
                    e.target.src = `https://placehold.co/700x700/f0f0f0/999?text=${encodeURIComponent(brandName)}`
                  }}
                />
              </div>
            </div>

            <div className="detail__info">
              <div className="detail__brand-logo">{brandName}</div>

              <h1 className="detail__title">{product.Brand}</h1>

              <StarRating rating={rating} reviewCount={reviewCount} />

              <ul className="detail__highlights">
                <li>Wide range of vehicle compatibility</li>
                <li>Multiple size options available</li>
                {features.length > 0 && <li>{features[0]}</li>}
                {compatibleVehicles.length > 0 && (
                  <li>Fits: {compatibleVehicles.slice(0, 3).join(', ')}</li>
                )}
              </ul>

              <div className="detail__price-section">
                <span className="detail__price">₹{product.Price}</span>
                <span className="detail__part-no">SKU: {product.id}</span>
              </div>

              <p className="detail__price-total">
                <strong>Price for {quantity} tyres: ₹{totalPrice}</strong>
              </p>

              <div className="detail__stock">
                <span className="detail__stock-dot" />
                Available - Ships within 2 working days
              </div>

              <div className="detail__options">
                <h3 className="detail__options-title">Compatible Vehicles</h3>
                <div className="detail__vehicle-tags">
                  {compatibleVehicles.slice(0, 6).map((vehicle) => (
                    <span key={vehicle} className="detail__vehicle-tag">{vehicle}</span>
                  ))}
                </div>
              </div>

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
                  <p className="detail__desc-text">{product['Product Description']}</p>
                ) : (
                  <p className="detail__desc-text detail__desc-text--empty">No description available for this product.</p>
                )}

                {compatibleVehicles.length > 0 && (
                  <>
                    <h3 className="detail__desc-heading">Compatible Vehicles:</h3>
                    <div className="detail__compat-grid">
                      {compatibleVehicles.map((vehicle) => (
                        <span key={vehicle} className="detail__compat-item">{vehicle}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="detail__desc-card">
                {features.length > 0 ? (
                  <>
                    <h3 className="detail__desc-heading">Key Features:</h3>
                    <ul className="detail__features-list">
                      {features.filter(Boolean).map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  </>
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
                        {['Great tyre for daily use', 'Excellent grip and comfort', 'Good value for money', 'Very satisfied with purchase', 'Highly recommended'][i % 5]}
                      </p>
                      <p className="detail__review-body">
                        {['Fitted these to my car and the difference is noticeable. Smooth ride and good grip in both wet and dry conditions.',
                          'These tyres have transformed the handling of my vehicle. Very quiet on the highway and great cornering stability.',
                          'Excellent quality at a reasonable price point. Would definitely buy again when these need replacing.',
                          'Installation was straightforward and the tyres perform exactly as described. No complaints.',
                          'Been using these for a few months now and they wear evenly. Fuel economy has slightly improved too.'][i % 5]}
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
