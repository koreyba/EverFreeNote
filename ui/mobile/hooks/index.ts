/**
 * Custom hooks for mobile app
 */

export { useNotes, useNote, useAllTags } from './useNotes'
export { useTagManagementData, getTagManagementQueryKey } from './useTagManagement'
export { useTagMutation, useRenameTag, useDeleteTag } from './useTagManagementMutations'
export { useCreateNote, useUpdateNote, useDeleteNote } from './useNotesMutations'
export { useNetworkStatus } from './useNetworkStatus'
export { useOfflineSync } from './useOfflineSync'
export { useSearch } from './useSearch'
export { useOpenNote } from './useOpenNote'
export { useBulkSelection } from './useBulkSelection'
export { useBulkDeleteNotes } from './useBulkDeleteNotes'
export { useRagStatus } from './useRagStatus'
export { useMobileSearchMode } from './useMobileSearchMode'
export { useMobileAIPaginatedSearch } from './useMobileAIPaginatedSearch'
