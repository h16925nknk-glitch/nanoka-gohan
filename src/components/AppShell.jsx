import { WalletCards } from 'lucide-react'

export default function AppShell({ children, compact = false }) {
  return (
    <main className={compact ? 'app-shell compact' : 'app-shell'}>
      <header className="brand">
        <div className="brand-mark"><WalletCards size={22} /></div>
        <div>
          <strong>七日ごはん</strong>
          <span>一人暮らしの七日間献立</span>
        </div>
      </header>
      {children}
    </main>
  )
}
