/* global React */
const { useState } = React;

// =====================================================================
// SHARED PRIMITIVES
// =====================================================================

const Ion = ({ name, size = 18, color = 'currentColor', style = {} }) => {
  // Minimal SVG icon set matching the icons used in the source app
  const paths = {
    'home': 'M3 12L12 4l9 8M5 10v10h14V10',
    'home-outline': 'M3 12L12 4l9 8M5 10v10h14V10',
    'barbell': 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12',
    'barbell-outline': 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12',
    'calendar': 'M4 6h16v15H4zM8 3v4M16 3v4M4 10h16',
    'calendar-outline': 'M4 6h16v15H4zM8 3v4M16 3v4M4 10h16',
    'trending-up': 'M3 17l6-6 4 4 8-8M14 7h7v7',
    'trending-up-outline': 'M3 17l6-6 4 4 8-8M14 7h7v7',
    'person': 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-7 8-7s8 3 8 7',
    'person-outline': 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-7 8-7s8 3 8 7',
    'flame-outline': 'M12 3c0 4-5 5-5 10a5 5 0 0010 0c0-2-1-3-2-4 0 2-1 3-2 3 0-3 2-5-1-9z',
    'time-outline': 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
    'body-outline': 'M12 5a2 2 0 100-4 2 2 0 000 4zM12 7v6M9 11l3-1 3 1M10 21l2-8 2 8',
    'heart-outline': 'M12 20s-7-4-7-10a4 4 0 017-3 4 4 0 017 3c0 6-7 10-7 10z',
    'fitness-outline': 'M3 12h2l2-5 4 10 3-7 2 4h5',
    'walk-outline': 'M13 5a2 2 0 100-4 2 2 0 000 4zM10 22l2-8-3-3 2-5 3 4 3 1M14 13l-2 9',
    'leaf-outline': 'M5 19c8 2 14-4 14-14-8 0-14 6-14 14zM5 19l5-5',
    'chevron-up': 'M5 15l7-7 7 7',
    'chevron-down': 'M5 9l7 7 7-7',
    'chevron-back': 'M15 18l-6-6 6-6',
    'chevron-forward': 'M9 18l6-6-6-6',
    'add-circle-outline': 'M12 8v8M8 12h8M12 21a9 9 0 100-18 9 9 0 000 18z',
    'close': 'M6 6l12 12M18 6L6 18',
    'pencil': 'M4 20h4l11-11-4-4L4 16v4z',
    'checkmark': 'M5 13l4 4 10-10',
    'search-outline': 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4-4',
    'restaurant-outline': 'M5 3v8a2 2 0 002 2v8M9 3v8M19 3c-2 2-3 4-3 7v3h3v8',
    'create-outline': 'M11 4H4v16h16v-7M18 2l4 4-10 10H8v-4z',
  };

  const d = paths[name] || paths['add-circle-outline'];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      <path d={d} />
    </svg>
  );
};

// Status bar — iOS-style time + signals
const StatusBar = ({ tone = 'light' }) => {
  const c = tone === 'light' ? '#fff' : '#000';
  return (
    <div style={{
      height: 44, padding: '0 22px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      fontFamily: '-apple-system, "SF Pro Text", system-ui',
      color: c, fontSize: 15, fontWeight: 600,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 13 }}>●●●●</span>
        <span style={{ fontSize: 13 }}>📶</span>
        <div style={{ width: 22, height: 11, border: `1.5px solid ${c}`, borderRadius: 3, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 1, background: c, borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
};

const TabBar = ({ active = 'home', tone = 'current' }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'workouts', label: 'Workouts', icon: 'barbell' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar' },
    { id: 'progress', label: 'Progress', icon: 'trending-up' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];
  return (
    <div className="tabbar">
      {tabs.map(t => (
        <div key={t.id} className={`tab ${active === t.id ? 'active' : ''}`}>
          <div className="ic"><Ion name={t.icon} size={22} /></div>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
};

// =====================================================================
// CURRENT SCREENS — recreated faithfully from the source code
// =====================================================================

const CurrentHome = () => {
  return (
    <div className="phone-screen current" style={{ position: 'relative' }}>
      <StatusBar tone="light" />
      <div style={{ background: '#1F2937', padding: '20px 20px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#58d8db' }}>Your Progress</div>
        <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Track your fitness journey</div>
      </div>

      {/* Time period pills */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 15px', background: '#1F2937', borderBottom: '1px solid #374151' }}>
        {['Week', 'Month', 'Year', 'All Time'].map((p, i) => (
          <div key={p} style={{
            padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            background: i === 0 ? '#283b89' : '#374151',
            color: i === 0 ? '#fff' : '#6B7280',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Ion name="calendar-outline" size={13} color={i === 0 ? '#fff' : '#6B7280'} />
            {p}
          </div>
        ))}
      </div>

      {/* Metric pills */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 15px', background: '#1F2937', borderBottom: '1px solid #374151', overflow: 'hidden' }}>
        {['Calories Burned', 'Body Weight', 'Workouts', 'Duration'].map((p, i) => (
          <div key={p} style={{
            padding: '10px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            background: i === 0 ? '#283b89' : '#374151',
            color: i === 0 ? '#fff' : '#6B7280', flexShrink: 0,
          }}>{p}</div>
        ))}
      </div>

      {/* Chart card */}
      <div style={{
        background: '#1F2937', margin: 18, padding: 18, borderRadius: 15,
        border: '1px solid #374151',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db' }}>Calories Burned (kcal)</div>
          <div style={{ background: '#283b89', padding: '4px 10px', borderRadius: 12, fontSize: 11, color: '#fff', fontWeight: 600 }}>Week</div>
        </div>
        {/* Crude chart shape */}
        <svg width="100%" height="160" viewBox="0 0 300 160">
          <path d="M 10 100 Q 50 90, 70 95 T 130 80 T 190 60 T 250 50 T 290 90"
                fill="none" stroke="#283b89" strokeWidth="2.5"/>
          {[10,70,130,190,250,290].map((x,i) => {
            const y = [100,95,80,60,50,90][i];
            return <circle key={i} cx={x} cy={y} r="5" fill="#283b89" stroke="#283b89" strokeWidth="2"/>;
          })}
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>(
            <text key={d} x={10+(i*46)} y="155" fontSize="10" fill="#58d8db">{d}</text>
          ))}
        </svg>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '0 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#58d8db' }}>Quick Stats</div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>Week Overview</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Calories This Week', value: '2,450', icon: 'flame-outline', c: '#FF6B6B' },
            { label: 'Workouts This Week', value: '4', icon: 'barbell-outline', c: '#4CAF50' },
            { label: 'Current Weight (kg)', value: '74.1', icon: 'body-outline', c: '#2196F3' },
            { label: 'Total Minutes This Week', value: '210', icon: 'time-outline', c: '#9C27B0' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#1F2937', padding: 14, borderRadius: 12,
              border: '1px solid #374151', textAlign: 'center',
            }}>
              <Ion name={s.icon} size={22} color={s.c} />
              <div style={{ fontSize: 22, fontWeight: 700, color: '#58d8db', marginTop: 6 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <TabBar active="home" />

      {/* Critique pins */}
      <div className="crit" style={{ top: 60, right: 12 }}>
        <div className="pin">1</div>
        <div className="label">Generic title — no identity</div>
      </div>
      <div className="crit" style={{ top: 165, left: 12 }}>
        <div className="pin">2</div>
        <div className="label">Pill soup — 2 rows of pills before any data</div>
      </div>
      <div className="crit" style={{ top: 330, right: 12 }}>
        <div className="pin">3</div>
        <div className="label">Cyan labels on dark = low contrast</div>
      </div>
      <div className="crit" style={{ top: 555, left: 12 }}>
        <div className="pin">4</div>
        <div className="label">Random rainbow icons clash with brand</div>
      </div>
    </div>
  );
};

const CurrentWorkouts = () => {
  return (
    <div className="phone-screen current" style={{ position: 'relative' }}>
      <StatusBar tone="light" />
      <div style={{ padding: '12px 20px 16px' }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#58d8db' }}>Workout Log</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>6 sessions recorded</div>
      </div>

      <div className="scroll-area" style={{ paddingTop: 0 }}>
        {/* Day header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#58d8db' }}>Today</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>1 session · 52 min</div>
          </div>
          <Ion name="chevron-up" size={18} color="#6B7280" />
        </div>

        {/* Session card */}
        <div style={{ background: '#1F2937', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db' }}>Leg Day</div>
            <div style={{ background: '#283b89', borderRadius: 12, padding: '3px 9px' }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>52 min</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>09:30 AM</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ion name="barbell-outline" size={13} color="#6B7280" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>7 exercises</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ion name="flame-outline" size={13} color="#F59E0B" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>380 kcal</span>
            </div>
          </div>
        </div>

        {/* Day header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#58d8db' }}>Yesterday</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>1 session · 25 min</div>
          </div>
          <Ion name="chevron-up" size={18} color="#6B7280" />
        </div>

        <div style={{ background: '#1F2937', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db' }}>HIIT Cardio</div>
            <div style={{ background: '#283b89', borderRadius: 12, padding: '3px 9px' }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>25 min</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>07:00 AM</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ion name="barbell-outline" size={13} color="#6B7280" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>8 exercises</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ion name="flame-outline" size={13} color="#F59E0B" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>310 kcal</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#1F2937', borderRadius: 14, padding: 14, marginBottom: 10, border: '1px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db' }}>Upper Body Push</div>
            <div style={{ background: '#283b89', borderRadius: 12, padding: '3px 9px' }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>45 min</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 10 }}>06:30 PM</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Ion name="barbell-outline" size={13} color="#6B7280" />
              <span style={{ fontSize: 12, color: '#6B7280' }}>6 exercises</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA */}
      <div style={{
        position: 'absolute', bottom: 90, left: 18, right: 18,
        background: '#283b89', padding: 14, borderRadius: 25,
        textAlign: 'center', color: '#fff', fontSize: 16, fontWeight: 600,
      }}>+ Log Workout</div>

      <TabBar active="workouts" />

      {/* Critique */}
      <div className="crit" style={{ top: 200, right: 8 }}>
        <div className="pin">1</div>
        <div className="label">Cards all look identical — no signal</div>
      </div>
      <div className="crit" style={{ top: 130, right: 8 }}>
        <div className="pin">2</div>
        <div className="label">Navy pill on dark is invisible</div>
      </div>
      <div className="crit" style={{ bottom: 175, left: 8 }}>
        <div className="pin">3</div>
        <div className="label">CTA blends into page — needs glow / accent</div>
      </div>
    </div>
  );
};

const CurrentCalendar = () => {
  const days = Array.from({length: 35}, (_, i) => i - 2); // -2..32
  const marked = new Set([20, 21, 22, 23, 24]);
  const selected = 22;

  return (
    <div className="phone-screen current" style={{ position: 'relative' }}>
      <StatusBar tone="light" />
      <div style={{ padding: '12px 20px 16px' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#58d8db' }}>January 2025</div>
      </div>

      <div style={{ background: '#1F2937', margin: '0 16px', borderRadius: 14, padding: 14, border: '1px solid #374151' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {days.map((d,i) => {
            const isValid = d >= 1 && d <= 31;
            const isSel = d === selected;
            const isMark = marked.has(d);
            return (
              <div key={i} style={{
                aspectRatio: '1', display: 'grid', placeItems: 'center',
                fontSize: 13, color: isValid ? '#58d8db' : '#374151',
                background: isSel ? '#283b89' : 'transparent',
                borderRadius: 999, position: 'relative',
              }}>
                {isValid ? d : ''}
                {isMark && !isSel && <div style={{ position:'absolute', bottom: 4, width: 4, height: 4, borderRadius: 999, background: '#10B981' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day data */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#58d8db' }}>2025-01-22</div>
          <Ion name="create-outline" size={22} color="#3B82F6" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'Consumed', v: '2250', u: 'kcal' },
            { l: 'Burned', v: '580', u: 'kcal' },
            { l: 'Net', v: '+1670', u: 'kcal' },
          ].map((s,i) => (
            <div key={i} style={{ background:'#1F2937', padding: 12, borderRadius: 10, border:'1px solid #374151', textAlign:'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#58d8db' }}>{s.v}</div>
              <div style={{ fontSize: 10, color:'#6B7280', marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#1F2937', borderRadius: 12, padding: 14, border:'1px solid #374151' }}>
          <div style={{ fontSize: 13, color:'#6B7280', marginBottom: 8, textTransform:'uppercase', letterSpacing:0.5 }}>Workouts</div>
          <div style={{ display:'flex', gap:8, alignItems:'center', padding: '8px 0' }}>
            <Ion name="checkmark" size={16} color="#10B981" />
            <span style={{ fontSize: 13, color: '#58d8db' }}>Swimming - 45 mins</span>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center', padding: '8px 0' }}>
            <Ion name="checkmark" size={16} color="#10B981" />
            <span style={{ fontSize: 13, color: '#58d8db' }}>Cycling - 30 mins</span>
          </div>
        </div>
      </div>

      <TabBar active="calendar" />

      <div className="crit" style={{ top: 140, right: 8 }}>
        <div className="pin">1</div>
        <div className="label">Single dot = no signal of intensity</div>
      </div>
      <div className="crit" style={{ top: 405, left: 8 }}>
        <div className="pin">2</div>
        <div className="label">"2025-01-22" — raw ISO date is unfriendly</div>
      </div>
    </div>
  );
};

const CurrentProfile = () => (
  <div className="phone-screen current" style={{ position: 'relative' }}>
    <StatusBar tone="light" />
    <div style={{ padding: '12px 20px 0' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#58d8db' }}>Profile</div>
    </div>

    <div style={{ background:'#1F2937', margin: 18, padding: 20, borderRadius: 15, border:'1px solid #374151', textAlign:'center' }}>
      <div style={{ width: 76, height: 76, borderRadius: 999, background:'#283b89', display:'grid', placeItems:'center', margin: '0 auto 10px' }}>
        <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>JD</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#58d8db' }}>John Doe</div>
      <div style={{ fontSize: 14, color:'#6B7280', marginTop: 2 }}>john.doe@example.com</div>
    </div>

    <div style={{ background:'#1F2937', margin: '0 18px 18px', padding: 14, borderRadius: 15, border:'1px solid #374151' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db', marginBottom: 8, padding: '0 4px' }}>Settings</div>
      {['Edit Profile','Notifications','Units (Metric/Imperial)','Theme','Privacy'].map(s => (
        <div key={s} style={{ padding: '12px 4px', borderBottom: '1px solid #374151', fontSize: 15, color: '#58d8db' }}>{s}</div>
      ))}
    </div>

    <div style={{ background:'#1F2937', margin: '0 18px 18px', padding: 14, borderRadius: 15, border:'1px solid #374151' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#58d8db', marginBottom: 8, padding: '0 4px' }}>About</div>
      {['Terms of Service','Privacy Policy','Version 1.0.0'].map(s => (
        <div key={s} style={{ padding: '12px 4px', borderBottom: '1px solid #374151', fontSize: 15, color: '#58d8db' }}>{s}</div>
      ))}
    </div>

    <div style={{ background:'#EF4444', margin: '0 18px', padding: 14, borderRadius: 25, textAlign:'center' }}>
      <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>Sign Out</span>
    </div>

    <TabBar active="profile" />

    <div className="crit" style={{ top: 100, right: 8 }}>
      <div className="pin">1</div>
      <div className="label">No stats — wasted hero space</div>
    </div>
    <div className="crit" style={{ bottom: 165, left: 8 }}>
      <div className="pin">2</div>
      <div className="label">Bright red = destructive. Sign out isn't.</div>
    </div>
    <div className="crit" style={{ top: 320, left: 8 }}>
      <div className="pin">3</div>
      <div className="label">No icons, no chevrons — feels like a list of strings</div>
    </div>
  </div>
);

window.CurrentHome = CurrentHome;
window.CurrentWorkouts = CurrentWorkouts;
window.CurrentCalendar = CurrentCalendar;
window.CurrentProfile = CurrentProfile;
window.Ion = Ion;
window.StatusBar = StatusBar;
window.TabBar = TabBar;
