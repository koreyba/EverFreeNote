// @ts-check
import { cn } from '@/lib/utils'

describe('lib/utils', () => {
  describe('cn() function', () => {
    it('merges class names correctly', () => {
      const result = cn('text-red-500', 'bg-blue-500')
      expect(result).to.equal('text-red-500 bg-blue-500')
    })

    it('handles conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).to.equal('base-class active-class')
    })

    it('filters out falsy values', () => {
      const result = cn('text-red-500', false, null, undefined, 'bg-blue-500')
      expect(result).to.equal('text-red-500 bg-blue-500')
    })

    it('merges Tailwind conflicting classes correctly', () => {
      // twMerge should keep the last conflicting class
      const result = cn('px-2', 'px-4')
      expect(result).to.equal('px-4')
    })

    it('handles array of classes', () => {
      const result = cn(['text-red-500', 'bg-blue-500'])
      expect(result).to.equal('text-red-500 bg-blue-500')
    })

    it('handles objects with boolean values', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
        'font-bold': true
      })
      expect(result).to.equal('text-red-500 font-bold')
    })

    it('handles mixed inputs (strings, arrays, objects)', () => {
      const result = cn(
        'base-class',
        ['array-class-1', 'array-class-2'],
        { 'object-class': true, 'hidden-class': false },
        'final-class'
      )
      expect(result).to.equal('base-class array-class-1 array-class-2 object-class final-class')
    })

    it('handles empty input', () => {
      const result = cn()
      expect(result).to.equal('')
    })

    it('handles only falsy values', () => {
      const result = cn(false, null, undefined, '')
      expect(result).to.equal('')
    })

    it('deduplicates identical classes', () => {
      const result = cn('text-red-500', 'text-red-500', 'bg-blue-500')
      expect(result).to.equal('text-red-500 bg-blue-500')
    })

    it('handles complex Tailwind class conflicts', () => {
      // Should keep last value for conflicting utilities
      const result = cn('p-2', 'p-4', 'px-8')
      expect(result).to.equal('p-4 px-8')
    })

    it('handles responsive classes', () => {
      const result = cn('text-sm', 'md:text-base', 'lg:text-lg')
      expect(result).to.equal('text-sm md:text-base lg:text-lg')
    })

    it('handles hover and focus states', () => {
      const result = cn('hover:bg-blue-500', 'focus:ring-2')
      expect(result).to.equal('hover:bg-blue-500 focus:ring-2')
    })

    it('handles dark mode classes', () => {
      const result = cn('bg-white', 'dark:bg-gray-800')
      expect(result).to.equal('bg-white dark:bg-gray-800')
    })

    it('handles arbitrary values', () => {
      const result = cn('w-[100px]', 'h-[50px]')
      expect(result).to.equal('w-[100px] h-[50px]')
    })
  })
})

