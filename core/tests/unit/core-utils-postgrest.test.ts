import { isPostgrestNoRowsError } from '@core/utils/postgrest'

describe('core/utils/postgrest', () => {
  it('returns true for PGRST116 errors', () => {
    expect(isPostgrestNoRowsError({ code: 'PGRST116' })).toBe(true)
  })

  it('returns false for other error codes', () => {
    expect(isPostgrestNoRowsError({ code: '23505' })).toBe(false)
  })

  it('returns false for non-object values', () => {
    expect(isPostgrestNoRowsError(null)).toBe(false)
    expect(isPostgrestNoRowsError(undefined)).toBe(false)
    expect(isPostgrestNoRowsError('PGRST116')).toBe(false)
  })
})
