import React from 'react'
import { render, screen } from '@testing-library/react'
import { useForm, type FieldValues } from 'react-hook-form'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form'

// Helper component to test useFormField outside FormField context
function TestUseFormFieldOutside() {
  useFormField()
  return <div>Test</div>
}

// Helper component to inspect useFormField values
function HookConsumer() {
  const field = useFormField()
  return (
    <div>
      <span data-testid="field-id">{field.id}</span>
      <span data-testid="field-name">{field.name}</span>
      <span data-testid="form-item-id">{field.formItemId}</span>
      <span data-testid="form-desc-id">{field.formDescriptionId}</span>
      <span data-testid="form-msg-id">{field.formMessageId}</span>
    </div>
  )
}

describe('form UI components', () => {
  // Prevent console.error noise during boundary/throw tests
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  it('throws an error when useFormField is used outside FormField context', () => {
    function TestFormWithoutFormField() {
      const form = useForm<FieldValues>({ defaultValues: { test: '' } })
      return (
        <Form {...form}>
          <TestUseFormFieldOutside />
        </Form>
      )
    }

    expect(() => render(<TestFormWithoutFormField />)).toThrow(
      'useFormField should be used within <FormField>'
    )
  })

  it('renders FormField with FormItem, FormLabel, FormControl, FormDescription, and FormMessage properly', () => {
    function TestForm() {
      const form = useForm<FieldValues>({
        defaultValues: { username: 'john_doe' },
      })
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className="custom-item-class">
                <FormLabel className="custom-label-class">Username</FormLabel>
                <FormControl>
                  <input data-testid="username-input" {...field} />
                </FormControl>
                <FormDescription className="custom-desc-class">
                  Enter your unique username.
                </FormDescription>
                <FormMessage className="custom-msg-class" />
              </FormItem>
            )}
          />
        </Form>
      )
    }

    render(<TestForm />)

    const label = screen.getByText('Username')
    const input = screen.getByTestId('username-input')
    const description = screen.getByText('Enter your unique username.')

    expect(label).toBeTruthy()
    expect(label.className).toContain('custom-label-class')
    expect(input).toBeTruthy()

    const inputId = input.getAttribute('id')
    expect(inputId).toBeTruthy()
    expect(label.getAttribute('for')).toBe(inputId)

    expect(description.className).toContain('custom-desc-class')
    expect(description.className).toContain('text-muted-foreground')
    expect(input.getAttribute('aria-describedby')).toBe(description.getAttribute('id'))
    expect(input.getAttribute('aria-invalid')).toBe('false')

    // FormMessage with no error and no children should return null (only FormDescription rendered as paragraph)
    const paragraphs = screen.getAllByText('Enter your unique username.')
    expect(paragraphs.length).toBe(1)
  })

  it('handles field error states correctly', () => {
    function TestFormWithError() {
      const form = useForm<FieldValues>({
        defaultValues: { email: '' },
      })

      React.useEffect(() => {
        form.setError('email', { type: 'manual', message: 'Email is required' })
      }, [form])

      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <input data-testid="email-input" {...field} />
                </FormControl>
                <FormDescription>Your email address</FormDescription>
                <FormMessage data-testid="error-message" />
              </FormItem>
            )}
          />
        </Form>
      )
    }

    render(<TestFormWithError />)

    const label = screen.getByText('Email')
    const input = screen.getByTestId('email-input')
    const errorMessage = screen.getByTestId('error-message')
    const description = screen.getByText('Your email address')

    expect(label.className).toContain('text-destructive')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBe(
      `${description.getAttribute('id')} ${errorMessage.getAttribute('id')}`
    )
    expect(errorMessage.textContent).toBe('Email is required')
    expect(errorMessage.className).toContain('text-destructive')
  })

  it('renders fallback children in FormMessage when there is no error', () => {
    function TestFormWithMessageChildren() {
      const form = useForm<FieldValues>({
        defaultValues: { bio: '' },
      })

      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="bio"
            render={() => (
              <FormItem>
                <FormMessage data-testid="hint-message">Optional hint text</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      )
    }

    render(<TestFormWithMessageChildren />)

    const hintMessage = screen.getByTestId('hint-message')
    expect(hintMessage).toBeTruthy()
    expect(hintMessage.textContent).toBe('Optional hint text')
  })

  it('falls back to field name for ID when FormItem context is absent', () => {
    function TestFormNoItem() {
      const form = useForm<FieldValues>({
        defaultValues: { age: '25' },
      })

      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="age"
            render={() => <HookConsumer />}
          />
        </Form>
      )
    }

    render(<TestFormNoItem />)

    expect(screen.getByTestId('field-id').textContent).toBe('age')
    expect(screen.getByTestId('field-name').textContent).toBe('age')
    expect(screen.getByTestId('form-item-id').textContent).toBe('age-form-item')
    expect(screen.getByTestId('form-desc-id').textContent).toBe('age-form-item-description')
    expect(screen.getByTestId('form-msg-id').textContent).toBe('age-form-item-message')
  })

  it('forwards refs correctly to FormItem, FormLabel, FormDescription, and FormMessage', () => {
    const itemRef = React.createRef<HTMLDivElement>()
    const labelRef = React.createRef<HTMLLabelElement>()
    const descRef = React.createRef<HTMLParagraphElement>()
    const msgRef = React.createRef<HTMLParagraphElement>()

    function TestRefsForm() {
      const form = useForm<FieldValues>({
        defaultValues: { refTest: '' },
      })

      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="refTest"
            render={({ field }) => (
              <FormItem ref={itemRef}>
                <FormLabel ref={labelRef}>Ref Label</FormLabel>
                <FormControl>
                  <input {...field} />
                </FormControl>
                <FormDescription ref={descRef}>Ref Desc</FormDescription>
                <FormMessage ref={msgRef}>Ref Msg</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      )
    }

    render(<TestRefsForm />)

    expect(itemRef.current).toBeInstanceOf(HTMLDivElement)
    expect(labelRef.current).toBeInstanceOf(HTMLLabelElement)
    expect(descRef.current).toBeInstanceOf(HTMLParagraphElement)
    expect(msgRef.current).toBeInstanceOf(HTMLParagraphElement)
  })
})
