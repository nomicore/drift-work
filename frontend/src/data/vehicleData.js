// Hard-coded vehicle catalogue for the POC.
// 10 popular makes, ~6 models each, years from first available through 2026.
//
// wheelSize / wheelWidth are mapped to combos that are actually stocked in our catalogue:
//   17" × 9.0"  → 17 products  (compact / off-road)
//   18" × 9.0"  → 30 products  (mid-size)
//   20" × 9.0"  → 57 products  (large / SUV / performance)  ← most stocked
//   20" × 9.5"  →  4 products  (AMG GT)
//   20" × 10.0" → 15 products  (supercar)
//   22" × 10.0" →  7 products  (RS6 / wide-body)
//   16" × 8.0"  →  4 products  (city car)

export const VEHICLE_DATA = {
  Audi: {
    A3:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    A4:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    A6:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Q5:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Q7:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    RS6:          { years: [2020,2021,2022,2023,2024,2025,2026],           wheelSize: '22"', wheelWidth: '10.0"' },
  },
  BMW: {
    '1 Series':   { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    '3 Series':   { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    '5 Series':   { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    X3:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    X5:           { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    M3:           { years: [2021,2022,2023,2024,2025,2026],                wheelSize: '20"', wheelWidth: '9.0"' },
  },
  Ford: {
    Explorer:     { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    'F-150':      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Fiesta:       { years: [2018,2019,2020,2021,2022],                     wheelSize: '17"', wheelWidth: '9.0"' },
    Focus:        { years: [2018,2019,2020,2021,2022,2023],                wheelSize: '17"', wheelWidth: '9.0"' },
    Mustang:      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Puma:         { years: [2020,2021,2022,2023,2024,2025,2026],           wheelSize: '18"', wheelWidth: '9.0"' },
  },
  Honda: {
    Accord:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Civic:        { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    'CR-V':       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    'HR-V':       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    Jazz:         { years: [2018,2019,2020,2021,2022,2023,2024,2025],      wheelSize: '17"', wheelWidth: '9.0"' },
    NSX:          { years: [2018,2019,2020,2021,2022],                     wheelSize: '20"', wheelWidth: '10.0"' },
  },
  Hyundai: {
    Elantra:      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    i20:          { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    i30:          { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    'IONIQ 5':    { years: [2022,2023,2024,2025,2026],                     wheelSize: '20"', wheelWidth: '9.0"' },
    'Santa Fe':   { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Tucson:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
  },
  Jeep: {
    Cherokee:       { years: [2018,2019,2020,2021,2022,2023],                wheelSize: '17"', wheelWidth: '9.0"' },
    Compass:        { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    Gladiator:      { years: [2020,2021,2022,2023,2024,2025,2026],           wheelSize: '17"', wheelWidth: '9.0"' },
    'Grand Cherokee': { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Renegade:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    Wrangler:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
  },
  Kia: {
    Ceed:         { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    EV6:          { years: [2022,2023,2024,2025,2026],                     wheelSize: '20"', wheelWidth: '9.0"' },
    Picanto:      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '16"', wheelWidth: '8.0"' },
    Sorento:      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    Sportage:     { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Stinger:      { years: [2018,2019,2020,2021,2022,2023],                wheelSize: '20"', wheelWidth: '9.0"' },
  },
  'Mercedes-Benz': {
    'A-Class':    { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    'AMG GT':     { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.5"' },
    'C-Class':    { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    'E-Class':    { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    GLC:          { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    GLE:          { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
  },
  Toyota: {
    Camry:        { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Corolla:      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    GR86:         { years: [2022,2023,2024,2025,2026],                     wheelSize: '18"', wheelWidth: '9.0"' },
    'Land Cruiser': { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '20"', wheelWidth: '9.0"' },
    RAV4:         { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Supra:        { years: [2020,2021,2022,2023,2024,2025,2026],           wheelSize: '20"', wheelWidth: '9.0"' },
  },
  Volkswagen: {
    Golf:         { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    'ID.4':       { years: [2021,2022,2023,2024,2025,2026],                wheelSize: '20"', wheelWidth: '9.0"' },
    Passat:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Polo:         { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '17"', wheelWidth: '9.0"' },
    'T-Roc':      { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
    Tiguan:       { years: [2018,2019,2020,2021,2022,2023,2024,2025,2026], wheelSize: '18"', wheelWidth: '9.0"' },
  },
}

export const MAKES = Object.keys(VEHICLE_DATA).sort()

// Returns { years, wheelSize, wheelWidth } for a given make+model
export function getModelData(make, model) {
  return VEHICLE_DATA[make]?.[model] ?? null
}

export const COLOURS = [
  'Black', 'White', 'Silver', 'Grey',
  'Blue', 'Red', 'Green', 'Orange', 'Yellow', 'Bronze',
]
