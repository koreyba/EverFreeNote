import React from 'react'
import '../../../app/globals.css'
import RichTextEditor, { type RichTextEditorHandle } from '../../../ui/web/components/RichTextEditor'
import { NoteEditor } from '../../../ui/web/components/features/notes/NoteEditor'
import { NoteView } from '../../../ui/web/components/features/notes/NoteView'
import { toast } from 'sonner'

const pictureOne = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
// Use a 64×48 image so selecting it tests an ordinary pointer target, not a single pixel.
const pictureTwo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAYAAAChS3wfAAAAc0lEQVR42u3QMQGAMBAEwVhCyktJhwzeQUpcQjxcmSlWwM647vUlVdgM67ABAAAAAAAAAAAAAAAAAAAAnAjw7JGgCpthHQYAAAAAAAAAAAAAAAAAAAAcCfDukaAKm2EdBgAAAAAAAAAAAAAAAAAAABwI8ANjg8HD4RCQdQAAAABJRU5ErkJggg=='
const twoPictures = `<p>Before <img src="${pictureOne}" width="64" height="32"> between <img src="${pictureTwo}" alt="Existing description"> after</p>`
const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAgUBAScY42YAAAAASUVORK5CYII='

describe('Accessible note content and image descriptions', { retries: 0 }, () => {
  it('exposes a named multiline editor without changing typing', () => {
    cy.mount(<RichTextEditor initialContent="<p>Hello</p>" />)
    cy.get('[data-cy="editor-content"] [contenteditable="true"]')
      .should('have.attr', 'role', 'textbox')
      .and('have.attr', 'aria-label', 'Note content')
      .and('have.attr', 'aria-multiline', 'true')
      .focus().type('{end} world', { force: true })
      .should('contain.text', 'Hello world')
  })

  it('does not modify an undescribed image until its description is saved', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    const changed = cy.stub().as('changed')
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} onContentChange={changed} />)
    cy.get('[data-cy="editor-content"] img').should('have.length', 2)
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'Image without description')
    cy.then(() => {
      expect(ref.current?.getHTML()).not.to.contain('Image without description')
    })
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"]:has(textarea)').should('be.visible')
    cy.contains('[role="dialog"] button', 'Cancel').click()
    cy.get('@changed').should('not.have.been.called')
    cy.then(() => expect(ref.current?.getHTML()).not.to.contain('Image without description'))
  })

  it('returns focus to the image control after saving a description', () => {
    cy.mount(<RichTextEditor initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"]:has(textarea)').should('be.visible')
    cy.get('[role="dialog"] textarea').focus().type('A keyboard description')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'A keyboard description')
    cy.get('[data-cy="image-button"]').should('have.focus')
  })

  it('keeps a scrollable dialog within a narrow, short viewport', () => {
    cy.viewport(320, 500)
    cy.mount(<RichTextEditor initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"]:has(textarea)').should('be.visible').then(($dialog) => {
      const rect = $dialog[0].getBoundingClientRect()
      expect(rect.left).to.be.at.least(0)
      expect(rect.right).to.be.at.most(320)
      expect(rect.top).to.be.at.least(0)
      expect(rect.bottom).to.be.at.most(500)
    })
    cy.get('[role="dialog"] textarea').type('A small picture')
    cy.contains('[role="dialog"] button', 'Save').scrollIntoView().click()
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'A small picture')
  })

  it('uses the selected image when editing a description', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="editor-content"] img').eq(1).should('be.visible').should(($image) => {
      const image = $image[0] as HTMLImageElement
      const bounds = image.getBoundingClientRect()
      expect(image.naturalWidth).to.equal(64)
      expect(image.naturalHeight).to.equal(48)
      expect(bounds.width).to.be.at.least(48)
      expect(bounds.height).to.be.at.least(36)
      expect(image.ownerDocument.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)).to.equal(image)
    }).click()
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] select').should('have.value', '1')
    cy.get('[role="dialog"] textarea').should('have.value', 'Existing description').clear().type('Second image')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.get('[data-cy="editor-content"] img').eq(1).should('have.attr', 'alt', 'Second image')
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'Image without description')
    cy.then(() => {
      const saved = new DOMParser().parseFromString(ref.current?.getHTML() ?? '', 'text/html')
      const images = saved.querySelectorAll('img')
      expect(images).to.have.length(2)
      expect(images[0].getAttribute('src')).to.equal(pictureOne)
      expect(images[0].hasAttribute('alt')).to.equal(false)
      expect(images[1].getAttribute('src')).to.equal(pictureTwo)
      expect(images[1].getAttribute('alt')).to.equal('Second image')
    })
  })

  it('keeps draft descriptions when choosing between images and saves both', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] textarea').type('First picture')
    cy.get('[role="dialog"] select').select('1')
    cy.get('[role="dialog"] textarea').clear().type('Second picture')
    cy.get('[role="dialog"] select').select('0')
    cy.get('[role="dialog"] textarea').should('have.value', 'First picture')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.then(() => {
      const saved = ref.current?.getHTML() ?? ''
      expect(saved).to.contain('alt="First picture"')
      expect(saved).to.contain('alt="Second picture"')
    })
  })

  it('does not apply a captured image position after the note changes', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.stub(toast, 'error').as('descriptionError')
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] textarea').type('The old image')
    cy.then(() => ref.current?.setContent(`<p>New content <img src="${pictureTwo}" alt="Do not change"></p>`))
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.get('@descriptionError').should('have.been.calledWith', 'The note changed')
    cy.then(() => {
      expect(ref.current?.getHTML()).to.contain('alt="Do not change"')
      expect(ref.current?.getHTML()).not.to.contain('The old image')
    })
  })

  it('can describe a picture inserted from a device and one pasted as HTML', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent="<p>Images</p>" />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Choose from device').click()
    cy.get('[data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from(tinyPng, 'base64'), fileName: 'photo.png', mimeType: 'image/png',
    }, { force: true })
    cy.get('[data-cy="editor-content"] img').should('have.length', 1)
    cy.get('.ProseMirror').focus().type('{end}', { force: true })
    cy.get('.ProseMirror').then(($editor) => {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: { getData: (type: string) => type === 'text/html' ? '<img src="https://example.com/pasted.png" alt="Pasted picture">' : '', types: ['text/html'] },
      })
      $editor[0].dispatchEvent(event)
    })
    cy.then(() => {
      const document = new DOMParser().parseFromString(ref.current?.getHTML() ?? '', 'text/html')
      expect(document.querySelectorAll('img')).to.have.length(2)
    })
    cy.get('[data-cy="editor-content"] img:not(.ProseMirror-separator)').should('have.length', 2)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] select').select('0')
    cy.get('[role="dialog"] textarea').type('Device picture')
    cy.get('[role="dialog"] select').select('1')
    cy.get('[role="dialog"] textarea').should('have.value', 'Pasted picture')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.then(() => {
      const html = ref.current?.getHTML() ?? ''
      expect(html).to.contain('alt="Device picture"')
      expect(html).to.contain('alt="Pasted picture"')
      expect(html).to.contain('data:image/png;base64,')
      expect(html).to.contain('https://example.com/pasted.png')
    })
  })

  it('can describe an image inserted using its URL', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent="<p>Images</p>" />)
    cy.window().then((win) => cy.stub(win, 'prompt').returns('https://example.com/flower.png'))
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Insert from URL').click()
    cy.get('[data-cy="editor-content"] img').should('have.attr', 'src', 'https://example.com/flower.png')
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] textarea').type('A flower')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.then(() => {
      expect(ref.current?.getHTML()).to.contain('src="https://example.com/flower.png"')
      expect(ref.current?.getHTML()).to.contain('alt="A flower"')
    })
  })

  it('describes one chosen image, preserves both sources and dimensions, and survives reopening', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="editor-content"] img').should('have.length', 2)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"]:has(textarea)').within(() => {
      cy.get('select').select('0')
      cy.get('textarea').type('A red bicycle')
      cy.contains('button', 'Save').click()
    })
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'A red bicycle')
    cy.get('[data-cy="editor-content"] img').eq(1).should('have.attr', 'alt', 'Existing description')
    cy.then(() => {
      const saved = ref.current?.getHTML() ?? ''
      expect(saved).to.contain('alt="A red bicycle"')
      expect(saved).to.contain('alt="Existing description"')
      expect(saved).to.contain('width="64"')
      expect(saved).to.contain('height="32"')
      expect(saved).to.contain(pictureOne)
      expect(saved).to.contain(pictureTwo)
      cy.mount(<RichTextEditor initialContent={saved} />)
    })
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'A red bicycle')
    cy.get('[data-cy="editor-content"] img').eq(1).should('have.attr', 'alt', 'Existing description')
  })

  it('marks an image decorative only after the user explicitly chooses it', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"]:has(textarea)').within(() => {
      cy.get('select').select('0')
      cy.contains('button', 'Save').should('be.disabled')
      cy.contains('label', 'Decorative image').click()
      cy.contains('button', 'Save').click()
    })
    cy.then(() => expect(ref.current?.getHTML()).to.contain('alt=""'))
  })

  it('clearing a description does not silently make an image decorative', () => {
    const ref = React.createRef<RichTextEditorHandle>()
    cy.mount(<RichTextEditor ref={ref} initialContent={twoPictures} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] select').select('1')
    cy.get('[role="dialog"] textarea').clear()
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.get('[data-cy="editor-content"] img').eq(1).should('have.attr', 'alt', 'Image without description')
    cy.then(() => {
      const html = new DOMParser().parseFromString(ref.current?.getHTML() ?? '', 'text/html')
      expect(html.querySelectorAll('img')[1].hasAttribute('alt')).to.equal(false)
    })
  })

  it('saves a description with the note and preserves the title, tags, and images through read and reopen', () => {
    const save = cy.stub().as('saveNote')
    cy.mount(<NoteEditor initialTitle="My note" initialDescription={twoPictures} initialTags="work, ideas" isSaving={false} onSave={save} onRead={cy.stub()} />)
    cy.get('[data-cy="image-button"]').click()
    cy.contains('button', 'Image description').click()
    cy.get('[role="dialog"] textarea').type('First image')
    cy.contains('[role="dialog"] button', 'Save').click()
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@saveNote').should('have.been.calledOnce')
    cy.then(() => {
      const saved = save.firstCall.args[0] as { title: string; description: string; tags: string }
      expect(saved.title).to.equal('My note')
      expect(saved.tags).to.equal('work, ideas')
      expect(saved.description).to.include('alt="First image"')
      expect(saved.description).to.include(pictureOne).and.include(pictureTwo)
      expect(saved.description).to.include('width="64"').and.include('height="32"')
      cy.mount(<NoteView note={{ id: '1', user_id: '1', title: saved.title, description: saved.description, tags: ['work', 'ideas'], created_at: '2026-01-01', updated_at: '2026-01-01' }} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} />)
    })
    cy.contains('My note').should('be.visible')
    cy.contains('work').should('be.visible')
    cy.get(`img[src="${pictureOne}"]`).should('have.attr', 'alt', 'First image')
    cy.get(`img[src="${pictureTwo}"]`).should('have.attr', 'alt', 'Existing description')
    cy.then(() => {
      const saved = save.firstCall.args[0] as { title: string; description: string; tags: string }
      cy.mount(<NoteEditor initialTitle={saved.title} initialDescription={saved.description} initialTags={saved.tags} isSaving={false} onSave={cy.stub()} onRead={cy.stub()} />)
    })
    cy.get('[placeholder="Note title"]').should('have.value', 'My note')
    cy.get('[data-cy="interactive-tag"]').should('have.length', 2)
    cy.get('[data-cy="editor-content"] img').first().should('have.attr', 'alt', 'First image')
  })
})
