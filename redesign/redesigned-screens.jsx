/* global React */
const { useState } = React;
const Ion = window.Ion;
const StatusBar = window.StatusBar;
const TabBar = window.TabBar;

// =====================================================================
// REDESIGNED SCREENS
// =====================================================================

const RedesignedHome = () => {
  return (
    <div className="phone-screen redesign" style={{ position: 'relative' }}>
      <StatusBar tone="light" />

      {/* Personalized header */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--r-text-3)', fontWeight: 500 }}>Monday, Apr 27</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--r-text)', marginTop: 2 }}>Hey, John</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'linear-gradient(135deg,#58D8DB,#6366F1)', display:'grid', placeItems:'center', color:'#fff', fontWeight:700, fontSize: 14 }}>JD</div>
        </div>
      </div>

      {/* Today hero card */}
      <div style={{ margin: '16px 18px 12px', padding: 18, borderRadius: 22, background: 'linear-gradient(135deg, rgba(88,216,219,0.15) 0%, rgba(99,102,241,0.18) 100%)', border: '1px solid rgba(88,216,219,0.25)', position:'relative', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, color:'var(--r-accent)', fontWeight: 600, letterSpacing: 1.2, textTransform:'uppercase' }}>Today's streak</div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 44, fontWeight: 800, color:'var(--r-text)', lineHeight: 1 }}>12</span>
              <span style={{ fontSize: 16, color:'var(--r-text-2)' }}>days</span>
            </div>
          </div>
          {/* Activity ring */}
          <div style={{ width: 76, height: 76, position:'relative' }}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(88,216,219,0.12)" strokeWidth="7"/>
              <circle cx="38" cy="38" r="30" fill="none" stroke="url(#g1)" strokeWidth="7" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="40" transform="rotate(-90 38 38)"/>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#58D8DB"/>
                  <stop offset="100%" stopColor="#6366F1"/>
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center', flexDirection:'column' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--r-text)' }}>78%</div>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(88,216,219,0.15)' }}>
          {[
            { l: 'Calories', v: '420', sub:'/ 540' },
            { l: 'Active min', v: '52', sub:'/ 60' },
            { l: 'Workouts', v: '1', sub:'/ 1' },
          ].map(s => (
            <div key={s.l} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color:'var(--r-text-3)', textTransform:'uppercase', letterSpacing: 0.8 }}>{s.l}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:3, marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color:'var(--r-text)' }}>{s.v}</span>
                <span style={{ fontSize: 11, color: 'var(--r-text-3)' }}>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Segmented period selector — clean, single row */}
      <div style={{ margin: '4px 18px 14px', display:'flex', background:'var(--r-surface)', borderRadius: 12, padding: 4, border: '1px solid var(--r-border)' }}>
        {['Week','Month','Year','All'].map((p, i) => (
          <div key={p} style={{
            flex:1, textAlign:'center', padding: '8px 0', borderRadius: 9,
            fontSize: 13, fontWeight: 600,
            background: i === 0 ? 'var(--r-surface-2)' : 'transparent',
            color: i === 0 ? 'var(--r-text)' : 'var(--r-text-3)',
            boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
          }}>{p}</div>
        ))}
      </div>

      {/* Chart card with proper hierarchy */}
      <div style={{ margin: '0 18px 14px', padding: 18, background:'var(--r-surface)', borderRadius: 18, border: '1px solid var(--r-border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 12, color:'var(--r-text-3)', fontWeight: 600, letterSpacing: 0.5, textTransform:'uppercase' }}>Calories burned</div>
            <div style={{ fontSize: 28, fontWeight: 800, color:'var(--r-text)', marginTop: 4 }}>2,450 <span style={{ fontSize: 13, color:'var(--r-text-3)', fontWeight: 500 }}>kcal</span></div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(52,211,153,0.12)', padding:'4px 8px', borderRadius: 8 }}>
            <Ion name="trending-up" size={12} color="#34D399" />
            <span style={{ fontSize: 12, color:'#34D399', fontWeight: 600 }}>+8.2%</span>
          </div>
        </div>

        <svg width="100%" height="120" viewBox="0 0 300 120" style={{ marginTop: 6 }}>
          <defs>
            <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58D8DB" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#58D8DB" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d="M 10 80 Q 50 78, 70 75 T 130 60 T 190 35 T 250 28 T 290 50 L 290 120 L 10 120 Z" fill="url(#area)"/>
          <path d="M 10 80 Q 50 78, 70 75 T 130 60 T 190 35 T 250 28 T 290 50" fill="none" stroke="#58D8DB" strokeWidth="2.5"/>
          <circle cx="190" cy="35" r="5" fill="#58D8DB"/>
          <circle cx="190" cy="35" r="10" fill="#58D8DB" opacity="0.25"/>
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6 }}>
          {['M','T','W','T','F','S','S'].map((d,i) => <span key={i} style={{ fontSize: 11, color: i === 4 ? 'var(--r-text)':'var(--r-text-3)', fontWeight: i === 4 ? 700: 500 }}>{d}</span>)}
        </div>
      </div>

      {/* This week stats — typographic, less boxy */}
      <div style={{ margin: '0 18px' }}>
        <div style={{ fontSize: 12, color:'var(--r-text-3)', fontWeight: 600, letterSpacing: 0.5, textTransform:'uppercase', marginBottom: 10 }}>This week</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
          {[
            { l: 'Workouts', v: '4', sub: '+1 vs last', accent:'var(--r-accent)' },
            { l: 'Total time', v: '210', unit:'min', sub:'+25 vs last', accent:'var(--r-accent-2)' },
            { l: 'Avg HR', v: '142', unit:'bpm', sub:'-3 vs last', accent:'#F87171' },
            { l: 'Volume', v: '8.2', unit:'k kg', sub:'+12% vs last', accent:'#34D399' },
          ].map(s => (
            <div key={s.l} style={{ background:'var(--r-surface)', padding: 14, borderRadius: 14, border:'1px solid var(--r-border)' }}>
              <div style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}>{s.l}</div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color:'var(--r-text)' }}>{s.v}</span>
                {s.unit && <span style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}>{s.unit}</span>}
              </div>
              <div style={{ fontSize: 10, color: s.accent, marginTop: 4, fontWeight: 600 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" />

      {/* Win pins */}
      <div className="win" style={{ top: 60, right: 12 }}>
        <div className="pin">1</div>
        <div className="label">Personalized greeting + avatar</div>
      </div>
      <div className="win" style={{ top: 145, left: 8 }}>
        <div className="pin">2</div>
        <div className="label">Hero metric: streak + activity ring</div>
      </div>
      <div className="win" style={{ top: 360, right: 8 }}>
        <div className="pin">3</div>
        <div className="label">Big number, trend delta, area chart</div>
      </div>
      <div className="win" style={{ top: 565, left: 8 }}>
        <div className="pin">4</div>
        <div className="label">Stats include comparisons (was missing)</div>
      </div>
    </div>
  );
};

const RedesignedWorkouts = () => {
  return (
    <div className="phone-screen redesign" style={{ position: 'relative' }}>
      <StatusBar tone="light" />

      <div style={{ padding: '8px 20px 14px' }}>
        <div style={{ fontSize: 13, color:'var(--r-text-3)', fontWeight: 500 }}>This month</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 2 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color:'var(--r-text)' }}>Workouts</div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background:'var(--r-surface)', border:'1px solid var(--r-border)', display:'grid', placeItems:'center' }}>
              <Ion name="search-outline" size={18} color="var(--r-text-2)"/>
            </div>
          </div>
        </div>

        {/* Mini summary bar */}
        <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
          {[
            { l:'Sessions', v:'14' },
            { l:'Hours', v:'9.2' },
            { l:'Volume', v:'32k' },
          ].map(s => (
            <div key={s.l} style={{ flex:1, padding: 12, background:'var(--r-surface)', borderRadius: 12, border:'1px solid var(--r-border)' }}>
              <div style={{ fontSize: 10, color:'var(--r-text-3)', textTransform:'uppercase', letterSpacing: 0.6 }}>{s.l}</div>
              <div style={{ fontSize: 19, fontWeight: 700, color:'var(--r-text)', marginTop: 2 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-area" style={{ paddingTop: 0 }}>
        {/* Day group with timeline rail */}
        <div style={{ position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 8, marginTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color:'var(--r-text)' }}>Today</div>
            <div style={{ flex:1, height:1, background:'var(--r-border)' }}/>
            <div style={{ fontSize: 11, color:'var(--r-text-3)' }}>1 session · 52 min</div>
          </div>

          {/* Differentiated card by category — colored stripe */}
          <div style={{ background:'var(--r-surface)', borderRadius: 16, padding: 14, marginBottom: 10, border:'1px solid var(--r-border)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width: 4, background:'linear-gradient(180deg,#58D8DB,#6366F1)' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingLeft:8 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color:'var(--r-accent)', textTransform:'uppercase', letterSpacing: 0.8 }}>Lower body</span>
                  <span style={{ width: 3, height: 3, background:'var(--r-text-3)', borderRadius:999 }}/>
                  <span style={{ fontSize: 11, color:'var(--r-text-3)' }}>9:30 AM</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color:'var(--r-text)' }}>Leg Day</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color:'var(--r-text)' }}>52<span style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}>m</span></div>
              </div>
            </div>

            <div style={{ display:'flex', gap: 14, marginTop: 12, paddingLeft: 8 }}>
              <div style={{ display:'flex', gap: 5, alignItems:'center' }}>
                <Ion name="barbell-outline" size={13} color="var(--r-text-2)" />
                <span style={{ fontSize: 12, color:'var(--r-text-2)' }}>7 exercises</span>
              </div>
              <div style={{ display:'flex', gap: 5, alignItems:'center' }}>
                <Ion name="flame-outline" size={13} color="var(--r-warn)" />
                <span style={{ fontSize: 12, color:'var(--r-text-2)' }}>380 kcal</span>
              </div>
              <div style={{ background:'rgba(52,211,153,0.15)', padding:'2px 8px', borderRadius: 6, marginLeft:'auto' }}>
                <span style={{ fontSize: 10, color:'#34D399', fontWeight: 700 }}>NEW PR</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 8, marginTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color:'var(--r-text)' }}>Yesterday</div>
          <div style={{ flex:1, height:1, background:'var(--r-border)' }}/>
          <div style={{ fontSize: 11, color:'var(--r-text-3)' }}>1 session · 25 min</div>
        </div>

        <div style={{ background:'var(--r-surface)', borderRadius: 16, padding: 14, marginBottom: 10, border:'1px solid var(--r-border)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width: 4, background:'#F87171' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingLeft:8 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color:'#F87171', textTransform:'uppercase', letterSpacing: 0.8 }}>Cardio</span>
                <span style={{ width: 3, height: 3, background:'var(--r-text-3)', borderRadius:999 }}/>
                <span style={{ fontSize: 11, color:'var(--r-text-3)' }}>7:00 AM</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color:'var(--r-text)' }}>HIIT Cardio</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color:'var(--r-text)' }}>25<span style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}>m</span></div>
          </div>
          <div style={{ display:'flex', gap: 14, marginTop: 12, paddingLeft: 8 }}>
            <div style={{ display:'flex', gap: 5, alignItems:'center' }}>
              <Ion name="flame-outline" size={13} color="var(--r-warn)" />
              <span style={{ fontSize: 12, color:'var(--r-text-2)' }}>310 kcal</span>
            </div>
            <div style={{ display:'flex', gap: 5, alignItems:'center' }}>
              <Ion name="heart-outline" size={13} color="#F87171" />
              <span style={{ fontSize: 12, color:'var(--r-text-2)' }}>168 avg</span>
            </div>
          </div>
        </div>

        <div style={{ background:'var(--r-surface)', borderRadius: 16, padding: 14, marginBottom: 10, border:'1px solid var(--r-border)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width: 4, background:'#6366F1' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingLeft:8 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color:'#6366F1', textTransform:'uppercase', letterSpacing: 0.8 }}>Upper body</span>
                <span style={{ width: 3, height: 3, background:'var(--r-text-3)', borderRadius:999 }}/>
                <span style={{ fontSize: 11, color:'var(--r-text-3)' }}>6:30 PM</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color:'var(--r-text)' }}>Push Day</div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color:'var(--r-text)' }}>45<span style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}>m</span></div>
          </div>
          <div style={{ display:'flex', gap: 14, marginTop: 12, paddingLeft: 8 }}>
            <div style={{ display:'flex', gap: 5, alignItems:'center' }}>
              <Ion name="barbell-outline" size={13} color="var(--r-text-2)" />
              <span style={{ fontSize: 12, color:'var(--r-text-2)' }}>6 exercises</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA — accent gradient with glow */}
      <div style={{
        position: 'absolute', bottom: 96, right: 18,
        background: 'linear-gradient(135deg,#58D8DB,#6366F1)',
        padding: '14px 18px', borderRadius: 999,
        color: '#fff', fontSize: 14, fontWeight: 700,
        display:'flex', alignItems:'center', gap: 8,
        boxShadow: '0 10px 30px rgba(99,102,241,0.45), 0 0 0 4px rgba(88,216,219,0.1)',
      }}>
        <Ion name="add-circle-outline" size={18} color="#fff" />
        Log Workout
      </div>

      <TabBar active="workouts" />

      <div className="win" style={{ top: 100, right: 8 }}>
        <div className="pin">1</div>
        <div className="label">Summary stats answer "how am I doing?"</div>
      </div>
      <div className="win" style={{ top: 235, left: 8 }}>
        <div className="pin">2</div>
        <div className="label">Color stripe = category at a glance</div>
      </div>
      <div className="win" style={{ top: 290, right: 8 }}>
        <div className="pin">3</div>
        <div className="label">PR badge — actual signal, not just data</div>
      </div>
      <div className="win" style={{ bottom: 165, left: 8 }}>
        <div className="pin">4</div>
        <div className="label">FAB with glow — clearly the primary action</div>
      </div>
    </div>
  );
};

const RedesignedCalendar = () => {
  // Build heatmap-style calendar
  const intensity = {
    8: 1, 10: 2, 12: 1,
    15: 3, 16: 2, 18: 4, 19: 1,
    20: 2, 21: 3, 22: 4, 23: 1, 24: 3,
  };
  const days = Array.from({length: 35}, (_, i) => i - 2);
  const selected = 22;

  const heat = (n) => {
    if (!n) return 'transparent';
    return ['transparent','rgba(88,216,219,0.18)','rgba(88,216,219,0.4)','rgba(88,216,219,0.65)','rgba(88,216,219,0.92)'][n];
  };

  return (
    <div className="phone-screen redesign" style={{ position: 'relative' }}>
      <StatusBar tone="light" />

      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize: 13, color:'var(--r-text-3)' }}>2025</div>
            <div style={{ fontSize: 24, fontWeight: 700, color:'var(--r-text)' }}>January</div>
          </div>
          <div style={{ display:'flex', gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background:'var(--r-surface)', border:'1px solid var(--r-border)', display:'grid', placeItems:'center' }}>
              <Ion name="chevron-back" size={16} color="var(--r-text-2)" />
            </div>
            <div style={{ width: 32, height: 32, borderRadius: 999, background:'var(--r-surface)', border:'1px solid var(--r-border)', display:'grid', placeItems:'center' }}>
              <Ion name="chevron-forward" size={16} color="var(--r-text-2)" />
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap calendar */}
      <div style={{ margin: '14px 18px 0' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ fontSize: 10, color:'var(--r-text-3)', textAlign:'center', fontWeight: 600 }}>{d}</div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 6 }}>
          {days.map((d, i) => {
            const valid = d >= 1 && d <= 31;
            const sel = d === selected;
            const itn = intensity[d] || 0;
            return (
              <div key={i} style={{
                aspectRatio:'1',
                borderRadius: 10,
                background: sel ? 'transparent' : heat(itn),
                border: sel ? '2px solid var(--r-accent)' : '1px solid rgba(255,255,255,0.04)',
                display:'grid', placeItems:'center',
                fontSize: 12,
                fontWeight: itn >= 3 ? 700 : 500,
                color: !valid ? 'var(--r-border)' :
                       itn >= 3 ? '#0B1220' :
                       sel ? 'var(--r-accent)' : 'var(--r-text-2)',
              }}>{valid ? d : ''}</div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:6, marginTop: 12 }}>
          <span style={{ fontSize: 10, color:'var(--r-text-3)' }}>Less</span>
          {[1,2,3,4].map(n => <div key={n} style={{ width: 12, height: 12, borderRadius: 3, background: heat(n) }}/>)}
          <span style={{ fontSize: 10, color:'var(--r-text-3)' }}>More</span>
        </div>
      </div>

      {/* Day detail */}
      <div style={{ padding: '18px 20px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color:'var(--r-text)' }}>Wed, Jan 22</div>
            <div style={{ fontSize: 11, color:'var(--r-text-3)' }}>2 workouts · 75 min total</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 12, background:'var(--r-surface)', border:'1px solid var(--r-border)', display:'grid', placeItems:'center' }}>
            <Ion name="pencil" size={16} color="var(--r-text-2)" />
          </div>
        </div>

        {/* Net energy bar */}
        <div style={{ background:'var(--r-surface)', borderRadius: 14, padding: 14, border:'1px solid var(--r-border)', marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color:'var(--r-text-3)', textTransform:'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Net energy balance</span>
            <span style={{ fontSize: 20, fontWeight: 800, color:'var(--r-accent)' }}>+1,670<span style={{ fontSize: 11, color:'var(--r-text-3)', fontWeight: 500 }}> kcal</span></span>
          </div>
          <div style={{ position:'relative', height: 8, borderRadius: 4, background:'rgba(255,255,255,0.05)', overflow:'hidden' }}>
            <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'74%', background:'linear-gradient(90deg,#58D8DB,#6366F1)', borderRadius: 4 }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 10, color:'var(--r-text-3)' }}>In</div>
              <div style={{ fontSize: 14, fontWeight: 700, color:'var(--r-text)' }}>2,250</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize: 10, color:'var(--r-text-3)' }}>Out</div>
              <div style={{ fontSize: 14, fontWeight: 700, color:'var(--r-text)' }}>580</div>
            </div>
          </div>
        </div>

        {/* Workout list */}
        <div style={{ background:'var(--r-surface)', borderRadius: 14, padding: 14, border:'1px solid var(--r-border)' }}>
          <div style={{ fontSize: 11, color:'var(--r-text-3)', textTransform:'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 10 }}>Sessions</div>
          {[
            { c: '#F87171', l:'Cardio', n:'Swimming', d:'45 min' },
            { c: '#6366F1', l:'Cardio', n:'Cycling', d:'30 min' },
          ].map((w,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid var(--r-border)' : 'none' }}>
              <div style={{ width: 6, height: 36, background: w.c, borderRadius: 3 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color:'var(--r-text)' }}>{w.n}</div>
                <div style={{ fontSize: 11, color:'var(--r-text-3)' }}>{w.l}</div>
              </div>
              <div style={{ fontSize: 13, color:'var(--r-text-2)', fontWeight: 600 }}>{w.d}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="calendar" />

      <div className="win" style={{ top: 175, right: 8 }}>
        <div className="pin">1</div>
        <div className="label">Heatmap shows intensity, not just "did/didn't"</div>
      </div>
      <div className="win" style={{ top: 410, left: 8 }}>
        <div className="pin">2</div>
        <div className="label">"Wed, Jan 22" — friendly date</div>
      </div>
      <div className="win" style={{ top: 480, right: 8 }}>
        <div className="pin">3</div>
        <div className="label">Net energy as visual bar, not 3 number boxes</div>
      </div>
    </div>
  );
};

const RedesignedProfile = () => (
  <div className="phone-screen redesign" style={{ position: 'relative' }}>
    <StatusBar tone="light" />

    <div style={{ padding: '8px 20px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color:'var(--r-text)' }}>Profile</div>
        <Ion name="search-outline" size={20} color="var(--r-text-2)" />
      </div>
    </div>

    {/* Hero card with personal stats */}
    <div style={{ margin: '16px 18px 14px', padding: 18, background:'linear-gradient(135deg, rgba(88,216,219,0.12), rgba(99,102,241,0.18))', border: '1px solid rgba(88,216,219,0.2)', borderRadius: 20 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background:'linear-gradient(135deg,#58D8DB,#6366F1)', display:'grid', placeItems:'center', color:'#fff', fontSize: 22, fontWeight: 800, boxShadow:'0 6px 18px rgba(99,102,241,0.4)' }}>JD</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color:'var(--r-text)' }}>John Doe</div>
          <div style={{ fontSize: 12, color:'var(--r-text-3)' }}>Member since Jan 2024</div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 4, marginTop: 16, paddingTop: 14, borderTop:'1px solid rgba(88,216,219,0.15)' }}>
        {[
          { l: 'Workouts', v: '234' },
          { l: 'Streak', v: '12' },
          { l: 'PRs', v: '18' },
        ].map(s => (
          <div key={s.l} style={{ textAlign:'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color:'var(--r-text)' }}>{s.v}</div>
            <div style={{ fontSize: 10, color:'var(--r-text-3)', textTransform:'uppercase', letterSpacing: 0.6, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Settings groups with icons + chevrons */}
    <div style={{ margin: '0 18px 14px', background:'var(--r-surface)', borderRadius: 14, border:'1px solid var(--r-border)', overflow:'hidden' }}>
      {[
        { i:'person-outline', c:'#58D8DB', t:'Edit Profile', s:'Name, email, avatar' },
        { i:'fitness-outline', c:'#6366F1', t:'Goals & Targets', s:'5 workouts/week' },
        { i:'leaf-outline', c:'#34D399', t:'Notifications', s:'Daily reminders on' },
        { i:'body-outline', c:'#FBBF24', t:'Units', s:'Metric (kg, km)' },
      ].map((r, idx, arr) => (
        <div key={r.t} style={{ display:'flex', alignItems:'center', gap: 12, padding: '14px 14px', borderBottom: idx < arr.length - 1 ? '1px solid var(--r-border)' : 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `${r.c}22`, display:'grid', placeItems:'center' }}>
            <Ion name={r.i} size={18} color={r.c} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color:'var(--r-text)' }}>{r.t}</div>
            <div style={{ fontSize: 11, color:'var(--r-text-3)', marginTop: 1 }}>{r.s}</div>
          </div>
          <Ion name="chevron-forward" size={16} color="var(--r-text-3)" />
        </div>
      ))}
    </div>

    <div style={{ margin: '0 18px 18px', background:'var(--r-surface)', borderRadius: 14, border:'1px solid var(--r-border)', overflow:'hidden' }}>
      {['Privacy','Terms','Help & Support'].map((t, idx, arr) => (
        <div key={t} style={{ display:'flex', alignItems:'center', padding: '14px 14px', borderBottom: idx < arr.length - 1 ? '1px solid var(--r-border)' : 'none' }}>
          <div style={{ flex:1, fontSize: 14, color:'var(--r-text)' }}>{t}</div>
          <Ion name="chevron-forward" size={16} color="var(--r-text-3)" />
        </div>
      ))}
    </div>

    {/* Sign out — subtle, not destructive red */}
    <div style={{ margin: '0 18px', padding: 14, borderRadius: 14, border:'1px solid var(--r-border)', background:'transparent', textAlign:'center' }}>
      <span style={{ fontSize: 14, color: 'var(--r-text-2)', fontWeight: 600 }}>Sign out</span>
    </div>

    <TabBar active="profile" />

    <div className="win" style={{ top: 130, right: 8 }}>
      <div className="pin">1</div>
      <div className="label">Hero stats: identity + bragging rights</div>
    </div>
    <div className="win" style={{ top: 320, left: 8 }}>
      <div className="pin">2</div>
      <div className="label">Icons + subtitles = scannable</div>
    </div>
    <div className="win" style={{ bottom: 120, right: 8 }}>
      <div className="pin">3</div>
      <div className="label">Sign-out is ghost, not red alarm</div>
    </div>
  </div>
);

window.RedesignedHome = RedesignedHome;
window.RedesignedWorkouts = RedesignedWorkouts;
window.RedesignedCalendar = RedesignedCalendar;
window.RedesignedProfile = RedesignedProfile;
