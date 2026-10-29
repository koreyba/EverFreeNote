import React from 'react'
import '../../../app/globals.css'
import { NoteEditor } from '../../../ui/web/components/features/notes/NoteEditor'
import { NoteView } from '../../../ui/web/components/features/notes/NoteView'
import { ImageDownloader } from '../../../core/enex/image-downloader'
import { ExportService } from '../../../core/enex/export-service'

const image = '/icons/icon-192.png'
const content = `<p><img src="${image}" alt="Small" width="48" height="48"></p>` +
  `<p><img src="${image}" alt="Rectangle" width="96" height="64"></p>` +
  `<p><img src="${image}" alt="Large" width="480" height="320"></p>` +
  `<p><img src="${image}" alt="Width only" width="100"></p>` +
  `<p><img src="${image}" alt="Height only" height="80"></p>`

const note = {
  id: 'dimensions', user_id: 'isolated-user', title: 'Image sizes', description: content, tags: ['images'],
  created_at: '2026-01-01', updated_at: '2026-01-01',
}

describe('Note image dimensions', { retries: 0 }, () => {
  for (const viewportWidth of [320, 1200]) {
    it(`keeps matching dimensions and proportions in reading and editing at ${viewportWidth}px`, () => {
      cy.viewport(viewportWidth, 720)
      const dimensions: Record<string, { width: number; height: number }> = {}
      const inspect = (mode: 'read' | 'edit') => {
        for (const [name, width, height] of [
          ['Small', 48, 48], ['Rectangle', 96, 64], ['Width only', 100, 100], ['Height only', 80, 80],
        ] as const) {
          cy.get(`img[alt="${name}"]`).should(($image) => {
            expect(($image[0] as HTMLImageElement).naturalWidth).to.equal(192)
            const rect = $image[0].getBoundingClientRect()
            expect(rect.width).to.be.closeTo(width, 0.5)
            expect(rect.height).to.be.closeTo(height, 0.5)
          })
        }
        cy.get('img[alt="Large"]').should(($image) => {
          const rect = $image[0].getBoundingClientRect()
          const parent = $image[0].parentElement!.getBoundingClientRect()
          expect(rect.width).to.be.at.most(parent.width + 0.5)
          expect(rect.width).to.be.at.most(480)
          expect(rect.width / rect.height).to.be.closeTo(1.5, 0.02)
        }).then(($image) => {
          const rect = $image[0].getBoundingClientRect()
          dimensions[mode] = { width: rect.width, height: rect.height }
        })
      }

      cy.mount(<div style={{ display: 'flex', height: 720, width: '100%' }}><NoteView note={note} onEdit={cy.stub()} onDelete={cy.stub()} onTagClick={cy.stub()} onRemoveTag={cy.stub()} /></div>)
      inspect('read')
      cy.screenshot(`image-dimensions-read-${viewportWidth}`)
      cy.mount(<div style={{ display: 'flex', height: 720, width: '100%' }}><NoteEditor initialTitle={note.title} initialDescription={content} initialTags="images" isSaving={false} onSave={cy.stub()} onRead={cy.stub()} /></div>)
      inspect('edit')
      cy.then(() => {
        expect(dimensions.edit.width).to.be.closeTo(dimensions.read.width, 1)
        expect(dimensions.edit.height).to.be.closeTo(dimensions.read.height, 1)
      })
      cy.screenshot(`image-dimensions-edit-${viewportWidth}`)
    })
  }

  it('exports real inline image bytes and keeps them paired with stubbed remote resources', () => {
    const data = 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    const inline = `data:image/gif;base64,${data}`
    const remote = 'https://synthetic.invalid/image.webp'
    const missing = 'https://synthetic.invalid/missing.png'
    const original = `<p><img src="/unsupported.png" alt="relative"><img src="${inline}" width="48" height="32" alt="inline"><img src="${missing}" alt="missing"><img src="${remote}" width="96" height="64" alt="remote"></p>`
    cy.window().then(async (win) => {
      const localFetch = win.fetch.bind(win)
      cy.stub(win, 'fetch').callsFake((url, init) => {
        if (String(url).startsWith('data:')) return localFetch(url, init)
        if (url === remote) return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/webp' } }))
        return Promise.reject(new Error('synthetic failure'))
      })
      let exported: { content: string; resources: Array<{ hash: string; mime: string; data: string }> } | undefined
      const builder = { build: (notes: Array<typeof exported>) => { exported = notes[0]; return '<enex/>' } }
      const noteService = { getNotesByIds: async () => [{ id: '1', title: 'Synthetic', description: original, created_at: '2026-01-01', updated_at: '2026-01-01', tags: [] }] }
      const result = await new ExportService(noteService as never, builder as never, new ImageDownloader()).exportNotes(['1'], 'user')
      expect(result.skippedImages).to.equal(2)
      expect(exported?.resources).to.have.length(2)
      expect(exported?.resources[0]).to.include({ data, mime: 'image/gif' })
      expect(exported?.resources[1]).to.include({ data: 'AQID', mime: 'image/webp' })
      expect(exported?.content).to.contain(`hash="${exported?.resources[0].hash}" width="48" height="32" alt="inline"`)
      expect(exported?.content).to.contain(`hash="${exported?.resources[1].hash}" width="96" height="64" alt="remote"`)
      expect(exported?.content).to.contain(`src="${missing}"`)
      expect(exported?.content).to.contain('src="/unsupported.png"')
    })
  })
})
