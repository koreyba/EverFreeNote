import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AiSearchPresetSelector } from '@ui/web/components/features/search/AiSearchPresetSelector'
import { DEFAULT_PRESET } from '@core/constants/aiSearch'

describe('AiSearchPresetSelector', () => {
  it('renders search precision toggle group with all preset options', () => {
    const onChange = jest.fn()
    render(<AiSearchPresetSelector value="neutral" onChange={onChange} />)

    const group = screen.getByRole('group', { name: 'Search precision' })
    expect(group).toBeTruthy()

    const strictBtn = screen.getByRole('radio', { name: 'Strict' })
    const neutralBtn = screen.getByRole('radio', { name: 'Neutral' })
    const broadBtn = screen.getByRole('radio', { name: 'Broad' })

    expect(strictBtn).toBeTruthy()
    expect(neutralBtn).toBeTruthy()
    expect(broadBtn).toBeTruthy()
  })

  it('highlights the active preset selection', () => {
    const onChange = jest.fn()
    const { rerender } = render(<AiSearchPresetSelector value="strict" onChange={onChange} />)

    const strictBtn = screen.getByRole('radio', { name: 'Strict' })
    const neutralBtn = screen.getByRole('radio', { name: 'Neutral' })
    const broadBtn = screen.getByRole('radio', { name: 'Broad' })

    expect(strictBtn.getAttribute('data-state')).toBe('on')
    expect(neutralBtn.getAttribute('data-state')).toBe('off')
    expect(broadBtn.getAttribute('data-state')).toBe('off')

    rerender(<AiSearchPresetSelector value="broad" onChange={onChange} />)

    expect(strictBtn.getAttribute('data-state')).toBe('off')
    expect(neutralBtn.getAttribute('data-state')).toBe('off')
    expect(broadBtn.getAttribute('data-state')).toBe('on')
  })

  it('correctly uses DEFAULT_PRESET as active selection when passed', () => {
    const onChange = jest.fn()
    render(<AiSearchPresetSelector value={DEFAULT_PRESET} onChange={onChange} />)

    const neutralBtn = screen.getByRole('radio', { name: 'Neutral' })
    expect(neutralBtn.getAttribute('data-state')).toBe('on')
  })

  it('triggers onChange callback with the selected preset when clicked', () => {
    const onChange = jest.fn()
    render(<AiSearchPresetSelector value="neutral" onChange={onChange} />)

    const strictBtn = screen.getByRole('radio', { name: 'Strict' })
    fireEvent.click(strictBtn)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('strict')

    const broadBtn = screen.getByRole('radio', { name: 'Broad' })
    fireEvent.click(broadBtn)

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith('broad')
  })

  it('does not trigger onChange when clicking the currently active preset (unchecking ignored)', () => {
    const onChange = jest.fn()
    render(<AiSearchPresetSelector value="neutral" onChange={onChange} />)

    const neutralBtn = screen.getByRole('radio', { name: 'Neutral' })
    fireEvent.click(neutralBtn)

    expect(onChange).not.toHaveBeenCalled()
  })
})
