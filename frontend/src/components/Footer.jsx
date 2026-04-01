import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__inner">
          <div className="footer__columns">

            <div className="footer__col footer__col--brand">
              <span className="footer__logo-text">
                <span className="footer__logo-drift">DRIFT</span>
                <span className="footer__logo-w">W</span>
                <span className="footer__logo-drift">ORKS</span>
              </span>
              <div className="footer__address">
                <p>Unit 1, Driftworks Ltd</p>
                <p>Trade City, Brent Terrace</p>
                <p>London, NW2 1LT</p>
              </div>
              <p className="footer__tel">Tel: 020 8450 4800</p>
            </div>

            <div className="footer__col">
              <h3 className="footer__col-title">Driftworks</h3>
              <ul className="footer__links">
                <li><a href="#" className="footer__link">About Us</a></li>
                <li><a href="#" className="footer__link">Workshop</a></li>
                <li><a href="#" className="footer__link">Blog</a></li>
                <li><a href="#" className="footer__link">Events</a></li>
                <li><a href="#" className="footer__link">Gallery</a></li>
                <li><a href="#" className="footer__link">Contact Us</a></li>
              </ul>
            </div>

            <div className="footer__col">
              <h3 className="footer__col-title">Customer Service</h3>
              <ul className="footer__links">
                <li><a href="#" className="footer__link">Delivery Information</a></li>
                <li><a href="#" className="footer__link">Returns Policy</a></li>
                <li><a href="#" className="footer__link">Track My Order</a></li>
                <li><a href="#" className="footer__link">Size Guides</a></li>
                <li><a href="#" className="footer__link">FAQs</a></li>
                <li><a href="#" className="footer__link">Wheel Fitment Help</a></li>
              </ul>
            </div>

            <div className="footer__col">
              <h3 className="footer__col-title">Contact Us</h3>
              <div className="footer__contact">
                <p><strong>Phone:</strong> 020 8450 4800</p>
                <p><strong>Email:</strong> sales@driftworks.com</p>
                <div className="footer__hours">
                  <p><strong>Hours:</strong></p>
                  <p>Mon–Fri: 9am – 5pm</p>
                  <p>Sat: 10am – 3pm</p>
                  <p>Sun: Closed</p>
                </div>
                <a href="#" className="footer__contact-form">Contact Form →</a>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="footer__bar">
        <div className="footer__bar-inner">
          <span className="footer__copyright">
            © 2024 Driftworks Ltd. All rights reserved. Company No. 05634321
          </span>
          <div className="footer__social">
            <a href="#" className="footer__social-link" aria-label="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="#" className="footer__social-link" aria-label="YouTube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.43z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#1a1a1a"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
