import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import AppShell from '../components/AppShell'
import { seasonings } from '../data/seasonings'

export default function Seasonings() {
  const navigate = useNavigate()

  return (
    <AppShell>
      <button className="ghost-button" onClick={() => navigate('/')}>
        <ArrowLeft size={17} /> ホームへ戻る
      </button>

      <section className="plan-title seasoning-title">
        <span className="eyebrow">PANTRY GUIDE</span>
        <h1>家にあるといい調味料</h1>
        <p>
          すべてを一度に揃えなくても大丈夫です。
          まずは基本から、使うものだけ少しずつ増やしていきましょう。
        </p>
      </section>

      <div className="seasoning-groups">
        {seasonings.map(group => (
          <section className="panel seasoning-panel" key={group.category}>
            <div className="section-heading">
              <div>
                <span className="eyebrow">SEASONINGS</span>
                <h2>{group.category}</h2>
              </div>
            </div>

            <div className="seasoning-list">
              {group.items.map(([name, description]) => (
                <div className="seasoning-row" key={name}>
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>{name}</strong>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="pantry-note">
        <strong>全部なくても、ちゃんと作れます。</strong>
        <p>
          足りない調味料がある日は、似た味のものや少ない材料で代用して大丈夫。
          食卓は、完璧さよりも今日を少し楽にするためのものです。
        </p>
      </section>
    </AppShell>
  )
}
