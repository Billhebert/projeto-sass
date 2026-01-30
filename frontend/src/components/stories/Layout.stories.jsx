// src/components/stories/Layout.stories.jsx

import Layout from '../Layout'

export default {
  title: 'Components/Layout',
  component: Layout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export const Default = {
  args: {
    children: (
      <div style={{ padding: '20px' }}>
        <h1>Dashboard Content</h1>
        <p>This is the main content area of the application.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h3>Card {i}</h3>
              <p>Sample content for card {i}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
}

export const WithChart = {
  args: {
    children: (
      <div style={{ padding: '20px' }}>
        <h1>Analytics</h1>
        <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>Sample Chart Area</h3>
          <div style={{ height: '300px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Chart would render here
          </div>
        </div>
      </div>
    ),
  },
}

export const MobileLayout = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {
    children: (
      <div style={{ padding: '20px' }}>
        <h1>Mobile View</h1>
        <p>This layout is responsive and adapts to mobile screens.</p>
      </div>
    ),
  },
}

export const TabletLayout = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
  args: {
    children: (
      <div style={{ padding: '20px' }}>
        <h1>Tablet View</h1>
        <p>This layout is responsive and adapts to tablet screens.</p>
      </div>
    ),
  },
}
