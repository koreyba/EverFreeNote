import React from 'react'
import { ImportDialog } from '@/components/ImportDialog'

describe('ImportDialog', () => {
  const fileFixture = {
    contents: '<enex></enex>',
    fileName: 'sample.enex',
    mimeType: 'application/xml'
  }

  it('передаёт skipFileDuplicates=false по умолчанию', () => {
    const onImport = cy.stub().as('onImport')
    const onOpenChange = cy.stub().as('onOpenChange')

    cy.mount(
      <ImportDialog
        open
        onOpenChange={onOpenChange}
        onImport={onImport}
      />
    )

    cy.get('input[type="file"]').selectFile(fileFixture)
    cy.contains('button', /^Import/).click()

    cy.get('@onImport').should('have.been.calledOnce')
    cy.get('@onImport').its('firstCall.args.1').should((settings) => {
      expect(settings.duplicateStrategy).to.equal('prefix')
      expect(settings.skipFileDuplicates).to.be.false
    })
  })

  it('включает skipFileDuplicates при отметке чекбокса', () => {
    const onImport = cy.stub().as('onImport')

    cy.mount(
      <ImportDialog
        open
        onOpenChange={() => {}}
        onImport={onImport}
      />
    )

    cy.get('#skip-file-duplicates').click()
    cy.get('input[type="file"]').selectFile(fileFixture)
    cy.contains('button', /^Import/).click()

    cy.get('@onImport').its('firstCall.args.1').should((settings) => {
      expect(settings.skipFileDuplicates).to.be.true
    })
  })

  it('сбрасывает чекбокс при повторном открытии диалога', () => {
    const onImport = cy.stub().as('onImport')
    const onOpenChangeSpy = cy.stub().as('onOpenChange')

    const Wrapper: React.FC = () => {
      const [open, setOpen] = React.useState(true)
      const handleOpenChange = (value: boolean) => {
        onOpenChangeSpy(value)
        setOpen(value)
      }
      return (
        <>
          <button type="button" onClick={() => setOpen(true)} data-cy="reopen">
            Reopen
          </button>
          <ImportDialog
            open={open}
            onOpenChange={handleOpenChange}
            onImport={onImport}
          />
        </>
      )
    }

    cy.mount(<Wrapper />)

    cy.get('#skip-file-duplicates').click()
    cy.get('input[type="file"]').selectFile(fileFixture)
    cy.contains('button', /^Import/).click()

    cy.get('@onOpenChange').should('have.been.calledWith', false)

    cy.get('[data-cy="reopen"]').click()
    cy.get('#skip-file-duplicates').should('not.be.checked')
  })
})
