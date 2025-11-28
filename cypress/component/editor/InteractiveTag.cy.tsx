import React from 'react'
import InteractiveTag from '@/components/InteractiveTag'

describe('InteractiveTag Component', () => {
  it('renders tag with correct text', () => {
    const tagText = 'test-tag'
    cy.mount(<InteractiveTag tag={tagText} />)

    // Проверяем что тег отображается с правильным текстом
    cy.contains(tagText).should('be.visible')
  })

  it('shows close button on hover', () => {
    const tagText = 'hover-test'
    cy.mount(<InteractiveTag tag={tagText} onRemove={() => {}} />)

    // Проверяем что кнопка X изначально не видна (opacity: 0)
    cy.get('.remove-tag').should('have.class', 'opacity-0')

    // Наводим курсор на тег
    cy.contains(tagText).trigger('mouseover')

    // Теперь кнопка X должна быть видна (opacity: 100)
    cy.get('.remove-tag').should('have.class', 'opacity-100')

    // Убираем курсор
    cy.contains(tagText).trigger('mouseout')

    // Кнопка X должна исчезнуть (opacity: 0)
    cy.get('.remove-tag').should('have.class', 'opacity-0')
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

  it('has correct styling classes', () => {
    const tagText = 'style-test'
    cy.mount(<InteractiveTag tag={tagText} />)

    // Проверяем что у тега есть правильные CSS классы
    cy.get('[data-cy="interactive-tag"]').should('have.class', 'cursor-pointer')
    cy.get('[data-cy="interactive-tag"]').should('have.class', 'transition-all')
    cy.get('[data-cy="interactive-tag"]').should('have.class', 'hover:bg-accent')
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
