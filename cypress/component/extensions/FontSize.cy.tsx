import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { FontSize } from '@/extensions/FontSize'

const Editor = () => {
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, FontSize],
    content: '<p>Hello World</p>',
  })

  if (!editor) return null

  return (
    <div>
      <button data-cy="set-size" onClick={() => editor.chain().focus().setFontSize('20px').run()}>
        Set Size
      </button>
      <button data-cy="unset-size" onClick={() => editor.chain().focus().unsetFontSize().run()}>
        Unset Size
      </button>
      <EditorContent editor={editor} />
    </div>
  )
}

describe('FontSize Extension', () => {
  it('sets and unsets font size', () => {
    cy.mount(<Editor />)
    
    // Select text
    cy.get('.ProseMirror').type('{selectall}')
    
    // Set size
    cy.get('[data-cy="set-size"]').click()
    cy.get('.ProseMirror span').should('have.css', 'font-size', '20px')
    
    // Unset size
    cy.get('[data-cy="unset-size"]').click()
    // Should not have inline font-size style (or span might be removed if it was the only style)
    cy.get('.ProseMirror span').should('not.exist') 
  })

  it('parses font size from HTML', () => {
    const EditorWithContent = () => {
      const editor = useEditor({
        extensions: [StarterKit, TextStyle, FontSize],
        content: '<p><span style="font-size: 24px">Big Text</span></p>',
      })
      
      if (!editor) return null
      
      return <EditorContent editor={editor} />
    }

    cy.mount(<EditorWithContent />)
    cy.get('.ProseMirror span').should('have.css', 'font-size', '24px')
  })
})
