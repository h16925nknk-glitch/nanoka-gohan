import { ChevronRight, Flame, Clock3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DayCard({ item, index }) {
  const navigate = useNavigate()
  return (
    <button className="day-card" onClick={() => navigate(`/recipe/${index}`)}>
      <div className="day-badge">{item.day}</div>
      <div className="dish-emoji">{item.emoji}</div>
      <div className="day-copy">
        <span>{item.dateLabel}</span>
        <h3>{item.name}</h3>
        <div className="meta-row">
          <span><Flame size={14} />{item.kcal} kcal</span>
          <span><Clock3 size={14} />{item.time}分</span>
        </div>
      </div>
      <div className="day-price">
        <strong>¥{item.homeCost}</strong>
        <small>外食より¥{item.savings}お得</small>
      </div>
      <ChevronRight size={20} />
    </button>
  )
}
