import React from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

describe('Select', () => {
  it('renders and opens', () => {
    cy.mount(
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    )
    cy.get('button').click()
    cy.contains('Apple').should('be.visible')
  })

  it.skip('shows scroll buttons when content overflows', () => {
    cy.viewport(500, 400)
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`)
    
    cy.mount(
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select an item" />
        </SelectTrigger>
        <SelectContent className="max-h-[200px]">
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
    
    cy.get('button').click()
    cy.wait(500) 
    
    // Check for scroll down button.
    cy.get('.flex.cursor-default.items-center.justify-center.py-1').should('exist')
  })
})
