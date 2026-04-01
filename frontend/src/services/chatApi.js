const API_BASE = 'http://localhost:8000'

export async function sendMessage(sessionId, message, filters = null, productContext = null) {
  const payload = { session_id: sessionId, message }

  if (filters) {
    payload.filters = {
      brands: filters.brands || [],
      price_min: filters.priceRange?.[0] ?? null,
      price_max: filters.priceRange?.[1] ?? null,
    }
  }

  if (productContext) {
    payload.product_context = {
      id: productContext.id,
      brand: productContext.brand,
      price: productContext.price,
      compatible_vehicles: productContext.compatible_vehicles,
      product_description: productContext.product_description,
      features_benefits: productContext.features_benefits,
    }
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Backend error (${res.status}): ${text}`)
  }

  return res.json()
}

export async function resetSession(sessionId) {
  const res = await fetch(`${API_BASE}/reset/${sessionId}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Reset failed (${res.status}): ${text}`)
  }

  return res.json()
}
