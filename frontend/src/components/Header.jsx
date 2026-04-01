import { Link } from 'react-router-dom'
import './Header.css'

const NAV_ITEMS = [
  'Wheels', 'Suspension', 'Interior', 'Lighting', 'Drivetrain', 'Merchandise', 'Clearance'
]

function Header() {
  return (
    <header className="header">
      <div className="header__top">
        <div className="header__inner">
          <Link to="/" className="header__logo">
            <span className="header__logo-text"><span className="header__logo-drift">DRIFT</span><span className="header__logo-w">W</span><span className="header__logo-drift">ORKS</span></span>
          </Link>

          <div className="header__search">
            <input
              type="text"
              placeholder="Search for products..."
              className="header__search-input"
            />
            <button className="header__search-btn" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>

          <div className="header__actions">
            <button className="header__action-btn" aria-label="Account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="header__action-label">Account</span>
            </button>
            <button className="header__action-btn" aria-label="Cart">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
              </svg>
              <span className="header__action-label">Cart</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="header__nav">
        <div className="header__nav-inner">
          <span className="header__nav-sale">AIR LIFT SALE</span>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item}
              to="/"
              className={`header__nav-link ${item === 'Wheels' ? 'header__nav-link--active' : ''}`}
            >
              {item.toUpperCase()}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
