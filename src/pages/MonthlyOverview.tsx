// ============================================
// MY HEALTH BUDDY - Monthly Family Health Overview
// Family score card, individual member scores, trend line, recommendations
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFamily } from '../hooks/useFamily';
import PageHeader from '../components/PageHeader';
import ScoreCircle from '../components/ScoreCircle';
import MemberAvatar from '../components/MemberAvatar';
import {
  calculateFamilyScore,
  calculateAvgCalories,
  calculateMacroBreakdown,
  getMemberScore,
  getWeeklyTrend,
} from '../utils/scoreCalculator';

interface MealRecord {
  id: string;
  family_member_id: string | null;
  food_name: string;
  calories: number | null;
  macros: { carbs?: number; protein?: number; fat?: number } | null;
  health_score: number | null;
  created_at: string;
}

export default function MonthlyOverview() {
  const navigate = useNavigate();
  const { members } = useFamily();
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadMonthlyMeals();
  }, [monthOffset]);

  const loadMonthlyMeals = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMeals([]); return; }
      const { data, error } = await supabase
        .from('meal_history')
        .select('id, family_member_id, food_name, calories, macros, health_score, created_at')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .order('created_at', { ascending: true });
      if (error) { console.error(error); setMeals([]); return; }
      setMeals((data as MealRecord[]) || []);
    } catch (err) {
      console.error(err);
      setMeals([]);
    } finally { setLoading(false); }
  };

  const familyScore = calculateFamilyScore(meals);
  const avgCalories = calculateAvgCalories(meals);
  const { carbsPct, proteinPct, fatPct } = calculateMacroBreakdown(meals);
  const weeklyTrend = getWeeklyTrend(meals, 4);

  // SVG line chart data
  const chartWidth = 300;
  const chartHeight = 100;
  const chartPadding = 10;
  const maxScore = 100;
  const pointSpacing = weeklyTrend.length > 1
    ? (chartWidth - 2 * chartPadding) / (weeklyTrend.length - 1)
    : chartWidth / 2;

  const points = weeklyTrend.map((w, i) => ({
    x: chartPadding + i * pointSpacing,
    y: chartPadding + (chartHeight - 2 * chartPadding) * (1 - w.score / maxScore),
    score: w.score,
    label: w.week,
    meals: w.meals,
  }));

  const pathD = points.length > 1
    ? `M ${points.map((p) => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // Generate recommendations based on data
  const getRecommendations = () => {
    const recs: { emoji: string; text: string }[] = [];
    if (meals.length < 60) {
      recs.push({ emoji: '📊', text: 'Try to log at least 3 meals a day for accurate tracking' });
    }
    if (proteinPct < 20) {
      recs.push({ emoji: '💪', text: 'Increase protein intake — add dal, eggs, or paneer to meals' });
    }
    if (carbsPct > 60) {
      recs.push({ emoji: '🍚', text: 'Consider reducing rice portions and adding more vegetables' });
    }
    if (familyScore < 50) {
      recs.push({ emoji: '🥗', text: 'Focus on adding more greens and balanced meals this month' });
    }
    if (familyScore >= 70) {
      recs.push({ emoji: '🌟', text: 'Great score! Keep maintaining your balanced diet' });
    }
    if (recs.length === 0) {
      recs.push({ emoji: '👍', text: 'Your family is on the right track — keep going!' });
    }
    return recs;
  };

  const recommendations = getRecommendations();

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto w-full" style={{ backgroundColor: '#f4f6f4' }}>
      <header className="px-4 pt-6 pb-2">
        <PageHeader title="Monthly Overview" subtitle="Family health at a glance" />
      </header>

      {/* Month Navigation */}
      <section className="px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o - 1)}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-brand-border transition-colors hover:bg-brand-light"
          style={{ color: '#6ab08c' }}
        >←</button>
        <div className="text-center">
          <p className="font-serif font-semibold text-xl" style={{ color: '#143628' }}>{monthLabel}</p>
          <p className="text-xs mt-0.5" style={{ color: '#7a8c7e' }}>{meals.length} meals logged</p>
        </div>
        <button
          type="button"
          onClick={() => setMonthOffset((o) => o + 1)}
          className="w-12 h-12 rounded-full flex items-center justify-center border border-brand-border transition-colors hover:bg-brand-light"
          style={{ color: '#6ab08c' }}
        >→</button>
      </section>

      {loading ? (
        <main className="flex justify-center py-12">
          <span className="animate-bounce text-2xl">📊</span>
        </main>
      ) : meals.length === 0 ? (
        <main className="px-4 py-8 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-serif text-lg font-semibold mb-2" style={{ color: '#143628' }}>No data for this month</p>
          <p className="text-sm mb-6" style={{ color: '#7a8c7e' }}>Start scanning meals to see your monthly overview!</p>
          <button onClick={() => navigate('/dashboard')} className="py-3 px-6 rounded-full font-semibold text-white" style={{ backgroundColor: '#6ab08c' }}>
            Scan a Meal
          </button>
        </main>
      ) : (
        <main className="px-4 py-4 space-y-5">
          {/* SECTION 1: Family Score */}
          <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <div className="flex items-center justify-center mb-2">
              <ScoreCircle
                score={familyScore}
                size={140}
                strokeWidth={12}
                label="Family Score"
                sublabel={monthLabel}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <p className="text-xs text-brand-text">Meals</p>
                <p className="text-lg font-bold" style={{ color: '#143628' }}>{meals.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-brand-text">Avg Cal</p>
                <p className="text-lg font-bold" style={{ color: '#143628' }}>{avgCalories}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-brand-text">Score</p>
                <p className="text-lg font-bold" style={{ color: '#143628' }}>{familyScore}%</p>
              </div>
            </div>
          </section>

          {/* SECTION 2: Individual Member Scores */}
          {members.length > 0 && (
            <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
              <h2 className="font-serif font-semibold mb-4" style={{ color: '#143628' }}>Individual Scores</h2>
              <div className="space-y-3">
                {members.map((member) => {
                  const memberScore = getMemberScore(meals, member.id);
                  const memberMeals = meals.filter((m) => m.family_member_id === member.id);
                  const scoreColor = memberScore >= 70 ? '#10B981' : memberScore >= 40 ? '#F59E0B' : '#EF4444';
                  return (
                    <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f5f0e8' }}>
                      <MemberAvatar name={member.name} relationship={member.relationship} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-brand-dark">{member.name}</p>
                        <p className="text-xs text-brand-text">{memberMeals.length} meals logged</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Mini score bar */}
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${memberScore}%`, backgroundColor: scoreColor }}
                          />
                        </div>
                        <span className="text-sm font-bold" style={{ color: scoreColor }}>
                          {memberScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION 3: Monthly Trend Line Chart */}
          {weeklyTrend.length > 0 && (
            <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
              <h2 className="font-serif font-semibold mb-3" style={{ color: '#143628' }}>Weekly Trend</h2>
              <div className="flex justify-center">
                <svg
                  width={chartWidth}
                  height={chartHeight + 30}
                  viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
                  className="w-full max-w-[300px]"
                >
                  {/* Grid lines */}
                  <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="#e5e7eb" strokeWidth="1" />
                  <line x1={chartPadding} y1={chartHeight / 2} x2={chartWidth - chartPadding} y2={chartHeight / 2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4" />
                  <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#e5e7eb" strokeWidth="1" />

                  {/* Area fill */}
                  {points.length > 1 && (
                    <path
                      d={`${pathD} L ${points[points.length - 1].x},${chartHeight - chartPadding} L ${points[0].x},${chartHeight - chartPadding} Z`}
                      fill="#a8c4a0"
                      fillOpacity="0.15"
                    />
                  )}

                  {/* Line */}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#6ab08c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Points */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill="#6ab08c" stroke="#FDFBF7" strokeWidth="2" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#6ab08c" fontSize="10" fontWeight="bold">
                        {p.score}
                      </text>
                      <text x={p.x} y={chartHeight + 15} textAnchor="middle" fill="#7a8c7e" fontSize="9">
                        {p.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>
          )}

          {/* SECTION 4: Macro Breakdown */}
          <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <h2 className="font-serif font-semibold mb-3" style={{ color: '#143628' }}>Monthly Macro Split</h2>
            <div className="flex h-6 rounded-full overflow-hidden bg-gray-100 mb-2">
              <div style={{ width: `${carbsPct}%` }} className="bg-amber-400" />
              <div style={{ width: `${proteinPct}%` }} className="bg-emerald-500" />
              <div style={{ width: `${fatPct}%` }} className="bg-rose-400" />
            </div>
            <div className="flex justify-between text-xs text-brand-text">
              <span>Carbs {carbsPct}%</span>
              <span>Protein {proteinPct}%</span>
              <span>Fat {fatPct}%</span>
            </div>
          </section>

          {/* SECTION 5: Recommendations */}
          <section className="rounded-2xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e2d8', boxShadow: '0 2px 12px rgba(90, 70, 50, 0.06)' }}>
            <h2 className="font-serif font-semibold mb-3" style={{ color: '#143628' }}>Recommendations</h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex gap-3 items-start p-3 rounded-xl" style={{ backgroundColor: '#f5f0e8' }}>
                  <span className="text-xl flex-shrink-0">{rec.emoji}</span>
                  <p className="text-sm" style={{ color: '#143628' }}>{rec.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Action Buttons */}
          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                // Generate printable PDF report
                const printWin = window.open('', '_blank');
                if (!printWin) return;
                const memberRows = members.map((m) => {
                  const mScore = getMemberScore(meals, m.id);
                  const mMeals = meals.filter((ml) => ml.family_member_id === m.id);
                  const scoreColor = mScore >= 70 ? '#10B981' : mScore >= 40 ? '#F59E0B' : '#EF4444';
                  const conditions = m.health_conditions?.filter((c) => c !== 'none').join(', ') || 'None';
                  return `
                    <div style="margin-bottom:16px;padding:14px;border:1px solid #ddd;border-radius:10px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;">
                        <div>
                          <h3 style="margin:0;font-size:16px;">${m.name}</h3>
                          <p style="margin:2px 0 0;font-size:12px;color:#666;">${m.relationship || 'Family'} &bull; ${conditions}</p>
                        </div>
                        <div style="text-align:center;">
                          <span style="font-size:24px;font-weight:bold;color:${scoreColor};">${mScore}</span>
                          <span style="font-size:12px;color:#666;">/100</span>
                        </div>
                      </div>
                      <p style="margin:8px 0 0;font-size:12px;color:#888;">Meals logged: ${mMeals.length}</p>
                    </div>`;
                }).join('');
                const recRows = recommendations.map((r) =>
                  `<li style="margin-bottom:6px;">${r.emoji} ${r.text}</li>`
                ).join('');
                printWin.document.write(`
                  <html>
                  <head><title>My Health Buddy - ${monthLabel} Report</title></head>
                  <body style="font-family:Georgia,serif;max-width:600px;margin:40px auto;padding:20px;color:#2D3319;">
                    <div style="text-align:center;margin-bottom:24px;">
                      <h1 style="color:#2d6a4f;margin:0;">Family Health Report</h1>
                      <p style="color:#666;margin:4px 0 0;">${monthLabel}</p>
                    </div>
                    <div style="text-align:center;padding:20px;background:#f0f5eb;border-radius:12px;margin-bottom:24px;">
                      <p style="font-size:48px;font-weight:bold;color:#5C6B4A;margin:0;">${familyScore}</p>
                      <p style="color:#666;margin:4px 0 0;">Family Score (out of 100)</p>
                      <p style="font-size:13px;color:#888;margin:8px 0 0;">${meals.length} meals logged &bull; Avg ${avgCalories} cal/meal</p>
                      <p style="font-size:13px;color:#888;">Macros: Carbs ${carbsPct}% &bull; Protein ${proteinPct}% &bull; Fat ${fatPct}%</p>
                    </div>
                    <h2 style="color:#2d6a4f;">Family Members</h2>
                    ${memberRows}
                    <h2 style="color:#2d6a4f;margin-top:24px;">Recommendations</h2>
                    <ul style="padding-left:20px;font-size:14px;">${recRows}</ul>
                    <hr style="margin:24px 0;border:none;border-top:1px solid #ddd;"/>
                    <p style="font-size:11px;color:#999;text-align:center;">
                      Generated by My Health Buddy (Arogya) &bull; Share with your doctor for personalized guidance
                      <br/>For 1-on-1 consultation: <a href="https://www.myhealthpassport.in/" style="color:#2d6a4f;">www.myhealthpassport.in</a>
                    </p>
                  </body>
                  </html>
                `);
                printWin.document.close();
                printWin.print();
              }}
              className="w-full py-3.5 rounded-full font-semibold text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2d6a4f' }}
            >
              <span role="img" aria-hidden>📄</span> Download Monthly Report (PDF)
            </button>
            <button
              type="button"
              onClick={() => navigate('/weekly')}
              className="w-full py-3.5 rounded-full font-semibold text-white"
              style={{ backgroundColor: '#6ab08c' }}
            >
              View Weekly Details
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 rounded-full font-semibold border-2 transition-colors hover:bg-brand-light"
              style={{ borderColor: '#6ab08c', color: '#6ab08c' }}
            >
              Back to Dashboard
            </button>
          </section>
        </main>
      )}
    </div>
  );
}
