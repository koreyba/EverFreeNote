import React from 'react'
import InteractiveTag from '../../../ui/web/components/InteractiveTag'
import '../../../app/globals.css'

describe('InteractiveTag Component', () => {
  it('renders tag with correct text', () => {
    const tagText = 'test-tag'
    cy.mount(<InteractiveTag tag={tagText} />)

    // Проверяем что тег отображается с правильным текстом
    cy.contains(tagText).should('be.visible')
  })

  it('shows close button styles for hover and mobile', () => {
    const tagText = 'hover-test'
    cy.mount(<InteractiveTag tag={tagText} onRemove={() => {}} />)

    cy.get('.remove-tag').should('have.class', 'opacity-100')
    cy.get('.remove-tag').should('have.class', 'md:opacity-0')
    cy.get('.remove-tag').should('have.class', 'md:group-hover:opacity-100')
  })
  it('calls onClick when tag is clicked', () => {
    const tagText = 'click-test'
    const onClickSpy = cy.spy().as('onClickSpy')

    cy.mount(<InteractiveTag tag={tagText} onClick={onClickSpy} />)

    // Кликаем на тег
    cy.contains(tagText).click()

    // Проверяем что onClick был вызван
    cy.get('@onClickSpy').should('have.been.calledOnce')
  })

  it('calls onRemove when close button is clicked', () => {
    const tagText = 'remove-test'
    const onRemoveSpy = cy.spy().as('onRemoveSpy')

    cy.mount(<InteractiveTag tag={tagText} onRemove={onRemoveSpy} />)

    // Наводим курсор чтобы показать кнопку X
    cy.contains(tagText).trigger('mouseover')

    // Кликаем на кнопку X
    cy.get('.remove-tag').click()

    // Проверяем что onRemove был вызван с правильным аргументом
    cy.get('@onRemoveSpy').should('have.been.calledOnceWith', tagText)
  })

  it('shows a pointer only when the tag has its own click action', () => {
    cy.mount(<>
      <InteractiveTag tag="Read-only tag" />
      <InteractiveTag tag="Clickable tag" onClick={cy.stub()} />
    </>)

    cy.contains('[data-cy="interactive-tag"]', 'Read-only tag').should('not.have.css', 'cursor', 'pointer')
    cy.contains('[data-cy="interactive-tag"]', 'Clickable tag').should('have.css', 'cursor', 'pointer')
  })

  it('handles long tag names gracefully', () => {
    const longTag = 'very-long-tag-name-that-might-wrap'
    cy.mount(<InteractiveTag tag={longTag} />)

    // Проверяем что длинный тег отображается полностью
    cy.contains(longTag).should('be.visible')

    // Проверяем что тег содержит иконку Tag
    cy.get('svg').should('exist')
  })

  it('does not show icon when showIcon is false', () => {
    const tagText = 'no-icon-test'
    cy.mount(<InteractiveTag tag={tagText} showIcon={false} />)

    // Проверяем что иконка Tag не отображается
    cy.get('svg').should('not.exist')
    cy.contains(tagText).should('be.visible')
  })

  it('prevents event bubbling when clicking remove button', () => {
    const tagText = 'bubble-test'
    const onClickSpy = cy.spy().as('onClickSpy')
    const onRemoveSpy = cy.spy().as('onRemoveSpy')

    cy.mount(<InteractiveTag tag={tagText} onClick={onClickSpy} onRemove={onRemoveSpy} />)

    // Наводим курсор чтобы показать кнопку X
    cy.contains(tagText).trigger('mouseover')

    // Кликаем на кнопку X
    cy.get('.remove-tag').click()

    // onClick не должен быть вызван (event bubbling prevented)
    cy.get('@onClickSpy').should('not.have.been.called')
    // onRemove должен быть вызван
    cy.get('@onRemoveSpy').should('have.been.calledOnce')
  })
})
