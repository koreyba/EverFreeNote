export interface NavigationAdapter {
  navigate(url: string, options?: { replace?: boolean }): Promise<void> | void
}
