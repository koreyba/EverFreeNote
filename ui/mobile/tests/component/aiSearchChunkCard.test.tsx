import { fireEvent, render, screen } from '../testUtils'
import { AiSearchChunkCard } from '@ui/mobile/components/search/AiSearchChunkCard'

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      card: '#101820',
      border: '#2d3748',
      accent: '#1f2937',
      primary: '#22c55e',
      foreground: '#f8fafc',
    },
  }),
}))

jest.mock('@ui/mobile/components/tags/TagList', () => ({
  TagList: ({ tags, onTagPress }: { tags: string[]; onTagPress?: (tag: string) => void }) => {
    const React = require('react')
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID="tag-list">
        {tags.map((tag) => (
          <Pressable key={tag} testID={`tag-${tag}`} onPress={() => onTagPress?.(tag)}>
            <Text>{tag}</Text>
          </Pressable>
        ))}
      </View>
    )
  },
}))

describe('AiSearchChunkCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('opens the note in context with the selected chunk offset and length', () => {
    const onOpenInContext = jest.fn()
    const bodyContent = 'A focused chunk of text'
    const content = 'Section: Semantic note\n\nA focused chunk of text\n\nTags: philosophy, science'

    render(
      <AiSearchChunkCard
        chunk={{
          noteId: 'note-7',
          noteTitle: 'Semantic note',
          noteTags: ['philosophy', 'science'],
          chunkIndex: 2,
          charOffset: 144,
          bodyContent,
          overlapPrefix: '',
          content,
          similarity: 0.82,
        }}
        onOpenInContext={onOpenInContext}
      />
    )

    fireEvent.press(screen.getByTestId('ai-chunk-card-note-7-2'))

    expect(onOpenInContext).toHaveBeenCalledWith({
      id: 'note-7',
      title: 'Semantic note',
      tags: ['philosophy', 'science'],
    }, 144, bodyContent.length)
    expect(screen.getByText(bodyContent)).toBeTruthy()
    expect(screen.queryByText(content)).toBeNull()
    expect(screen.getByText('82%')).toBeTruthy()
  })

  it('renders tags and forwards tag presses', () => {
    const onTagPress = jest.fn()
    const bodyContent = 'Chunk content'
    const content = 'Section: Untitled\n\nChunk content\n\nTags: alpha'

    render(
      <AiSearchChunkCard
        chunk={{
          noteId: 'note-7',
          noteTitle: '',
          noteTags: ['alpha'],
          chunkIndex: 0,
          charOffset: 12,
          bodyContent,
          overlapPrefix: '',
          content,
          similarity: 0.5,
        }}
        onOpenInContext={jest.fn()}
        onTagPress={onTagPress}
      />
    )

    expect(screen.getByText('Untitled')).toBeTruthy()
    expect(screen.getByText(bodyContent)).toBeTruthy()
    expect(screen.queryByText(content)).toBeNull()

    fireEvent.press(screen.getByTestId('tag-alpha'))

    expect(onTagPress).toHaveBeenCalledWith('alpha')
  })
})
