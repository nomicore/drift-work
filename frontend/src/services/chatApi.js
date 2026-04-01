const API_BASE = 'http://localhost:8000'

export async function sendMessage(sessionId, message, filters = null, productContext = null) {
  const payload = { session_id: sessionId, message }

  if (filters) {
    payload.filters = {
      brands: filters.brands || [],
      price_min: filters.priceRange?.[0] ?? null,
      price_max: filters.priceRange?.[1] ?? null,
      sizes: filters.sizes || [],
      widths: filters.widths || [],
      colours: filters.colours || [],
    }
  }

  if (productContext) {
    payload.product_context = {
      id: String(productContext.id),
      brand: String(productContext.brand || ''),
      name: String(productContext.name || ''),
      price: String(productContext.price ?? ''),
      compatible_vehicles: String(productContext.compatible_vehicles || ''),
      product_description: String(productContext.product_description || ''),
      features_benefits: String(productContext.features_benefits || ''),
      wheel_size: String(productContext.wheel_size || ''),
      wheel_width: String(productContext.wheel_width || ''),
      colour: String(productContext.colour || ''),
      wheel_style: String(productContext.wheel_style || ''),
      wheel_model_name: String(productContext.wheel_model_name || ''),
      wheel_stud_pattern_pcd: String(productContext.wheel_stud_pattern_pcd || ''),
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
