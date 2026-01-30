// src/components/stories/Form.stories.jsx

import Form from '../Form'

export default {
  title: 'Components/Form',
  component: Form,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

const basicFields = [
  {
    name: 'name',
    label: 'Name',
    type: 'text',
    required: true,
    placeholder: 'Enter name',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'Enter email',
  },
  {
    name: 'message',
    label: 'Message',
    type: 'textarea',
    required: false,
    placeholder: 'Enter your message',
  },
]

const productFields = [
  {
    name: 'title',
    label: 'Product Title',
    type: 'text',
    required: true,
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    required: false,
  },
  {
    name: 'price',
    label: 'Price',
    type: 'number',
    required: true,
  },
  {
    name: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
  },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    required: true,
    options: [
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'books', label: 'Books' },
    ],
  },
]

export const BasicForm = {
  args: {
    fields: basicFields,
    onSubmit: (data) => console.log('Form submitted:', data),
    submitLabel: 'Submit',
  },
}

export const ProductForm = {
  args: {
    fields: productFields,
    onSubmit: (data) => console.log('Product created:', data),
    submitLabel: 'Create Product',
  },
}

export const WithInitialValues = {
  args: {
    fields: basicFields,
    initialValues: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    onSubmit: (data) => console.log('Form submitted:', data),
    submitLabel: 'Update',
  },
}

export const LoadingState = {
  args: {
    fields: basicFields,
    onSubmit: (data) => console.log('Form submitted:', data),
    submitLabel: 'Submit',
    loading: true,
  },
}
