import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { sendMessage, resetSession } from '../services/chatApi'
import { useStore } from '../context/StoreContext'
import { proxyImageUrl } from '../utils/imageProxy'
import rawData from '../data/tyre_dataset_with_id.json'
import StarRating from './StarRating'
import './ChatPanel.css'

const tyreData = rawData.data

function generateSessionId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatUSD(value) {
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const SUGGESTIONS = [
  'I need 18" black alloy wheels under $300',
  'Best 20" wheels for off-road use',
  'Show me lightweight 17" wheels in silver',
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
  answer: 'Wheel Recommendations',
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(generateSessionId)

  const { updateHighlightedProducts, clearHighlightedProducts, currentProduct } = useStore()

  const messagesEnd = useRef(null)
  const inputRef = useRef(null)
  const currentProductRef = useRef(currentProduct)
  currentProductRef.current = currentProduct

  const scrollToBottom = useCallback(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const send = useCallback(
    async (text) => {
      const trimmed = (text ?? input).trim()
      if (!trimmed || loading) return

      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
      setLoading(true)

      try {
        const data = await sendMessage(
          sessionId,
          trimmed,
          null,
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

      <div
        className={`chat-backdrop ${open ? 'chat-backdrop--visible' : ''}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`chat-panel ${open ? 'chat-panel--open' : ''}`}>
        <div className="chat-panel__header">
          <div className="chat-panel__header-left">
            <div className="chat-panel__header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <div>
              <div className="chat-panel__title">Wheel Finder AI</div>
              <div className="chat-panel__subtitle">Ask about alloy wheels</div>
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
                I can help you find the perfect alloy wheels based on your vehicle,
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

            const hasCarousel = msg.role === 'assistant' && msg.recommendedIds?.length > 0
            const carouselProducts = hasCarousel
              ? (() => {
                  const idSet = new Set(msg.recommendedIds.map(String))
                  return tyreData.filter((p) => idSet.has(String(p.id)))
                })()
              : []

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

                {hasCarousel ? (
                  <div className="chat-msg__column">
                    <div className="chat-msg__bubble">
                      {msg.badge && BADGE_LABELS[msg.badge] && (
                        <div className={`chat-msg__badge chat-msg__badge--${msg.badge}`}>
                          {BADGE_LABELS[msg.badge]}
                        </div>
                      )}
                      {msg.content}
                    </div>
                    <div className="chat-carousel">
                      {carouselProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${product.id}`}
                          className="chat-carousel__card"
                          onClick={() => setOpen(false)}
                        >
                          <div className="chat-carousel__img-wrap">
                            <img
                              src={proxyImageUrl(product.Image)}
                              alt={product.name || product.Brand}
                              className="chat-carousel__img"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.target.onerror = null
                                e.target.src = `https://placehold.co/160x160/1a1a2e/e67e22?text=${encodeURIComponent(product.wheel_size || product.Brand)}&font=raleway`
                              }}
                            />
                            <span className="chat-carousel__ai-badge">AI Pick</span>
                          </div>
                          <div className="chat-carousel__body">
                            <span className="chat-carousel__brand">{product.Brand}</span>
                            <p className="chat-carousel__title">{product.name || product.Brand}</p>
                            {product.wheel_size && (
                              <p className="chat-carousel__spec">
                                {product.wheel_size}{product.colour ? ` · ${product.colour}` : ''}
                              </p>
                            )}
                            <p className="chat-carousel__price">{formatUSD(product.Price)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="chat-msg__bubble">
                    {msg.badge && BADGE_LABELS[msg.badge] && (
                      <div className={`chat-msg__badge chat-msg__badge--${msg.badge}`}>
                        {BADGE_LABELS[msg.badge]}
                      </div>
                    )}
                    {msg.content}
                  </div>
                )}
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

        <div className="chat-panel__input-area">
          <div className="chat-panel__input-row">
            <textarea
              ref={inputRef}
              className="chat-panel__input"
              rows={1}
              placeholder="Ask about alloy wheels..."
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
    </>
  )
}
