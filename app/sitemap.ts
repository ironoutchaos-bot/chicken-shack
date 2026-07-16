import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.blurufresh.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      images: ['https://www.blurufresh.com/assets/raw_chicken_breast.jpg'],
    },
    {
      url: 'https://www.blurufresh.com/legal/privacy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: 'https://www.blurufresh.com/legal/terms',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: 'https://www.blurufresh.com/legal/refund',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
