import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Editor',
  robots: 'noindex, nofollow',
}

export default function EditorWebViewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
