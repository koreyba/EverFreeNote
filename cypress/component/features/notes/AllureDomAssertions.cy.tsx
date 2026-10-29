import React from 'react'
import { normalizeDomAssertionValues } from '../../../support/setup/allure-dom-assertions'

describe('Allure DOM assertion values', () => {
  it('keeps a readable subject without serializing live React internals', () => {
    cy.mount(<button data-cy="assertion-subject">Actual text</button>)
    cy.get('[data-cy="assertion-subject"]').then(subject => {
      const error: Error & { actual?: unknown; expected?: unknown } = Object.assign(new Error('Original failure'), {
        actual: subject, expected: 'Expected text',
      })
      normalizeDomAssertionValues(error)
      expect(error.message).to.equal('Original failure')
      expect(error.actual).to.be.a('string').and.contain('button')
      expect(error.expected).to.equal('Expected text')
    })
  })

  it('leaves ordinary non-DOM assertion values intact', () => {
    const value = { count: 2 }
    const error = Object.assign(new Error('Original failure'), { actual: value, expected: 3 })
    normalizeDomAssertionValues(error)
    expect(error.actual).to.equal(value)
    expect(error.expected).to.equal(3)
  })
})
