// src/components/stories/CacheManager.stories.jsx

import CacheManager from '../CacheManager'

export default {
  title: 'Components/CacheManager',
  component: CacheManager,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export const Default = {
  args: {},
}

export const WithCacheData = {
  decorators: [
    (Story) => {
      // Mock localStorage with some cache data
      const mockCache = {
        'items-list-{"offset":0,"limit":20}': JSON.stringify({
          data: [
            { id: 1, name: 'Product 1' },
            { id: 2, name: 'Product 2' },
          ],
          timestamp: Date.now(),
          ttl: 300000,
        }),
        'orders-list-{}': JSON.stringify({
          data: [{ id: 1, status: 'pending' }],
          timestamp: Date.now(),
          ttl: 300000,
        }),
      }

      Object.entries(mockCache).forEach(([key, value]) => {
        localStorage.setItem(key, value)
      })

      return <Story />
    },
  ],
}

export const CacheManagerButton = {
  args: {},
}
