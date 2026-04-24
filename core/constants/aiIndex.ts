import type { AIIndexStatus, AIIndexMutationResult, AIIndexNoteRow } from "@core/types/aiIndex"

export const AI_INDEX_STATUS_LABELS: Record<AIIndexStatus, string> = {
  indexed: "Indexed",
  not_indexed: "Not indexed",
  outdated: "Outdated",
}

export const AI_INDEX_STATUS_DESCRIPTIONS: Record<AIIndexStatus, string> = {
  indexed: "Available to AI search.",
  not_indexed: "Not searchable by AI yet.",
  outdated: "Changed after the last successful index.",
}

export type AIIndexActionPresentation = {
  label: string
  successToast: string
  successStatus: AIIndexMutationResult["nextStatus"]
  action: "index" | "reindex"
  buttonVariant: "default" | "outline"
}

export function getAIIndexActionPresentation(status: AIIndexStatus): AIIndexActionPresentation {
  if (status === "outdated") {
    return {
      label: "Update index",
      successToast: "Note reindexed",
      successStatus: "indexed",
      action: "reindex",
      buttonVariant: "default",
    }
  }

  if (status === "indexed") {
    return {
      label: "Reindex",
      successToast: "Note reindexed",
      successStatus: "indexed",
      action: "reindex",
      buttonVariant: "outline",
    }
  }

  return {
    label: "Index note",
    successToast: "Note indexed",
    successStatus: "indexed",
    action: "index",
    buttonVariant: "default",
  }
}

export function isAIIndexStatusActionable(status: AIIndexStatus) {
  return status !== "indexed"
}

export function getAIIndexActionableNotes(notes: AIIndexNoteRow[]) {
  return notes.filter((note) => isAIIndexStatusActionable(note.status))
}
