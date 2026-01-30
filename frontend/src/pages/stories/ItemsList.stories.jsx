// src/pages/stories/ItemsList.stories.jsx

import ItemsList from '../ItemsList'
import { BrowserRouter } from 'react-router-dom'

export default {
  title: 'Pages/ItemsList',
  component: ItemsList,
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export const Default = {
  args: {},
}

export const Mobile = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {},
}

export const Tablet = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
  args: {},
}
