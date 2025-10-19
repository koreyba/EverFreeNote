import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'EverFreeNote - Your Personal Note-Taking App',
  description: 'Secure, simple, and synced note-taking powered by Supabase',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}