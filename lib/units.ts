// Price is set directly per piece (400-450g). No kg conversion needed.
export const UNIT_LABEL = '400-450g'

/** Price per piece — already stored as per-piece price */
export function pricePerUnit(pricePerPiece: number): number {
  return pricePerPiece
}

/** Total price for N pieces */
export function totalPrice(pricePerPiece: number, units: number): number {
  return pricePerPiece * units
}

// Keep for any leftover references (no-op)
export const UNIT_KG = 1
