// src/components/stories/Modal.stories.jsx

import Modal from '../Modal'

export default {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export const Open = {
  args: {
    open: true,
    title: 'Create New Item',
    onClose: () => console.log('Modal closed'),
    children: (
      <div style={{ padding: '20px' }}>
        <p>This is modal content. You can add forms, lists, or any content here.</p>
      </div>
    ),
  },
}

export const Closed = {
  args: {
    open: false,
    title: 'Create New Item',
    onClose: () => console.log('Modal closed'),
    children: <div>This content is hidden because modal is closed</div>,
  },
}

export const WithForm = {
  args: {
    open: true,
    title: 'User Information',
    onClose: () => console.log('Modal closed'),
    children: (
      <form style={{ padding: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label>
            Name:
            <input
              type="text"
              placeholder="Enter name"
              style={{ display: 'block', marginTop: '5px', padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>
            Email:
            <input
              type="email"
              placeholder="Enter email"
              style={{ display: 'block', marginTop: '5px', padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
        </div>
        <button
          type="submit"
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Submit
        </button>
      </form>
    ),
  },
}

export const LongContent = {
  args: {
    open: true,
    title: 'Long Content Modal',
    onClose: () => console.log('Modal closed'),
    children: (
      <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ marginBottom: '15px' }}>
            <h4>Section {i}</h4>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna
              aliqua.
            </p>
          </div>
        ))}
      </div>
    ),
  },
}
