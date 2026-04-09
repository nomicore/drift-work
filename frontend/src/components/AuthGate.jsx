import { useState, useEffect } from 'react'
import './AuthGate.css'

async function checkAuth() {
  const res = await fetch('/auth/check', { credentials: 'include' })
  if (!res.ok) return false
  const data = await res.json()
  return data.authenticated === true
}

async function login(passphrase) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ passphrase }),
  })
  return res.ok
}

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking') // checking | locked | unlocked
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth().then((ok) => setStatus(ok ? 'unlocked' : 'locked'))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!passphrase.trim() || loading) return
    setLoading(true)
    setError('')
    const ok = await login(passphrase.trim())
    if (ok) {
      setStatus('unlocked')
    } else {
      setError('Incorrect passphrase. Please try again.')
    }
    setLoading(false)
  }

  if (status === 'checking') {
    return (
      <div className="auth-gate auth-gate--checking">
        <div className="auth-gate__spinner" />
      </div>
    )
  }

  if (status === 'unlocked') return children

  return (
    <>
      {children}
      <div className="auth-gate">
        <div className="auth-gate__card">
          <div className="auth-gate__logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h1 className="auth-gate__title">Driftworks</h1>
          <p className="auth-gate__subtitle">Enter the passphrase to continue</p>
          <form className="auth-gate__form" onSubmit={handleSubmit}>
            <input
              className={`auth-gate__input ${error ? 'auth-gate__input--error' : ''}`}
              type="password"
              placeholder="Passphrase"
              value={passphrase}
              onChange={(e) => { setPassphrase(e.target.value); setError('') }}
              autoFocus
              autoComplete="current-password"
            />
            {error && <p className="auth-gate__error">{error}</p>}
            <button className="auth-gate__btn" type="submit" disabled={loading || !passphrase.trim()}>
              {loading ? <span className="auth-gate__btn-spinner" /> : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
