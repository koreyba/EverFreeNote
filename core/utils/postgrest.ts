type ErrorWithCode = {
  code?: unknown
}

export function isPostgrestNoRowsError(error: unknown): error is ErrorWithCode & { code: 'PGRST116' } {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as ErrorWithCode).code === 'PGRST116'
}
