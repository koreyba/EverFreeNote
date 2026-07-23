import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import useEmblaCarousel from 'embla-carousel-react'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

const mockScrollPrev = jest.fn()
const mockScrollNext = jest.fn()
const mockEmblaRef = jest.fn()

jest.mock('embla-carousel-react', () => ({
  __esModule: true,
  default: jest.fn(() => [
    mockEmblaRef,
    {
      scrollPrev: mockScrollPrev,
      scrollNext: mockScrollNext,
    },
  ]),
}))

describe('Carousel UI components', () => {
  const originalError = console.error
  beforeAll(() => {
    console.error = jest.fn()
  })
  afterAll(() => {
    console.error = originalError
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('throws an error when Carousel subcomponents are used outside Carousel provider', () => {
    expect(() => render(<CarouselContent>Item</CarouselContent>)).toThrow(
      'Carousel components must be used within <Carousel />'
    )
    expect(() => render(<CarouselItem>Item</CarouselItem>)).toThrow(
      'Carousel components must be used within <Carousel />'
    )
    expect(() => render(<CarouselPrevious />)).toThrow(
      'Carousel components must be used within <Carousel />'
    )
    expect(() => render(<CarouselNext />)).toThrow(
      'Carousel components must be used within <Carousel />'
    )
  })

  it('renders horizontal carousel with items and navigation buttons', () => {
    render(
      <Carousel orientation="horizontal" className="custom-carousel">
        <CarouselContent className="custom-content">
          <CarouselItem className="custom-item">Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious className="custom-prev" />
        <CarouselNext className="custom-next" />
      </Carousel>
    )

    expect(useEmblaCarousel).toHaveBeenCalledWith(
      { axis: 'x' },
      []
    )

    const prevButton = screen.getByRole('button', { name: 'Previous slide' })
    const nextButton = screen.getByRole('button', { name: 'Next slide' })
    const item1 = screen.getByText('Slide 1')

    expect(prevButton).toBeTruthy()
    expect(nextButton).toBeTruthy()
    expect(item1).toBeTruthy()

    expect(prevButton.className).toContain('custom-prev')
    expect(prevButton.className).toContain('-left-10')
    expect(nextButton.className).toContain('custom-next')
    expect(nextButton.className).toContain('-right-10')

    expect(item1.className).toContain('custom-item')
    expect(item1.className).toContain('pl-4')

    fireEvent.click(prevButton)
    expect(mockScrollPrev).toHaveBeenCalledTimes(1)

    fireEvent.click(nextButton)
    expect(mockScrollNext).toHaveBeenCalledTimes(1)
  })

  it('renders vertical carousel with correct styling and navigation placement', () => {
    render(
      <Carousel orientation="vertical">
        <CarouselContent>
          <CarouselItem>Vertical Slide</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    )

    expect(useEmblaCarousel).toHaveBeenCalledWith(
      { axis: 'y' },
      []
    )

    const prevButton = screen.getByRole('button', { name: 'Previous slide' })
    const nextButton = screen.getByRole('button', { name: 'Next slide' })
    const item = screen.getByText('Vertical Slide')

    expect(prevButton.className).toContain('-top-10')
    expect(prevButton.className).toContain('rotate-90')

    expect(nextButton.className).toContain('-bottom-10')
    expect(nextButton.className).toContain('rotate-90')

    expect(item.className).toContain('pt-4')
  })

  it('forwards refs correctly to subcomponents', () => {
    const contentRef = React.createRef<HTMLDivElement>()
    const itemRef = React.createRef<HTMLDivElement>()
    const prevRef = React.createRef<HTMLButtonElement>()
    const nextRef = React.createRef<HTMLButtonElement>()

    render(
      <Carousel>
        <CarouselContent ref={contentRef}>
          <CarouselItem ref={itemRef}>Slide Ref</CarouselItem>
        </CarouselContent>
        <CarouselPrevious ref={prevRef} />
        <CarouselNext ref={nextRef} />
      </Carousel>
    )

    expect(contentRef.current).toBeInstanceOf(HTMLDivElement)
    expect(itemRef.current).toBeInstanceOf(HTMLDivElement)
    expect(prevRef.current).toBeInstanceOf(HTMLButtonElement)
    expect(nextRef.current).toBeInstanceOf(HTMLButtonElement)
  })
})
