// src/pages/stories/Analytics.stories.jsx

import Analytics from '../Analytics'
import { BrowserRouter } from 'react-router-dom'

export default {
  title: 'Pages/Analytics',
  component: Analytics,
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

export const SevenDays = {
  args: {},
}

export const ThirtyDays = {
  args: {},
}

export const NinetyDays = {
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
