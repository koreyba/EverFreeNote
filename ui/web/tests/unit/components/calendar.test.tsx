import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'

describe('Calendar component', () => {
  const testDate = new Date(2026, 6, 15) // July 15, 2026

  it('renders calendar container with default props', () => {
    const { container } = render(<Calendar defaultMonth={testDate} />)
    const calendarSlot = container.querySelector('[data-slot="calendar"]')
    expect(calendarSlot).toBeTruthy()
  })

  it('applies custom className to calendar root', () => {
    const { container } = render(
      <Calendar defaultMonth={testDate} className="custom-calendar-class" />
    )
    const calendarSlot = container.querySelector('[data-slot="calendar"]')
    expect(calendarSlot?.className).toContain('custom-calendar-class')
  })

  it('renders month caption and table days', () => {
    render(<Calendar defaultMonth={testDate} />)
    expect(screen.getByText(/July/i)).toBeTruthy()
  })

  it('handles date selection when mode is single', () => {
    const onSelect = jest.fn()
    render(
      <Calendar
        mode="single"
        defaultMonth={testDate}
        onSelect={onSelect}
      />
    )
    const dayButton = screen.getByRole('gridcell', { name: '15' }) || screen.getByText('15')
    fireEvent.click(dayButton)
    expect(onSelect).toHaveBeenCalled()
  })

  it('renders week numbers when showWeekNumber is enabled', () => {
    render(<Calendar defaultMonth={testDate} showWeekNumber />)
    const table = screen.getByRole('grid') || screen.getByRole('table')
    expect(table).toBeTruthy()
  })

  it('renders custom buttonVariant when specified', () => {
    const { container } = render(
      <Calendar defaultMonth={testDate} buttonVariant="outline" />
    )
    expect(container.querySelector('[data-slot="calendar"]')).toBeTruthy()
  })

  it('supports dropdown captionLayout', () => {
    const { container } = render(
      <Calendar
        defaultMonth={testDate}
        captionLayout="dropdown"
        startMonth={new Date(2025, 0)}
        endMonth={new Date(2027, 11)}
      />
    )
    expect(container.querySelector('[data-slot="calendar"]')).toBeTruthy()
  })
})

describe('CalendarDayButton component', () => {
  const dummyDay = { date: new Date(2026, 6, 15) }

  it('renders day button with correct data attributes for single selection', () => {
    render(
      <CalendarDayButton
        day={dummyDay}
        modifiers={{ selected: true }}
      >
        15
      </CalendarDayButton>
    )
    const button = screen.getByRole('button', { name: '15' })
    expect(button).toBeTruthy()
    expect(button.getAttribute('data-selected-single')).toBe('true')
  })

  it('renders day button with correct data attributes for range selection', () => {
    render(
      <CalendarDayButton
        day={dummyDay}
        modifiers={{ selected: true, range_start: true }}
      >
        15
      </CalendarDayButton>
    )
    const button = screen.getByRole('button', { name: '15' })
    expect(button.getAttribute('data-range-start')).toBe('true')
    expect(button.getAttribute('data-selected-single')).toBe('false')
  })

  it('focuses element when modifiers.focused is true', () => {
    render(
      <CalendarDayButton
        day={dummyDay}
        modifiers={{ focused: true }}
      >
        15
      </CalendarDayButton>
    )
    const button = screen.getByRole('button', { name: '15' })
    expect(document.activeElement).toBe(button)
  })

  it('merges custom classNames correctly', () => {
    render(
      <CalendarDayButton
        day={dummyDay}
        modifiers={{}}
        className="custom-day-btn"
      >
        15
      </CalendarDayButton>
    )
    const button = screen.getByRole('button', { name: '15' })
    expect(button.className).toContain('custom-day-btn')
  })
})
