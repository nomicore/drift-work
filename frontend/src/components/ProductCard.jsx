import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import { proxyImageUrl } from '../utils/imageProxy'
import './ProductCard.css'

function formatUSD(value) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function ProductCard({ product, highlighted = false }) {
  const brandLine = product.Brand
  const titleLine = product.name || product.Brand

  const hash = Math.abs(product.id * 2654435761 | 0)
  const reviewCount = (hash % 8) + 1
  const rating = (3.5 + (hash % 15) / 10).toFixed(1)

  return (
    <Link
      to={`/product/${product.id}`}
      className={`product-card${highlighted ? ' product-card--highlighted' : ''}`}
    >
      <div className="product-card__image-wrap">
        <img
          src={proxyImageUrl(product.Image)}
          alt={titleLine}
          className="product-card__image"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = `https://placehold.co/220x220/1a1a2e/e67e22?text=${encodeURIComponent(product.wheel_size || brandLine)}&font=raleway`
          }}
        />
        <div className="product-card__badges">
          {highlighted && (
            <span className="product-card__badge product-card__badge--ai">
              AI Pick
            </span>
          )}
        </div>
      </div>

      <div className="product-card__info">
        <div className="product-card__brand-row">
          <span className="product-card__brand">{brandLine}</span>
          {product.wheel_size && <span className="product-card__spec">{product.wheel_size}</span>}
        </div>
        <h3 className="product-card__title">{titleLine}</h3>
        <div className="product-card__meta">
          {product.colour && <span className="product-card__meta-tag">{product.colour}</span>}
          {product.wheel_width && <span className="product-card__meta-tag">{product.wheel_width}</span>}
        </div>
        <div className="product-card__rating">
          <StarRating rating={parseFloat(rating)} reviewCount={reviewCount} />
        </div>
        <div className="product-card__bottom">
          <p className="product-card__price">{formatUSD(product.Price)}</p>
          <button
            className="product-card__cart-btn"
            onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
          >
            Add to cart
          </button>
        </div>
      </div>
    </Link>
  )
}

export default ProductCard
