// src/pages/stories/OrdersList.stories.jsx

import OrdersList from '../OrdersList'
import { BrowserRouter } from 'react-router-dom'

export default {
  title: 'Pages/OrdersList',
  component: OrdersList,
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

export const WithFilters = {
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
