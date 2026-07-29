import { useNavigate } from 'react-router-dom'
import { Sparkles, Refrigerator, Clock3, Soup, ArrowRight } from 'lucide-react'
import AppShell from '../components/AppShell'
import { usePlan } from '../context/PlanContext'

export default function Home() {
  const navigate = useNavigate()
  const { settings, setSettings } = usePlan()

  const submit = event => {
    event.preventDefault()
    navigate('/loading')
  }

  return (
    <AppShell>
      <section className="hero">
        <span className="eyebrow">NANOKA GOHAN</span>
        <h1>七日分、<br />ちゃんと食べよう。</h1>
        <p>予算と食材を無駄にしない、<br />一人暮らしのための夜ご飯です。</p>
      </section>

      <form className="planner-form panel" onSubmit={submit}>
        <label>
          <span>今週の夜ご飯予算</span>
          <div className="money-input">
            <strong>¥</strong>
            <input
              type="number"
              min="1500"
              max="12000"
              step="100"
              value={settings.budget}
              onChange={e => setSettings({ ...settings, budget: Number(e.target.value) })}
              required
            />
          </div>
        </label>

        <label>
          <span>苦手な食材 <small>任意</small></span>
          <input
            className="text-input"
            placeholder="例：きのこ、辛いもの"
            value={settings.disliked}
            onChange={e => setSettings({ ...settings, disliked: e.target.value })}
          />
        </label>

        <label>
          <span>よく行くスーパー</span>
          <select
            className="text-input"
            value={settings.supermarket}
            onChange={e => setSettings({ ...settings, supermarket: e.target.value })}
          >
            <option>指定なし（全国平均）</option>
            <option>オーケー</option>
            <option>業務スーパー</option>
            <option>西友</option>
            <option>イオン</option>
            <option>ライフ</option>
            <option>ロピア</option>
            <option>ベルク</option>
            <option>ヤオコー</option>
            <option>その他</option>
          </select>
        </label>

        <fieldset className="shopping-days-field">
          <legend>買い物に行ける曜日</legend>
          <div className="weekday-picker">
            {['月曜日','火曜日','水曜日','木曜日','金曜日','土曜日','日曜日'].map(day => {
              const selected = settings.shoppingDays.includes(day)
              return (
                <button
                  type="button"
                  key={day}
                  className={selected ? 'weekday-button selected' : 'weekday-button'}
                  onClick={() => {
                    const next = selected
                      ? settings.shoppingDays.filter(item => item !== day)
                      : [...settings.shoppingDays, day]
                    if (next.length > 0) {
                      setSettings({ ...settings, shoppingDays: next })
                    }
                  }}
                >
                  {day.replace('曜日','')}
                </button>
              )
            })}
          </div>
          <small>複数選択できます。生鮮品は後半の買い物日に分けて提案します。</small>
        </fieldset>

        <label>
          <span>使える調理器具</span>
          <select
            className="text-input"
            value={settings.equipment}
            onChange={e => setSettings({ ...settings, equipment: e.target.value })}
          >
            <option>フライパン・鍋・電子レンジ</option>
            <option>フライパン・電子レンジ</option>
            <option>電子レンジのみ</option>
          </select>
        </label>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.stapleRice}
            onChange={e => setSettings({ ...settings, stapleRice: e.target.checked })}
          />
          <span>お米・基本調味料は家にある</span>
        </label>

        <button className="primary-button" type="submit">
          <Sparkles size={18} />
          今週の献立をつくる
        </button>
      </form>

      <button
        type="button"
        className="seasoning-link panel"
        onClick={() => navigate('/seasonings')}
      >
        <span className="seasoning-icon"><Soup size={21} /></span>
        <span className="seasoning-copy">
          <small>はじめる前に</small>
          <strong>必要な調味料一覧</strong>
          <em>家にあると便利なものを確認する</em>
        </span>
        <ArrowRight size={20} />
      </button>

      <section className="feature-grid">
        <div><Sparkles size={20}/><strong>予算内</strong><span>1週間の総額を管理</span></div>
        <div><Refrigerator size={20}/><strong>食材使い切り</strong><span>余りを翌日の献立へ</span></div>
        <div><Clock3 size={20}/><strong>5工程以内</strong><span>短く丁寧な作り方</span></div>
      </section>
    </AppShell>
  )
}
