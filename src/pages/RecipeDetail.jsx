import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Flame, Clock3, Utensils, WalletCards } from 'lucide-react'
import AppShell from '../components/AppShell'
import { usePlan } from '../context/PlanContext'

export default function RecipeDetail() {
  const { dayIndex } = useParams()
  const navigate = useNavigate()
  const { plan } = usePlan()

  if (!plan) return <Navigate to="/" replace />

  const item = plan.days[Number(dayIndex)]
  if (!item) return <Navigate to="/plan" replace />

  return (
    <AppShell>
      <button className="ghost-button" onClick={() => navigate('/plan')}>
        <ArrowLeft size={17} /> 1週間の献立へ
      </button>

      <section className="recipe-hero panel">
        <div className="recipe-day">{item.dateLabel}</div>
        <div className="recipe-emoji">{item.emoji}</div>
        <h1>{item.name}</h1>

        <div className="recipe-metrics">
          <span><WalletCards size={18} />¥{item.homeCost}</span>
          <span><Flame size={18} />{item.kcal} kcal</span>
          <span><Clock3 size={18} />{item.time}分</span>
        </div>

        <div className="positive-note">
          <strong>今日のひとこと</strong>
          <p>{item.mood}</p>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INGREDIENTS</span>
            <h2>材料</h2>
          </div>
          <small>1人分</small>
        </div>
        <div className="ingredient-list">
          {item.ingredients.map(([name, amount, unit]) => (
            <div key={`${name}-${amount}`}>
              <span>{name}</span>
              <strong>{amount}{unit}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">5 STEPS</span>
            <h2>作り方</h2>
          </div>
          <Utensils size={20} />
        </div>
        <ol className="steps-list">
          {item.steps.map((step, index) => (
            <li key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="comparison-card">
        <span>外食なら約 ¥{item.outsideCost}</span>
        <strong>今日は ¥{item.savings} お得</strong>
      </section>
    </AppShell>
  )
}
