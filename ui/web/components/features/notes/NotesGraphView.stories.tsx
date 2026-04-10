import type { Meta, StoryObj } from "@storybook/react";
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
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NotesGraphView>;

// Mock notes data showing multiple connected notes with tags
const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "Getting Started with React",
    description: "An introduction to React fundamentals and component patterns",
    tags: ["react", "javascript", "tutorial"],
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-2",
    title: "TypeScript Best Practices",
    description: "Essential TypeScript patterns for scalable applications",
    tags: ["typescript", "javascript", "best-practices"],
    created_at: "2024-01-16T14:30:00Z",
    updated_at: "2024-01-16T14:30:00Z",
    user_id: "user-1",
  },
  {
    id: "note-3",
    title: "Next.js App Router Guide",
    description: "Complete guide to Next.js 14 App Router features",
    tags: ["nextjs", "react", "tutorial"],
    created_at: "2024-01-17T09:15:00Z",
    updated_at: "2024-01-17T09:15:00Z",
    user_id: "user-1",
  },
  {
    id: "note-4",
    title: "State Management Patterns",
    description: "Comparing Zustand, Redux, and React Context",
    tags: ["react", "state-management", "best-practices"],
    created_at: "2024-01-18T16:45:00Z",
    updated_at: "2024-01-18T16:45:00Z",
    user_id: "user-1",
  },
  {
    id: "note-5",
    title: "CSS-in-JS vs Tailwind",
    description: "Comparing different styling approaches in React",
    tags: ["css", "tailwind", "react"],
    created_at: "2024-01-19T11:20:00Z",
    updated_at: "2024-01-19T11:20:00Z",
    user_id: "user-1",
  },
  {
    id: "note-6",
    title: "Testing React Components",
    description: "Unit and integration testing with Vitest and Testing Library",
    tags: ["testing", "react", "best-practices"],
    created_at: "2024-01-20T08:00:00Z",
    updated_at: "2024-01-20T08:00:00Z",
    user_id: "user-1",
  },
  {
    id: "note-7",
    title: "GraphQL Fundamentals",
    description: "Introduction to GraphQL queries and mutations",
    tags: ["graphql", "api", "tutorial"],
    created_at: "2024-01-21T13:30:00Z",
    updated_at: "2024-01-21T13:30:00Z",
    user_id: "user-1",
  },
  {
    id: "note-8",
    title: "Docker for Web Developers",
    description: "Containerizing Node.js and Next.js applications",
    tags: ["docker", "devops", "nextjs"],
    created_at: "2024-01-22T10:45:00Z",
    updated_at: "2024-01-22T10:45:00Z",
    user_id: "user-1",
  },
];

/**
 * Default story showing the graph visualization with multiple connected notes.
 * Green nodes represent notes, blue nodes represent tags.
 * Click on a note node to trigger the onNodeClick callback.
 */
export const Default: Story = {
  args: {
    notes: mockNotes,
  },
};

/**
 * Story showing the empty state when no notes are provided.
 */
export const EmptyState: Story = {
  args: {
    notes: [],
  },
};

/**
 * Story with a single note that has multiple tags.
 */
export const SingleNote: Story = {
  args: {
    notes: [
      {
        id: "single-note",
        title: "My Important Note",
        description: "A note with several tags",
        tags: ["important", "work", "todo", "reference"],
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        user_id: "user-1",
      },
    ],
  },
};

/**
 * Story with notes that share many common tags.
 */
export const HighlyConnected: Story = {
  args: {
    notes: [
      {
        id: "h1",
        title: "Frontend Architecture",
        description: "Modern frontend architecture patterns",
        tags: ["architecture", "frontend", "patterns", "react"],
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:00:00Z",
        user_id: "user-1",
      },
      {
        id: "h2",
        title: "Backend Architecture",
        description: "Scalable backend design",
        tags: ["architecture", "backend", "patterns", "nodejs"],
        created_at: "2024-01-16T10:00:00Z",
        updated_at: "2024-01-16T10:00:00Z",
        user_id: "user-1",
      },
      {
        id: "h3",
        title: "Design Patterns in TypeScript",
        description: "Common patterns implemented in TypeScript",
        tags: ["patterns", "typescript", "architecture"],
        created_at: "2024-01-17T10:00:00Z",
        updated_at: "2024-01-17T10:00:00Z",
        user_id: "user-1",
      },
      {
        id: "h4",
        title: "React Performance",
        description: "Optimizing React applications",
        tags: ["react", "performance", "frontend"],
        created_at: "2024-01-18T10:00:00Z",
        updated_at: "2024-01-18T10:00:00Z",
        user_id: "user-1",
      },
      {
        id: "h5",
        title: "Node.js Best Practices",
        description: "Production-ready Node.js patterns",
        tags: ["nodejs", "backend", "patterns", "performance"],
        created_at: "2024-01-19T10:00:00Z",
        updated_at: "2024-01-19T10:00:00Z",
        user_id: "user-1",
      },
    ],
  },
};
