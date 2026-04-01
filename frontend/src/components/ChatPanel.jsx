import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { sendMessage, resetSession } from '../services/chatApi'
import { useStore } from '../context/StoreContext'
import tyreData from '../data/tyre_dataset_with_id.json'
import StarRating from './StarRating'
import './ChatPanel.css'

function generateSessionId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const SUGGESTIONS = [
  'I need durable tyres for my Maruti Swift under \u20b95000',
  'Best all-season tyres for a Honda City around \u20b98000',
  'Budget-friendly tyres for Hyundai i20 with good wet grip',
]

function badgeFor(data) {
  if (data.is_chitchat) return 'chat'
  if (data.needs_clarification) return 'collect'
  if (data.is_final_answer) return 'answer'
  return null
}

const BADGE_LABELS = {
  chat: 'Chatting',
  collect: 'Gathering Details',
  answer: 'Tyre Recommendations',
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(generateSessionId)
  const [recsModalIds, setRecsModalIds] = useState(null)

  const {
    activeFilters,
    updateHighlightedProducts,
    clearHighlightedProducts,
    currentProduct,
    onFilterChange,
  } = useStore()

  const messagesEnd = useRef(null)
  const inputRef = useRef(null)
  const activeFiltersRef = useRef(activeFilters)
  activeFiltersRef.current = activeFilters

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    return onFilterChange((_filters, label) => {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: label },
      ])
      setOpen(true)
    })
  }, [onFilterChange])

  const currentProductRef = useRef(currentProduct)
  currentProductRef.current = currentProduct

  const send = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim()
      if (!trimmed || loading) return

      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
      setLoading(true)

      try {
        const filters = activeFiltersRef.current
        const hasFilters =
          filters.brands.length > 0 ||
          filters.priceRange[0] > 0 ||
          filters.priceRange[1] < 50000
        const data = await sendMessage(
          sessionId,
          trimmed,
          hasFilters ? filters : null,
          currentProductRef.current,
        )
        const badge = badgeFor(data)
        const recommendedIds =
          data.is_final_answer && data.recommended_product_ids?.length
            ? data.recommended_product_ids
            : null
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response, badge, recommendedIds },
        ])
        if (recommendedIds) {
          updateHighlightedProducts(recommendedIds)
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'error', content: err.message },
        ])
      } finally {
        setLoading(false)
      }
    },
    [input, loading, sessionId, updateHighlightedProducts],
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const handleViewRecommendations = useCallback((ids) => {
    setRecsModalIds(ids)
  }, [])

  const recsProducts = useMemo(() => {
    if (!recsModalIds) return []
    const idSet = new Set(recsModalIds)
    return tyreData.filter((p) => idSet.has(p.id))
  }, [recsModalIds])

  const handleReset = async () => {
    try {
      await resetSession(sessionId)
    } catch {
      /* best-effort */
    }
    setMessages([])
    setSessionId(generateSessionId())
    clearHighlightedProducts()
  }

  return (
    <>
      {/* Floating action button */}
      <button
        className={`chat-toggle ${open ? 'chat-toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {/* Backdrop */}
      <div
        className={`chat-backdrop ${open ? 'chat-backdrop--visible' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Side panel */}
      <aside className={`chat-panel ${open ? 'chat-panel--open' : ''}`}>
        {/* Header */}
        <div className="chat-panel__header">
          <div className="chat-panel__header-left">
            <div className="chat-panel__header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <div className="chat-panel__title">Tyre Finder AI</div>
              <div className="chat-panel__subtitle">Ask about car tyres</div>
            </div>
          </div>
          <div className="chat-panel__header-actions">
            <button
              className="chat-panel__header-btn"
              onClick={handleReset}
              title="Reset conversation"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              className="chat-panel__header-btn"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-panel__messages">
          {messages.length === 0 && !loading && (
            <div className="chat-panel__welcome">
              <div className="chat-panel__welcome-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <h3>Hi there!</h3>
              <p>
                I can help you find the perfect car tyres based on your vehicle,
                preferences, and budget. Try one of these:
              </p>
              <div className="chat-panel__suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="chat-panel__suggestion"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === 'error') {
              return (
                <div key={i} className="chat-panel__error">
                  {msg.content}
                </div>
              )
            }

            if (msg.role === 'system') {
              return (
                <div key={i} className="chat-panel__system">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  {msg.content}
                </div>
              )
            }

            return (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                <div className="chat-msg__avatar">
                  {msg.role === 'user' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  )}
                </div>
                <div className="chat-msg__bubble">
                  {msg.badge && BADGE_LABELS[msg.badge] && (
                    <div className={`chat-msg__badge chat-msg__badge--${msg.badge}`}>
                      {BADGE_LABELS[msg.badge]}
                    </div>
                  )}
                  {msg.content}
                  {msg.recommendedIds && (
                    <button
                      className="chat-msg__view-recs"
                      onClick={() => handleViewRecommendations(msg.recommendedIds)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      View {msg.recommendedIds.length} recommended tyres
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="chat-typing">
              <div className="chat-msg__avatar" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="chat-typing__dots">
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
                <span className="chat-typing__dot" />
              </div>
            </div>
          )}

          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="chat-panel__input-area">
          <div className="chat-panel__input-row">
            <textarea
              ref={inputRef}
              className="chat-panel__input"
              rows={1}
              placeholder="Ask about car tyres..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="chat-panel__send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Recommendations popup modal */}
      {recsModalIds && (
        <div className="recs-modal-overlay" onClick={() => setRecsModalIds(null)}>
          <div className="recs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="recs-modal__header">
              <div className="recs-modal__header-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>AI Recommended Tyres ({recsProducts.length})</span>
              </div>
              <button
                className="recs-modal__close"
                onClick={() => setRecsModalIds(null)}
                aria-label="Close recommendations"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="recs-modal__body">
              {recsProducts.length === 0 ? (
                <p className="recs-modal__empty">No matching products found.</p>
              ) : (
                <div className="recs-modal__grid">
                  {recsProducts.map((product) => {
                    const brandLine = product.Brand.split(' ').slice(0, 2).join(' ')
                    const hash = product.id.charCodeAt(5) + product.id.charCodeAt(6)
                    const reviewCount = (hash % 8) + 1
                    const rating = (3.5 + (hash % 15) / 10).toFixed(1)

                    return (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        className="recs-card"
                        onClick={() => setRecsModalIds(null)}
                      >
                        <div className="recs-card__image-wrap">
                          <img
                            src={product.Image}
                            alt={product.Brand}
                            className="recs-card__image"
                            onError={(e) => {
                              e.target.src = `https://placehold.co/180x180/f0f0f0/999?text=${encodeURIComponent(brandLine)}`
                            }}
                          />
                          <span className="recs-card__ai-badge">AI Pick</span>
                        </div>
                        <div className="recs-card__info">
                          <span className="recs-card__brand">{brandLine}</span>
                          <h4 className="recs-card__title">{product.Brand}</h4>
                          {product['Compatible Vehicles'] && (
                            <p className="recs-card__compat">
                              Fits: {product['Compatible Vehicles'].split(',').slice(0, 2).join(', ')}
                            </p>
                          )}
                          <div className="recs-card__footer">
                            <span className="recs-card__price">₹{product.Price}</span>
                            <StarRating rating={parseFloat(rating)} reviewCount={reviewCount} />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
