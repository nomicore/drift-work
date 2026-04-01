import './StarRating.css'

function StarRating({ rating = 5, reviewCount = 0 }) {
  const stars = []
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars.push('full')
    } else if (i - rating < 1 && i - rating > 0) {
      stars.push('half')
    } else {
      stars.push('empty')
    }
  }

  return (
    <div className="star-rating">
      <div className="star-rating__stars">
        {stars.map((type, i) => (
          <svg key={i} className={`star-rating__star star-rating__star--${type}`} width="16" height="16" viewBox="0 0 24 24">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      {reviewCount > 0 && (
        <span className="star-rating__count">({reviewCount} Reviews)</span>
      )}
    </div>
  )
}

export default StarRating
