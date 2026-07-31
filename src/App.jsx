import { useMemo, useState } from "react";
import "./styles/global.css";

const DAY_NAMES = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const SEASONINGS = [
  "塩",
  "こしょう",
  "砂糖",
  "醤油",
  "みりん",
  "料理酒",
  "味噌",
  "酢",
  "サラダ油",
  "ごま油",
  "マヨネーズ",
  "ケチャップ",
  "顆粒だし",
  "コンソメ",
  "鶏ガラスープの素",
];

const MEAL_MODES = [
  {
    value: "balance",
    title: "バランス重視",
    description: "予算・栄養・味をバランスよく",
  },
  {
    value: "diet",
    title: "ダイエット重視",
    description: "高たんぱく・低カロリー",
  },
  {
    value: "volume",
    title: "ボリューム重視",
    description: "満腹感と食べ応えを優先",
  },
  {
    value: "taste",
    title: "味重視",
    description: "おいしさと満足感を優先",
  },
];

function getNextDateForDay(dayName) {
  const targetDay = DAY_NAMES.indexOf(dayName);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const validTargetDay = targetDay >= 0 ? targetDay : today.getDay();
  const difference = (validTargetDay - today.getDay() + 7) % 7;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() + difference);

  return startDate;
}

function getWeekDates(shoppingDay) {
  const startDate = getNextDateForDay(shoppingDay);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      weekday: DAY_NAMES[date.getDay()],
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDateLabel: `${date.getFullYear()}年${
        date.getMonth() + 1
      }月${date.getDate()}日`,
    };
  });
}

async function readApiResponse(response) {
  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("サーバーから正しい形式の結果を受け取れませんでした。");
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.detail ||
        "献立を作成できませんでした。時間をおいてもう一度お試しください。"
    );
  }

  return data;
}
function parsePrice(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateShoppingTotal(shopping = []) {
  return shopping.reduce((total, item) => {
    const price = parsePrice(item.price);

    // priceは「その商品の購入小計」として扱う
    return total + price;
  }, 0);
}
function App() {
  const [budget, setBudget] = useState(4000);
  const [shoppingDay, setShoppingDay] = useState("日曜日");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [mealMode, setMealMode] = useState("balance");

  const [plan, setPlan] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [error, setError] = useState("");

  const weekDates = useMemo(
    () => getWeekDates(shoppingDay),
    [shoppingDay]
  );

  const selectedMeal = plan?.days?.[selectedDayIndex] ?? null;
  const selectedDate = weekDates[selectedDayIndex] ?? null;
const calculatedShoppingTotal = useMemo(
  () => calculateShoppingTotal(plan?.shopping || []),
  [plan]
);

const budgetNumber = Number(budget) || 0;

const budgetUsageRate =
  budgetNumber > 0
    ? calculatedShoppingTotal / budgetNumber
    : 0;

const minimumBudgetAmount = Math.round(budgetNumber * 0.8);
const targetBudgetAmount = Math.round(budgetNumber * 0.9);
  const today = new Date();

const requestBase = {
  budget: Number(budget),
  minimumBudgetUsageRate: 0.8,
targetBudgetUsageRate: 0.9,
maximumBudgetUsageRate: 1,
minimumShoppingTotal: Math.round(Number(budget) * 0.8),
targetShoppingTotal: Math.round(Number(budget) * 0.9),
maximumShoppingTotal: Number(budget),
budgetRules: [
  "買い物リストの合計金額は設定予算の80%以上100%以下にする",
  "目標は設定予算の90%前後",
  "予算が高い場合は食材の質を上げる（量を無駄に増やさない）",
  "shoppingのpriceは各商品の購入小計を入れる",
  "totalCostはshopping内のpriceの合計と一致させる",
],

  disliked: dislikedFoods.trim(),
  equipment: "電子レンジ、フライパン、鍋、炊飯器",
  stapleRice: true,
  supermarket: "未選択",
  shoppingDays: [shoppingDay],
  mealMode,
  seasonings: SEASONINGS,

  currentDate: today.toLocaleDateString("ja-JP"),
  currentMonth: today.getMonth() + 1,
  season:
    [12, 1, 2].includes(today.getMonth() + 1)
      ? "冬"
      : [3, 4, 5].includes(today.getMonth() + 1)
      ? "春"
      : [6, 7, 8].includes(today.getMonth() + 1)
      ? "夏"
      : "秋",
};

  async function generatePlan() {
    setIsLoading(true);
    setError("");
    setPlan(null);
    setSelectedDayIndex(0);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBase),
      });

      const data = await readApiResponse(response);

      setPlan(data);
    } catch (caughtError) {
      console.error(caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "献立を作成できませんでした。"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function revisePlan() {
    if (!plan || isRevising) {
      return;
    }

    setIsRevising(true);
    setError("");

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestBase,
          revisionMode: true,
          revisionRequest:
            revisionRequest.trim() ||
            "全体を見直して、より良い献立にしてください。",
          previousPlan: plan,
        }),
      });

      const data = await readApiResponse(response);

      setPlan(data);
      setSelectedDayIndex(0);
      setRevisionRequest("");
    } catch (caughtError) {
      console.error(caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "献立の再考に失敗しました。"
      );
    } finally {
      setIsRevising(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">一人暮らしの1週間献立</p>
        <h1>七日ごはん</h1>
        <p className="hero-text">
          週1回の買い物で、7日分の夕食をAIが考えます。
        </p>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <p className="section-label">STEP 1</p>
            <h2>今週の設定</h2>
          </div>

          <span className="week-badge">1人分</span>
        </div>

        <label className="field">
          <span>1週間の予算</span>

          <div className="input-with-unit">
            <input
              type="number"
              value={budget}
              min="1000"
              step="100"
              onChange={(event) => setBudget(event.target.value)}
            />
            <span>円</span>
          </div>
        </label>

        <label className="field">
          <span>買い物する曜日</span>

          <select
            value={shoppingDay}
            onChange={(event) => {
              setShoppingDay(event.target.value);
              setSelectedDayIndex(0);
            }}
          >
            {DAY_NAMES.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>

        <div className="meal-mode-section">
          <h3>献立の優先タイプ</h3>

          <div className="meal-mode-grid">
            {MEAL_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={
                  mealMode === mode.value
                    ? "meal-mode-card active"
                    : "meal-mode-card"
                }
                onClick={() => setMealMode(mode.value)}
              >
                <strong>{mode.title}</strong>
                <span>{mode.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="seasoning-section">
          <div className="seasoning-header">
            <div>
              <p className="section-label">常備している前提</p>
              <h3>あると便利な調味料</h3>
            </div>

            <span>{SEASONINGS.length}種類</span>
          </div>

          <div className="seasoning-list">
            {SEASONINGS.map((seasoning) => (
              <span key={seasoning} className="seasoning-chip">
                {seasoning}
              </span>
            ))}
          </div>

          <p className="seasoning-note">
            この一覧は買い物リストに含めず、献立作成時に使えるものとして計算します。
          </p>
        </div>

        <label className="field">
          <span>苦手な食材</span>

          <input
            type="text"
            value={dislikedFoods}
            onChange={(event) => setDislikedFoods(event.target.value)}
            placeholder="例：しいたけ、レバー"
          />
        </label>

        <button
          className="primary-button"
          type="button"
          onClick={generatePlan}
          disabled={isLoading || isRevising}
        >
          {isLoading
            ? "AIが7日分を考えています…"
            : "AIで7日分の献立を作る"}
        </button>

        {error && <p className="error-message">{error}</p>}

        {plan && (
          <div className="plan-result">
            <h2>7日分の献立ができました</h2>

            <p>
  予定金額：約
  {calculatedShoppingTotal.toLocaleString()}円
</p>

            <section className="shopping-list-card">
              <div className="shopping-list-header">
                <div>
                  <p className="section-label">WEEKLY SHOPPING</p>
                  <h2>1週間分の買い物リスト</h2>
                </div>

                <strong>{plan.shopping?.length || 0}品目</strong>
              </div>

              <p className="shopping-list-note">
                この買い物だけで、7日分をまかなう設計です。
              </p>

              <ul className="weekly-shopping-list">
                {plan.shopping?.map((item, index) => (
                  <li key={`${item.name}-${index}`}>
                    <label>
                      <input type="checkbox" />

                      <span className="shopping-item-name">
                        {item.name}
                      </span>
                    </label>

                    <div className="shopping-item-details">
                      <strong>{item.amount}</strong>
                      <span>約{item.price}円</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="shopping-total">
                <span>買い物予定額</span>

                <strong>
                  約
                  calculatedShoppingTotal.toLocaleString()
                  円
                </strong>
              </div>
            </section>

            {plan.days?.length > 0 && (
              <>
                <div className="day-tabs">
                  {plan.days.map((meal, index) => {
                    const weekDate = weekDates[index];

                    return (
                      <button
                        type="button"
                        key={`${weekDate?.fullDateLabel}-${index}`}
                        className={
                          selectedDayIndex === index
                            ? "day-tab active"
                            : "day-tab"
                        }
                        onClick={() => setSelectedDayIndex(index)}
                      >
                        <span className="day-tab-label">
                          {weekDate?.dateLabel}
                        </span>

                        <strong>
                          {weekDate?.weekday || meal.day}
                        </strong>
                      </button>
                    );
                  })}
                </div>

                {selectedMeal && (
                  <article className="meal-card selected-meal">
                    <p className="meal-day">
                      {selectedDate?.fullDateLabel}{" "}
                      {selectedDate?.weekday}
                    </p>

                    <h3>
                      {selectedMeal.emoji} {selectedMeal.name}
                    </h3>

                    <div className="meal-stats">
                      <div className="meal-stat">
                        <span>予算</span>
                        <strong>
                          約{selectedMeal.homeCost}円
                        </strong>
                      </div>

                      <div className="meal-stat">
                        <span>調理時間</span>
                        <strong>{selectedMeal.time}分</strong>
                      </div>

                      <div className="meal-stat">
                        <span>カロリー</span>
                        <strong>
                          {selectedMeal.kcal} kcal
                        </strong>
                      </div>
                    </div>

                    {selectedMeal.message && (
                      <div className="daily-message">
                        <span>今日のひとこと</span>
                        <p>{selectedMeal.message}</p>
                      </div>
                    )}

                    <div className="recipe-section">
                      <h4>材料</h4>

                      <ul className="ingredient-list">
                        {selectedMeal.ingredients?.map(
                          (ingredient, index) => (
                            <li
                              key={`${ingredient.name}-${index}`}
                            >
                              <span>{ingredient.name}</span>
                              <strong>{ingredient.amount}</strong>
                            </li>
                          )
                        )}
                      </ul>

                      <h4>作り方</h4>

                      <ol className="step-list">
                        {selectedMeal.steps?.map((step, index) => (
                          <li key={`${index}-${step}`}>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </article>
                )}

                <div className="revision-section">
                  <div className="revision-header">
                    <div>
                      <p className="section-label">
                        献立を調整
                      </p>
                      <h3>結果を再考する</h3>
                    </div>
                  </div>

                  <div className="revision-options">
                    <button
                      type="button"
                      onClick={() =>
                        setRevisionRequest(
                          "全体の費用をもう少し安くしてください。"
                        )
                      }
                    >
                      もっと安く
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRevisionRequest(
                          "調理工程をもっと簡単にしてください。"
                        )
                      }
                    >
                      もっと簡単に
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRevisionRequest(
                          "全体のカロリーをもう少し抑えてください。"
                        )
                      }
                    >
                      カロリーを抑える
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setRevisionRequest(
                          "全体のボリュームを増やしてください。"
                        )
                      }
                    >
                      ボリュームを増やす
                    </button>
                  </div>

                  <textarea
                    value={revisionRequest}
                    onChange={(event) =>
                      setRevisionRequest(event.target.value)
                    }
                    placeholder="例：魚料理を増やしたい、火曜日だけもっと簡単にしたい"
                    rows={3}
                  />

                  <button
                    type="button"
                    className="revision-submit"
                    onClick={revisePlan}
                    disabled={isRevising || isLoading}
                  >
                    {isRevising
                      ? "再考しています..."
                      : "この内容で再考する"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="summary-card">
        <p className="section-label">今週の予定</p>

        <div className="summary-row">
          <span>予算</span>
          <strong>
            {Number(budget || 0).toLocaleString()}円
          </strong>
        </div>

        <div className="summary-row">
          <span>買い物日</span>
          <strong>{shoppingDay}</strong>
        </div>

        <div className="summary-row">
          <span>献立開始日</span>
          <strong>
            {weekDates[0]?.fullDateLabel}{" "}
            {weekDates[0]?.weekday}
          </strong>
        </div>

        <div className="summary-row">
          <span>買い物回数</span>
          <strong>週1回</strong>
        </div>
      </section>
    </main>
  );
}

export default App;