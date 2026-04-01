import { Link } from 'react-router-dom'
import StarRating from './StarRating'
import './ProductCard.css'

function ProductCard({ product, highlighted = false }) {
  const brandLine = product.Brand.split(' ').slice(0, 2).join(' ')
  const titleLine = product.Brand

  const hash = product.id.charCodeAt(5) + product.id.charCodeAt(6)
  const reviewCount = (hash % 8) + 1
  const rating = (3.5 + (hash % 15) / 10).toFixed(1)

  const sizeMatch = product.Brand.match(/(\d+x\d+(?:\.\d+)?)/i)
  const sizeSpec = sizeMatch ? sizeMatch[1] : null

  return (
    <Link
      to={`/product/${product.id}`}
      className={`product-card${highlighted ? ' product-card--highlighted' : ''}`}
    >
      <div className="product-card__image-wrap">
        <img
          src={product.Image}
          alt={product.Brand}
          className="product-card__image"
          onError={(e) => {
            e.target.src = `https://placehold.co/220x220/f0f0f0/999?text=${encodeURIComponent(brandLine)}`
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
          {sizeSpec && <span className="product-card__spec">{sizeSpec}</span>}
        </div>
        <h3 className="product-card__title">{titleLine}</h3>
        <div className="product-card__rating">
          <StarRating rating={parseFloat(rating)} reviewCount={reviewCount} />
        </div>
        <div className="product-card__bottom">
          <p className="product-card__price">₹{product.Price}</p>
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
