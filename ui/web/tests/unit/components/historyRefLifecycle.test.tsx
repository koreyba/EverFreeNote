import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

describe('React navigation teardown feasibility', () => {
  it('can synchronously capture an editor imperative handle when its route unmounts', () => {
    const Editor = forwardRef<{ capture: () => string }>((_, ref) => {
      const input = useRef<HTMLInputElement>(null)
      useImperativeHandle(ref, () => ({ capture: () => input.current?.value ?? '<missing>' }))
      return <input aria-label="draft" ref={input} defaultValue="original" />
    })
    Editor.displayName = 'Editor'

    function Notes({ capture }: { capture: (value: string) => void }) {
      const editor = useRef<{ capture: () => string }>(null)
      useLayoutEffect(() => () => capture(editor.current?.capture() ?? '<missing handle>'), [capture])
      return <Editor ref={editor} />
    }

    function Layout() {
      const [notes, setNotes] = useState(true)
      const [snapshot, setSnapshot] = useState('none')
      return <>
        <button onClick={() => setNotes(false)}>Settings</button>
        {notes ? <Notes capture={setSnapshot} /> : <output>{snapshot}</output>}
      </>
    }

    render(<Layout />)
    fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'latest input' } })
    fireEvent.click(screen.getByText('Settings'))
    expect(screen.getByText('latest input').textContent).toBe('latest input')
  })
})
