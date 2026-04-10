import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesGraphView } from "./NotesGraphView";
import type { Note } from "@core/types/domain";

const meta: Meta<typeof NotesGraphView> = {
  title: "Features/Notes/NotesGraphView",
  component: NotesGraphView,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh", background: "#fff", overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotesGraphView>;

// Mock notes with various tags to demonstrate the graph connections
const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Getting Started with React",
    description: "Introduction to React hooks and components",
    tags: ["react", "javascript", "frontend"],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-2",
    title: "TypeScript Best Practices",
    description: "Tips for writing clean TypeScript code",
    tags: ["typescript", "javascript", "best-practices"],
    created_at: "2024-01-16T11:00:00Z",
    updated_at: "2024-01-16T11:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-3",
    title: "Building a REST API with Node.js",
    description: "Step by step guide to creating a backend API",
    tags: ["nodejs", "javascript", "backend", "api"],
    created_at: "2024-01-17T09:00:00Z",
    updated_at: "2024-01-17T09:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-4",
    title: "React State Management",
    description: "Comparing Redux, Context, and Zustand",
    tags: ["react", "state-management", "frontend"],
    created_at: "2024-01-18T14:00:00Z",
    updated_at: "2024-01-18T14:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-5",
    title: "CSS Grid and Flexbox",
    description: "Modern CSS layout techniques",
    tags: ["css", "frontend", "design"],
    created_at: "2024-01-19T16:00:00Z",
    updated_at: "2024-01-19T16:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-6",
    title: "Database Design Patterns",
    description: "SQL and NoSQL database patterns",
    tags: ["database", "backend", "best-practices"],
    created_at: "2024-01-20T08:00:00Z",
    updated_at: "2024-01-20T08:00:00Z",
    user_id: "user-1",
  },
];

/**
 * Full graph visualization showing multiple notes connected through shared tags.
 * - Green nodes represent notes
 * - Blue nodes represent tags
 * - Lines connect notes to their tags
 * - Some notes share tags (e.g., "javascript", "frontend", "backend") to show network effect
 */
export const Default: Story = {
  args: {
    notes: mockNotes,
    onNodeClick: (noteId) => console.log("Clicked note:", noteId),
  },
};

/**
 * Empty state when there are no notes to display
 */
export const Empty: Story = {
  args: {
    notes: [],
  },
};

/**
 * Single note with tags
 */
export const SingleNote: Story = {
  args: {
    notes: [mockNotes[0]],
    onNodeClick: (noteId) => console.log("Clicked note:", noteId),
  },
};

/**
 * Notes without any tags
 */
export const NotesWithoutTags: Story = {
  args: {
    notes: [
      {
        id: "note-no-tags-1",
        title: "Note Without Tags 1",
        description: "This note has no tags",
        tags: [],
        created_at: "2024-01-21T10:00:00Z",
        updated_at: "2024-01-21T10:00:00Z",
        user_id: "user-1",
      },
      {
        id: "note-no-tags-2",
        title: "Note Without Tags 2",
        description: "Another note without tags",
        tags: [],
        created_at: "2024-01-22T10:00:00Z",
        updated_at: "2024-01-22T10:00:00Z",
        user_id: "user-1",
      },
    ],
  },
};
