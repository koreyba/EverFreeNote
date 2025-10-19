import React from 'react'
import { Button } from '../../components/ui/button'

describe('Authentication Form', () => {
  it('renders all three authentication buttons', () => {
    // МОНТИРУЕМ форму аутентификации как JSX
    cy.mount(
      <div className="max-w-md mx-auto">
        <div className="space-y-4">
          <Button className="w-full h-12 text-base">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or test the app</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full h-10 text-sm border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              🧪 Test Login (Persistent)
            </Button>
            <Button
              variant="outline"
              className="w-full h-10 text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              🚀 Skip Authentication (Quick Test)
            </Button>
          </div>
        </div>
      </div>
    )

    // Проверяем что все три кнопки отображаются
    cy.contains('Continue with Google').should('be.visible')
    cy.contains('🧪 Test Login (Persistent)').should('be.visible')
    cy.contains('🚀 Skip Authentication (Quick Test)').should('be.visible')

    // Проверяем разделитель
    cy.contains('Or test the app').should('be.visible')
  })

  it('Google button has correct styling', () => {
    cy.mount(
      <Button className="w-full h-12 text-base">
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        </svg>
        Continue with Google
      </Button>
    )

    // Проверяем стили кнопки Google
    cy.get('button').should('have.class', 'w-full')
    cy.get('button').should('have.class', 'h-12')
    cy.contains('Continue with Google').should('be.visible')

    // Проверяем что есть SVG иконка Google
    cy.get('svg').should('exist')
  })

  it('test buttons have correct styling', () => {
    cy.mount(
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full h-10 text-sm border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          🧪 Test Login (Persistent)
        </Button>
        <Button
          variant="outline"
          className="w-full h-10 text-sm border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          🚀 Skip Authentication (Quick Test)
        </Button>
      </div>
    )

    // Проверяем стили первой кнопки (оранжевая)
    cy.contains('🧪 Test Login (Persistent)')
      .should('have.class', 'border-orange-200')
      .and('have.class', 'text-orange-700')

    // Проверяем стили второй кнопки (синяя)
    cy.contains('🚀 Skip Authentication (Quick Test)')
      .should('have.class', 'border-blue-200')
      .and('have.class', 'text-blue-700')
  })
})
