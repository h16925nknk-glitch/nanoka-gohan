import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const responseFormat = {
  type: "json_schema",
  name: "weekly_meal_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "shoppingTrips", "shopping", "days"],
    properties: {
      summary: {
        type: "object",
        additionalProperties: false,
        required: [
          "totalCost",
          "outsideTotal",
          "wasteRate",
          "note",
          "budgetNotice",
        ],
        properties: {
          totalCost: { type: "integer" },
          outsideTotal: { type: "integer" },
          wasteRate: { type: "integer" },
          note: { type: "string" },
          budgetNotice: { type: "string" },
        },
      },
      shoppingTrips: {
        type: "array",
        minItems: 1,
        maxItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["day", "purpose"],
          properties: {
            day: { type: "string" },
            purpose: { type: "string" },
          },
        },
      },
      shopping: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name", "amount", "price", "buyOn"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            amount: { type: "string" },
            price: { type: "integer", minimum: 1 },
            buyOn: { type: "string" },
          },
        },
      },
      days: {
        type: "array",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "day",
            "dateLabel",
            "name",
            "emoji",
            "kcal",
            "homeCost",
            "outsideCost",
            "time",
            "message",
            "ingredients",
            "steps",
          ],
          properties: {
            day: { type: "string" },
            dateLabel: { type: "string" },
            name: { type: "string" },
            emoji: { type: "string" },
            kcal: { type: "integer" },
            homeCost: { type: "integer" },
            outsideCost: { type: "integer" },
            time: { type: "integer" },
            message: { type: "string" },
            ingredients: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["shoppingId", "name", "amount", "usageRate"],
                properties: {
                  shoppingId: { type: "string" },
                  name: { type: "string" },
                  amount: { type: "string" },
                  usageRate: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                  },
                },
              },
            },
            steps: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: { type: "string" },
            },
          },
        },
      },
    },
  },
};

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeBudget(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}

function hasQuantityRevision(input) {
  if (!input.revisionMode) {
    return false;
  }

  const request = String(input.revisionRequest || "");

  return [
    "量",
    "ボリューム",
    "満腹",
    "大盛",
    "増や",
    "食べ応え",
  ].some((keyword) => request.includes(keyword));
}

function getSeason(month) {
  if ([12, 1, 2].includes(month)) return "冬";
  if ([3, 4, 5].includes(month)) return "春";
  if ([6, 7, 8].includes(month)) return "夏";
  return "秋";
}

function buildPrompt(input) {
  const weeklyBudget = normalizeBudget(input.budget);
  const minimumShoppingTotal = Math.round(weeklyBudget * 0.8);
  const targetShoppingTotal = Math.round(weeklyBudget * 0.9);
  const targetUsedCost = Math.round(targetShoppingTotal * 0.9);
  const targetDailyCost = Math.round(targetUsedCost / 7);
  const quantityRevision = hasQuantityRevision(input);

  const currentMonth =
    Number(input.currentMonth) || new Date().getMonth() + 1;
  const season = input.season || getSeason(currentMonth);

  const revisionInstruction = input.revisionMode
    ? `
【再考】
利用者の変更希望:
${input.revisionRequest || "全体をより良く見直してください。"}

現在の献立:
${JSON.stringify(input.previousPlan || {}, null, 2)}

再考ルール:
- 利用者の希望を最優先する。
- 変更不要な料理は可能な範囲で維持する。
- ${
        quantityRevision
          ? "今回は量の増加希望なので、食材のグレードを上げず、購入量・使用量を調整する。"
          : "量の増加希望ではないため、予算に余裕がある場合は量ではなく食材の質を上げる。"
      }
- 再考後も、予算上限、食材使用率、週1回の買い物を守る。
`
    : "";

  return `
${revisionInstruction}

あなたは、日本で一人暮らしをする人向けの「七日ごはん」の献立設計AIです。
夕食7日分を、1日につき料理1品だけ作ってください。

【絶対条件】
- 設定予算: ${weeklyBudget}円
- 買い物合計の最低目標: ${minimumShoppingTotal}円
- 買い物合計の中心目標: ${targetShoppingTotal}円
- 買い物合計の絶対上限: ${weeklyBudget}円
- 7日間で実際に使用する食材原価の目標: 約${targetUsedCost}円
- 1日あたりの使用原価の目安: 約${targetDailyCost}円
- 買い物合計は絶対に設定予算を超えない。
- 原則として買い物合計を設定予算の80%以上にする。
- 米と常備調味料は購入せず、買い物金額にも含めない。
- 買った食材の価格加重使用率を85%以上にする。
- 買い物は指定曜日の1回だけ。途中の買い足しは禁止。
- 1人分、夕食のみ、1日1品、全7日。
- shopping[].priceは、shopping[].amountに記載した購入単位全体の、日本の一般的なスーパーでの概算購入価格。
- days[].ingredients[].usageRateは、その購入単位のうち、その日に使う割合。0より大きく1以下。
- 同じshoppingIdのusageRateを7日分合計した値は、原則0.85以上1以下。
- days[].homeCostとsummary.totalCostはサーバー側で再計算するため、AIが都合よく水増ししない。

【高予算時のルール】
- ${weeklyBudget >= 14000 ? "今回は高予算帯として扱う。" : "今回は通常予算帯として扱う。"}
- 高予算でも、1人では食べ切れない量へ増やしてはいけない。
- ${
    quantityRevision
      ? "今回は量の増加希望なので、食材の品質は維持し、適切な範囲で分量を増やす。"
      : "予算に余裕がある場合は、量ではなく食材をグレードアップする。"
  }
- 高予算では、国産牛、和牛、国産豚の上位部位、地鶏、うなぎ、金目鯛、鯛、鮪、帆立、海老、蟹、いくら、質のよいチーズなどを候補にする。
- 高級食材を使う場合も、7日間の料理として自然で、食材を使い切れる構成にする。
- 安価な食材だけを使い、shoppingのpriceだけを高くする行為は禁止。
- 料理名、材料、購入量、使用割合、価格のすべてを食材のグレードと一致させる。

【利用条件】
- 苦手な食材: ${input.disliked || "なし"}
- 調理器具: ${input.equipment || "電子レンジ、フライパン、鍋、炊飯器"}
- 買い物曜日: ${(input.shoppingDays || []).join("、")}
- 献立モード: ${input.mealMode || "balance"}
- 常備調味料: ${(input.seasonings || []).join("、")}
- 現在の日付: ${input.currentDate || new Date().toLocaleDateString("ja-JP")}
- 現在の月: ${currentMonth}月
- 季節: ${season}

【献立ルール】
1. 7日すべて異なる料理名にする。
2. 1日の料理は1品だけ。ただし1皿の中に主菜と野菜を組み合わせてよい。
3. 同じ購入食材を複数日に計画的に使う。
4. 生魚、生肉、豆腐、葉物など傷みやすいものは前半に使う。
5. 後半に使う肉や魚は、購入日に冷凍することをsummary.noteに書く。
6. 季節の食材を優先する。
7. 手順は3〜5工程。
8. messageは40〜70文字程度で、温かく、毎日異なる表現にする。
9. mealModeがdietなら高たんぱく・野菜多め・低脂質を重視する。
10. mealModeがvolumeなら、食材の質を不自然に下げず、食べ応えを重視する。
11. mealModeがtasteなら、味・香り・食感を重視する。
12. mealModeがbalanceなら、栄養・味・満足感を両立する。
13. 常備調味料はshoppingに入れない。ingredientsには記載してよいが、その場合shoppingIdを"pantry"、usageRateを0にする。
14. shoppingの各idは重複させない。
15. shoppingに存在する食材をingredientsで使う場合、同じshoppingIdを指定する。
16. summary.budgetNoticeは、80%以上使えた場合は空文字にする。
17. どうしても80%に届かない場合だけ、可能な限り高額な内容にしたうえで、summary.budgetNoticeに「この条件では予算が高すぎるため、可能な範囲で作成しました」と書く。
18. summary.noteには、冷凍・保存方法と、使い切れずに残る食材があればその理由を書く。
19. summary.totalCost、summary.wasteRate、days[].homeCostは仮の整数を入れる。サーバーで正しい値へ上書きする。
20. 必ず指定されたJSON形式だけを返す。
`;
}

function preparePlan(rawPlan, input) {
  const budget = normalizeBudget(input.budget);
  const shoppingDay = input.shoppingDays[0];

  const shopping = rawPlan.shopping.map((item, index) => ({
    ...item,
    id: String(item.id || `item-${index + 1}`),
    price: Math.max(1, Math.round(Number(item.price) || 0)),
    buyOn: shoppingDay,
    checked: false,
  }));

  const shoppingById = new Map(
    shopping.map((item) => [item.id, item])
  );

  const days = rawPlan.days.map((day) => ({
    ...day,
    ingredients: day.ingredients.map((ingredient) => ({
      ...ingredient,
      shoppingId: String(ingredient.shoppingId || ""),
      usageRate:
        ingredient.shoppingId === "pantry"
          ? 0
          : clamp(Number(ingredient.usageRate) || 0, 0, 1),
    })),
  }));

  // 同じ購入食材の使用割合が合計100%を超えた場合は、比率を保ったまま100%へ正規化。
  const usageTotals = new Map();

  days.forEach((day) => {
    day.ingredients.forEach((ingredient) => {
      if (!shoppingById.has(ingredient.shoppingId)) return;

      const current = usageTotals.get(ingredient.shoppingId) || 0;
      usageTotals.set(
        ingredient.shoppingId,
        current + ingredient.usageRate
      );
    });
  });

  usageTotals.forEach((totalRate, shoppingId) => {
    if (totalRate <= 1) return;

    const scale = 1 / totalRate;

    days.forEach((day) => {
      day.ingredients.forEach((ingredient) => {
        if (ingredient.shoppingId === shoppingId) {
          ingredient.usageRate *= scale;
        }
      });
    });

    usageTotals.set(shoppingId, 1);
  });

  // 各日の原価を、購入価格 × その日の使用割合で計算。
  const calculatedDays = days.map((day) => {
    const homeCost = day.ingredients.reduce((total, ingredient) => {
      const shoppingItem = shoppingById.get(ingredient.shoppingId);

      if (!shoppingItem) {
        return total;
      }

      return total + shoppingItem.price * ingredient.usageRate;
    }, 0);

    return {
      ...day,
      homeCost: Math.round(homeCost),
      mood: day.message,
      savings: Math.max(
        0,
        Math.round(Number(day.outsideCost) || 0) -
          Math.round(homeCost)
      ),
      ingredients: day.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
      })),
    };
  });

  const totalCost = shopping.reduce(
    (total, item) => total + item.price,
    0
  );

  if (totalCost > budget) {
    const error = new Error(
      `AIの買い物合計が予算を超えました。買い物合計${totalCost.toLocaleString()}円、上限${budget.toLocaleString()}円です。`
    );
    error.statusCode = 422;
    throw error;
  }

  const usedCost = calculatedDays.reduce(
    (total, day) => total + day.homeCost,
    0
  );

  const usageRate =
    totalCost > 0 ? clamp(usedCost / totalCost, 0, 1) : 0;

  const wasteRate = Math.round((1 - usageRate) * 100);
  const minimumTotal = Math.round(budget * 0.8);

  let budgetNotice = String(
    rawPlan.summary?.budgetNotice || ""
  ).trim();

  if (totalCost >= minimumTotal) {
    budgetNotice = "";
  } else if (!budgetNotice) {
    budgetNotice =
      `この条件では予算が高すぎるため、可能な範囲で` +
      `${totalCost.toLocaleString()}円まで使用しました。`;
  }

  const outsideTotal = calculatedDays.reduce(
    (total, day) =>
      total + Math.max(0, Math.round(Number(day.outsideCost) || 0)),
    0
  );

  return {
    ...rawPlan,
    budget,
    totalCost,
    outsideTotal,
    remaining: budget - totalCost,
    savings: outsideTotal - totalCost,
    wasteRate,
    budgetUsageRate: Math.round((totalCost / budget) * 100),
    ingredientUsageRate: Math.round(usageRate * 100),
    budgetNotice,
    summary: {
      ...rawPlan.summary,
      totalCost,
      outsideTotal,
      wasteRate,
      budgetNotice,
    },
    shopping,
    days: calculatedDays,
    createdAt: new Date().toISOString(),
    source: "ai",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POSTのみ利用できます。",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEYが設定されていません。",
    });
  }

  try {
    const input = req.body || {};
    const budget = normalizeBudget(input.budget);

    if (
      budget === null ||
      budget < 3000 ||
      budget > 21000
    ) {
      return res.status(400).json({
        error: "予算は3,000円〜21,000円で入力してください。",
      });
    }

    if (
      !Array.isArray(input.shoppingDays) ||
      input.shoppingDays.length === 0
    ) {
      return res.status(400).json({
        error: "買い物日を選んでください。",
      });
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: buildPrompt({
        ...input,
        budget,
      }),
      text: {
        format: responseFormat,
      },
    });

    if (!response.output_text) {
      throw new Error("AIから献立データを受け取れませんでした。");
    }

    const rawPlan = JSON.parse(response.output_text);
    const plan = preparePlan(rawPlan, {
      ...input,
      budget,
    });

    return res.status(200).json(plan);
  } catch (error) {
    console.error(error);

    const statusCode =
      Number(error?.statusCode) >= 400
        ? Number(error.statusCode)
        : 500;

    return res.status(statusCode).json({
      error:
        statusCode === 422
          ? error.message
          : "AI献立の作成に失敗しました。",
      detail: error?.message || "unknown error",
    });
  }
}
