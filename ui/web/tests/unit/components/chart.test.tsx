import React from 'react'
import { render } from '@testing-library/react'
import { ChartContainer, type ChartConfig } from '@ui/web/components/ui/chart'

// Mock Recharts ResponsiveContainer to render children directly in test env
jest.mock('recharts', () => {
  const originalModule = jest.requireActual('recharts')
  return {
    ...originalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  }
})

describe('ChartContainer component', () => {
  const sampleConfig: ChartConfig = {
    desktop: {
      label: 'Desktop',
      color: '#2563eb',
    },
  }

  it('renders with custom id preserving colons', () => {
    const { container } = render(
      <ChartContainer id="custom:id:123" config={sampleConfig}>
        <div>Chart Content</div>
      </ChartContainer>
    )

    const wrapper = container.querySelector('[data-chart]')
    expect(wrapper).toBeTruthy()
    expect(wrapper?.getAttribute('data-chart')).toBe('chart-custom:id:123')
  })

  it('renders with auto-generated React useId stripping colons when no id is provided', () => {
    const { container } = render(
      <ChartContainer config={sampleConfig}>
        <div>Chart Content</div>
      </ChartContainer>
    )

    const wrapper = container.querySelector('[data-chart]')
    expect(wrapper).toBeTruthy()
    const chartId = wrapper?.getAttribute('data-chart')
    expect(chartId).toMatch(/^chart-/)
    expect(chartId).not.toContain(':')
  })
})
