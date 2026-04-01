import './Banner.css'

const BANNER_ITEMS = [
  { icon: 'truck', title: 'Over 2 Million Products', subtitle: 'Shipped across Europe' },
  { icon: 'star', title: '5* UK Customer Service', subtitle: 'Unrivalled technical advice' },
  { icon: 'clock', title: '20+ Years Online', subtitle: 'Tried, tested, trusted' },
  { icon: 'apple', title: 'Apple Pay Accepted', subtitle: 'The quickest way to pay' },
]

const ICONS = {
  truck: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  star: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  clock: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  apple: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
}

function Banner() {
  return (
    <div className="banner">
      <div className="banner__inner">
        {BANNER_ITEMS.map((item) => (
          <div key={item.title} className="banner__item">
            <span className="banner__icon">{ICONS[item.icon]}</span>
            <div className="banner__text">
              <span className="banner__title">{item.title}</span>
              <span className="banner__subtitle">{item.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Banner
