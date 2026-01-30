// src/components/stories/Toast.stories.jsx

import Toast from '../Toast'

export default {
  title: 'Components/Toast',
  component: Toast,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export const Success = {
  args: {
    message: 'Operation completed successfully!',
    type: 'success',
    onClose: () => console.log('Toast closed'),
  },
}

export const Error = {
  args: {
    message: 'An error occurred. Please try again.',
    type: 'error',
    onClose: () => console.log('Toast closed'),
  },
}

export const Warning = {
  args: {
    message: 'Please review before proceeding.',
    type: 'warning',
    onClose: () => console.log('Toast closed'),
  },
}

export const Info = {
  args: {
    message: 'Here is some useful information for you.',
    type: 'info',
    onClose: () => console.log('Toast closed'),
  },
}

export const LongMessage = {
  args: {
    message:
      'This is a longer message that spans multiple lines. It provides more detailed information about what happened and what the user should do next. The toast will automatically dismiss after a few seconds.',
    type: 'info',
    onClose: () => console.log('Toast closed'),
  },
}
