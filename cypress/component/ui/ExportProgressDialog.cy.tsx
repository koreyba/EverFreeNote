import React from 'react'
import { ExportProgressDialog } from '@ui/web/components/ExportProgressDialog'

describe('ExportProgressDialog', () => {
  const defaultProgress = {
    currentNote: 5,
    totalNotes: 10,
    currentStep: 'fetching' as const,
    message: 'Processing notes...',
  }

  it('renders nothing when closed', () => {
    cy.mount(
      <ExportProgressDialog
        open={false}
        progress={defaultProgress}
        onClose={cy.spy()}
      />
    )
    cy.get('[role="dialog"]').should('not.exist')
  })

  it('renders progress state correctly', () => {
    cy.mount(
      <ExportProgressDialog
        open={true}
        progress={defaultProgress}
        onClose={cy.spy()}
      />
    )

    cy.contains('Export in progress').should('be.visible')
    cy.contains('Please keep this window open until export finishes.').should('be.visible')
    
    // Check note progress
    cy.contains('Notes').should('be.visible')
    cy.contains('5 of 10').should('be.visible')
    
    // Check percentage
    cy.contains('50%').should('be.visible')
    
    // Close button (in footer) should be hidden during progress
    cy.get('button.w-full').should('not.exist')
  })

  it('renders completion state (success) correctly', () => {
    const completedProgress = {
      ...defaultProgress,
      currentNote: 10,
      currentStep: 'complete' as const,
      message: 'Done',
    }

    cy.mount(
      <ExportProgressDialog
        open={true}
        progress={completedProgress}
        onClose={cy.spy()}
      />
    )

    cy.contains('Export completed').should('be.visible')
    cy.contains('File is ready to download.').should('be.visible')
    
    // Check stats
    cy.contains('10 of 10').should('be.visible')
    cy.contains('100%').should('be.visible')
    
    // Close button should be visible
    cy.contains('button', 'Close').should('be.visible')
  })

  it('renders completion state (error) correctly', () => {
    const errorProgress = {
      ...defaultProgress,
      currentStep: 'complete' as const,
      message: 'Export completed with errors',
    }

    cy.mount(
      <ExportProgressDialog
        open={true}
        progress={errorProgress}
        onClose={cy.spy()}
      />
    )

    cy.contains('Export completed with errors').should('be.visible')
    cy.contains('button', 'Close').should('be.visible')
  })
})
