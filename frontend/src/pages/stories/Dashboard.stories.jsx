// src/pages/stories/Dashboard.stories.jsx

import Dashboard from '../Dashboard'
import { BrowserRouter } from 'react-router-dom'

export default {
  title: 'Pages/Dashboard',
  component: Dashboard,
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
