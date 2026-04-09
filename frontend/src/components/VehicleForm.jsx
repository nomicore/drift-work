import { useState, useRef } from 'react'
import { VEHICLE_DATA, MAKES, COLOURS, getModelData } from '../data/vehicleData'
import { analyzeVehicleImage } from '../services/chatApi'
import './VehicleForm.css'

export default function VehicleForm({ onSubmit }) {
  const [tab, setTab] = useState('form')

  // Form fields
  const [make, setMake]     = useState('')
  const [model, setModel]   = useState('')
  const [year, setYear]     = useState('')
  const [colour, setColour] = useState('')

  // Photo tab
  const [isDragging, setIsDragging]   = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [analyzing, setAnalyzing]     = useState(false)
  const [aiSummary, setAiSummary]     = useState(null)
  const [photoError, setPhotoError]   = useState(null)

  const fileInputRef = useRef(null)

  const availableModels = make ? Object.keys(VEHICLE_DATA[make] || {}).sort() : []
  const modelData       = make && model ? getModelData(make, model) : null
  const availableYears  = modelData?.years ?? []
  const canSubmit = make && model && year

  function handleMakeChange(val) {
    setMake(val)
    setModel('')
    setYear('')
  }

  function handleModelChange(val) {
    setModel(val)
    setYear('')
  }

  function handleSubmit() {
    if (!canSubmit) return
    const data = getModelData(make, model)
    onSubmit({
      make,
      model,
      year,
      colour,
      wheelSize: data?.wheelSize ?? '',
      wheelWidth: data?.wheelWidth ?? '',
    })
  }

  async function processFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.')
      return
    }
    setPhotoError(null)
    setAiSummary(null)
    setAnalyzing(true)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target.result
      setPhotoPreview(dataUrl)

      try {
        const base64 = dataUrl.split(',')[1]
        const result = await analyzeVehicleImage(base64, file.type)

        setAiSummary(result.summary)

        // Try to pre-fill dropdowns from AI result
        const detectedMake = MAKES.find(
          (m) => m.toLowerCase() === (result.make || '').toLowerCase()
        )
        if (detectedMake) {
          setMake(detectedMake)
          const models = Object.keys(VEHICLE_DATA[detectedMake])
          const detectedModel = models.find(
            (m) => m.toLowerCase() === (result.model || '').toLowerCase()
          )
          if (detectedModel) {
            setModel(detectedModel)
            const modelEntry = VEHICLE_DATA[detectedMake][detectedModel]
            const years = modelEntry?.years ?? []
            const detectedYear = years.find((y) => String(y) === String(result.year))
            if (detectedYear) setYear(String(detectedYear))
          }
        }
        const detectedColour = COLOURS.find(
          (c) => c.toLowerCase() === (result.colour || '').toLowerCase()
        )
        if (detectedColour) setColour(detectedColour)

        // Switch to form tab so user can confirm / fill any gaps
        setTab('form')
      } catch {
        setPhotoError('Could not analyse the image. Please enter details manually.')
        setTab('form')
      } finally {
        setAnalyzing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  function resetPhoto() {
    setPhotoPreview(null)
    setAiSummary(null)
    setPhotoError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="vf">
      {/* Tabs */}
      <div className="vf__tabs">
        <button
          className={`vf__tab ${tab === 'form' ? 'vf__tab--active' : ''}`}
          onClick={() => setTab('form')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Enter details
        </button>
        <button
          className={`vf__tab ${tab === 'photo' ? 'vf__tab--active' : ''}`}
          onClick={() => setTab('photo')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Upload photo
        </button>
      </div>

      {/* AI photo analysis banner */}
      {aiSummary && tab === 'form' && (
        <div className="vf__ai-banner">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {aiSummary}
        </div>
      )}

      {/* ── Form tab ── */}
      {tab === 'form' && (
        <div className="vf__fields">
          <div className="vf__row">
            <div className="vf__field">
              <label className="vf__label">Make</label>
              <select
                className="vf__select"
                value={make}
                onChange={(e) => handleMakeChange(e.target.value)}
              >
                <option value="">Select make</option>
                {MAKES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="vf__field">
              <label className="vf__label">Model</label>
              <select
                className="vf__select"
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                disabled={!make}
              >
                <option value="">Select model</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="vf__row">
            <div className="vf__field">
              <label className="vf__label">Year</label>
              <select
                className="vf__select"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={!model}
              >
                <option value="">Select year</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="vf__field">
              <label className="vf__label">Colour <span style={{fontWeight:400,opacity:0.6}}>(optional)</span></label>
              <select
                className="vf__select"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
              >
                <option value="">Any colour</option>
                {COLOURS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="vf__submit"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            Find my wheels
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Photo tab ── */}
      {tab === 'photo' && (
        <div className="vf__photo-area">
          {!photoPreview ? (
            <div
              className={`vf__dropzone ${isDragging ? 'vf__dropzone--dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p>Drop your car photo here</p>
              <span>or click to browse</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="vf__preview">
              <div className="vf__preview-img-wrap">
                <img src={photoPreview} alt="Your vehicle" className="vf__preview-img" />
                {analyzing && (
                  <div className="vf__overlay">
                    <div className="vf__spinner" />
                    <span>Analysing photo…</span>
                  </div>
                )}
              </div>
              {!analyzing && (
                <>
                  <button className="vf__reset-photo" onClick={resetPhoto}>
                    Use a different photo
                  </button>
                  {photoError ? (
                    <p className="vf__photo-error">{photoError}</p>
                  ) : (
                    <p className="vf__photo-hint">
                      Switching to the form — review and confirm your details.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
