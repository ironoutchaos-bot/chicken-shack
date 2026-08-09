export type PieceSize = 'Small' | 'Medium' | 'Large'

export function getPieceSizeOptions(productName: string): PieceSize[] {
  const name = productName.toLowerCase()
  if (name.includes('curry cut')) return ['Small', 'Medium']
  if (name.includes('biriyani cut') || name.includes('biryani cut') || name.includes('briyani cut')) return ['Medium', 'Large']
  return []
}
