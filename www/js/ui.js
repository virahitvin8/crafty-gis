/* ═══════════════════════════════════════════════════════════
   FarmHealth — UI Rendering Module
   ═══════════════════════════════════════════════════════════ */

const FH_UI = (function() {
  'use strict';

  const { $, toast, areaHa } = FH_UTILS;
  const { HEALTH_CLASSES, WEATHER_CODES, CROPS, MOISTURE_COLORS, INDEX_INFO, ONBOARDING_STEPS } = FH_CONFIG;

  // ─── Shared state reference ───
  let _state = null;

  function setStateRef(state) {
    _state = state;
  }

  // ═══════════ AUTHENTICATION (Enhanced Google & Role Mock) ═══════════
  const GOOGLE_ACCOUNTS = [
    { email: 'akshitvinay4636@gmail.com', name: 'Akshit Vinay', role: 'admin', img: '🧔' },
    { email: 'akshitvinay@gmail.com', name: 'Akshit Vinay (Backup)', role: 'admin', img: '👨' },
    { email: 'guest.farmer@gmail.com', name: 'Guest Farmer', role: 'user', img: '🧑‍🌾' }
  ];

  function checkLoginState() {
    // Firebase is already initialized by app.js init()
    const role = localStorage.getItem('fh_auth_role');
    if (!role) {
      document.getElementById('loginModal').classList.add('show');
    } else {
      applyRoleUI(role);
    }
  }

  function handleLogin() {
    const user = $('loginUser').value.trim();
    const pass = $('loginPass').value.trim();
    const err = $('loginError');

    const adminEmails = [
      'akshitvinay4636@gmail.com',
      'akshitvinay@gmail.com',
      'akshitvinay4636y@gmail.com'
    ];

    if (adminEmails.includes(user.toLowerCase()) || (user.toLowerCase() === 'admin' && pass === 'admin') || (user.toLowerCase() === 'admin' && pass === '')) {
      localStorage.setItem('fh_auth_role', 'admin');
      localStorage.setItem('fh_auth_email', user.includes('@') ? user : 'akshitvinay4636@gmail.com');
      localStorage.setItem('fh_auth_name', 'Akshit Vinay');
      err.style.display = 'none';
      document.getElementById('loginModal').classList.remove('show');
      applyRoleUI('admin');
      toast('Welcome back, Admin Akshit!');
    } else if (user.toLowerCase() === 'user' && (pass === 'user' || pass === '')) {
      localStorage.setItem('fh_auth_role', 'user');
      localStorage.setItem('fh_auth_email', 'user@farmhealth.com');
      localStorage.setItem('fh_auth_name', 'Standard User');
      err.style.display = 'none';
      document.getElementById('loginModal').classList.remove('show');
      applyRoleUI('user');
      toast('Welcome back!');
    } else {
      err.style.display = 'block';
    }
  }

  async function handleGoogleLogin() {
    // Try real Firebase Google Sign-In first
    if (typeof FH_FIREBASE !== 'undefined' && FH_FIREBASE.signInWithGoogle) {
      const result = await FH_FIREBASE.signInWithGoogle();
      if (result && result.success) {
        // Firebase onAuthStateChanged will handle UI updates
        return;
      }
      console.warn('[Auth] Firebase Google Sign-In failed, falling back to mock:', result?.error);
    }
    
    // Fallback: mock Google account picker (for demo/testing without Firebase)
    const listEl = $('googleAccountsList');
    if (listEl) {
      listEl.innerHTML = GOOGLE_ACCOUNTS.map(acc => `
        <div onclick="FH.selectGoogleAccount('${acc.email}')" style="display:flex; align-items:center; gap:12px; padding:10px 14px; border-bottom:1px solid #f1f3f4; cursor:pointer; transition:background 0.2s; border-radius:4px;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='transparent'">
          <div style="width:36px; height:36px; border-radius:50%; background:#e8f0fe; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">${acc.img}</div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:500; font-size:0.88rem; color:#3c4043; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${acc.name}</div>
            <div style="font-size:0.75rem; color:#5f6368; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${acc.email}</div>
          </div>
          <div style="font-size:0.7rem; color:#1e7d32; font-weight:bold; border: 1px solid #1e7d32; padding: 2px 6px; border-radius: 4px; text-transform:uppercase;">${acc.role}</div>
        </div>
      `).join('');
    }
    // Hide login modal, show google modal
    document.getElementById('loginModal').classList.remove('show');
    document.getElementById('googleModal').style.display = 'flex';
  }

  function selectGoogleAccount(email) {
    const acc = GOOGLE_ACCOUNTS.find(a => a.email === email);
    if (!acc) return;
    
    localStorage.setItem('fh_auth_role', acc.role);
    localStorage.setItem('fh_auth_email', acc.email);
    localStorage.setItem('fh_auth_name', acc.name);
    
    document.getElementById('googleModal').style.display = 'none';
    document.getElementById('loginModal').classList.remove('show');
    
    applyRoleUI(acc.role);
    toast(`Successfully logged in via Google as ${acc.name}!`, 'ok');
  }

  function applyRoleUI(role) {
    const adminSettings = $('adminSettings');
    if (adminSettings) {
      adminSettings.style.display = role === 'admin' ? 'block' : 'none';
    }
    
    // Show user bar for manual (non-Firebase) logins using localStorage data
    const userBar = document.getElementById('userBar');
    if (userBar && userBar.style.display === 'none') {
      const name = localStorage.getItem('fh_auth_name') || role;
      const email = localStorage.getItem('fh_auth_email') || '';
      const photo = localStorage.getItem('fh_auth_photo') || '';
      
      userBar.style.display = 'flex';
      
      const avatarWrap = document.getElementById('userAvatarWrap');
      if (avatarWrap) {
        avatarWrap.innerHTML = photo
          ? `<img src="${photo}" class="user-avatar" alt="" referrerpolicy="no-referrer">`
          : `<div class="user-avatar-placeholder">${(name || 'U').charAt(0).toUpperCase()}</div>`;
      }
      
      const nameEl = document.getElementById('userDisplayName');
      if (nameEl) nameEl.textContent = name;
      
      const emailEl = document.getElementById('userDisplayEmail');
      if (emailEl) emailEl.textContent = email;
      
      const roleBadge = document.getElementById('userRoleBadge');
      if (roleBadge) {
        roleBadge.textContent = role;
        roleBadge.className = 'user-role-badge ' + role;
      }
    }
  }

  // Update UI after authentik SSO login (called from app.js init)
  function updateLoginUI(user) {
    const role = 'user';
    localStorage.setItem('fh_auth_role', role);
    localStorage.setItem('fh_auth_email', user.email || user.preferred_username || '');
    localStorage.setItem('fh_auth_name', user.name || user.given_name || user.email?.split('@')[0] || 'Farmer');
    document.getElementById('loginModal')?.classList.remove('show');
    document.getElementById('googleModal').style.display = 'none';
    applyRoleUI(role);
    toast('Welcome, ' + (user.name || user.email || '') + '!');
  }

  // ═══════════ SATELLITE SCENES RENDER (Enhanced) ═══════════
  function renderScenes() {
    const el = $('scenesList');
    if (!_state.scenes.length) {
      el.innerHTML = '<div class="advice info">No scenes found. Try increasing cloud cover threshold or search period in Settings.</div>';
      return;
    }
    el.innerHTML = _state.scenes.map((s, i) => {
      const cloudPct = s.cloud;
      const cloudBg = cloudPct < 10 ? '#2ecc71' : cloudPct < 25 ? '#f39c12' : '#e74c3c';
      const quality = cloudPct < 10 ? 'Excellent' : cloudPct < 25 ? 'Good' : 'Poor';
      return `<div class="scene-item ${i === 0 ? 'active' : ''}" onclick="FH.selectScene(${i})">
        <div class="scene-thumb" style="background:linear-gradient(135deg,#1a3826,#0d2013);display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:6px;font-size:1.3rem">🛰️</div>
        <div style="flex:1;min-width:0">
          <div class="scene-date">📅 ${s.date}</div>
          <div class="scene-cloud">☁️ ${cloudPct}% · ${quality}</div>
        </div>
        <div style="text-align:right">
          <span class="scene-badge" style="background:${cloudBg};color:#fff">${cloudPct}%</span>
          <div style="font-size:0.6rem;color:var(--text-faint);margin-top:2px">Sentinel-2 L2A</div>
        </div>
      </div>`;
    }).join('');
    $('scenesCard').style.display = '';
    if (_state.scenes.length > 0) selectScene(0);
  }

  function selectScene(idx) {
    _state.selectedScene = _state.scenes[idx];
    document.querySelectorAll('.scene-item').forEach((el, i) => el.classList.toggle('active', i === idx));
  }

  // ═══════════ WEATHER RENDER ═══════════
  function renderWeather() {
    const w = _state.weatherData;
    if (!w || !w.forecast) {
      $('weatherBody').innerHTML = '<div class="advice info">Weather data unavailable for this location.</div>';
      $('weatherCard').style.display = '';
      return;
    }
    const c = w.forecast.current;
    const d = w.forecast.daily;
    const wDesc = WEATHER_CODES[c?.weather_code] || '🌡️ Unknown';

    let soilMoist = '--',
      soilTemp = '--';
    if (w.forecast.hourly) {
      const sm = w.forecast.hourly.soil_moisture_0_to_1cm;
      const st = w.forecast.hourly.soil_temperature_0cm;
      if (sm?.length) soilMoist = (sm[sm.length - 1] * 100).toFixed(1) + '%';
      if (st?.length) soilTemp = st[st.length - 1].toFixed(1) + '°C';
    }

    let totalPrecip30 = 0;
    if (w.history?.daily?.precipitation_sum) {
      totalPrecip30 = w.history.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
    }

    let html = `
      <div class="stat-grid">
        <div class="stat"><div class="val">${c?.temperature_2m?.toFixed(1) || '--'}°C</div><div class="lbl">Temperature</div></div>
        <div class="stat"><div class="val">${c?.relative_humidity_2m || '--'}%</div><div class="lbl">Humidity</div></div>
        <div class="stat"><div class="val">${c?.wind_speed_10m?.toFixed(1) || '--'}</div><div class="lbl">Wind (km/h)</div></div>
        <div class="stat"><div class="val">${c?.precipitation?.toFixed(1) || '0'}</div><div class="lbl">Precip (mm)</div></div>
      </div>
      <div style="margin-top:8px;font-size:0.82rem;color:var(--text);text-align:center;padding:6px;background:var(--bg-input);border-radius:8px">
        ${wDesc}
      </div>
      <div class="stat-grid" style="margin-top:8px">
        <div class="stat"><div class="val" style="font-size:0.9rem">${soilMoist}</div><div class="lbl">Soil Moisture</div></div>
        <div class="stat"><div class="val" style="font-size:0.9rem">${soilTemp}</div><div class="lbl">Soil Temp</div></div>
        <div class="stat"><div class="val" style="font-size:0.9rem">${c?.et0_fao_evapotranspiration?.toFixed(1) || '--'}</div><div class="lbl">ET₀ (mm)</div></div>
        <div class="stat"><div class="val" style="font-size:0.9rem">${totalPrecip30.toFixed(1)}</div><div class="lbl">30d Rain (mm)</div></div>
      </div>`;

    if (d?.time) {
      html += '<div style="margin-top:10px"><b style="font-size:0.72rem;color:var(--green-light)">7-DAY FORECAST</b></div>';
      html += '<div class="scroll-section" style="max-height:180px">';
      d.time.forEach((date, i) => {
        const day = new Date(date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
        html += `<div class="data-row">
          <span class="dk">${day}</span>
          <span class="dv">${d.temperature_2m_min?.[i]?.toFixed(0) || '-'}–${d.temperature_2m_max?.[i]?.toFixed(0) || '-'}°C</span>
          <span class="dv">💧${d.precipitation_sum?.[i]?.toFixed(1) || '0'}mm</span>
          <span class="dv">${d.precipitation_probability_max?.[i] || 0}%</span>
        </div>`;
      });
      html += '</div>';
    }

    $('weatherBody').innerHTML = html;
    $('weatherCard').style.display = '';
  }

  // ═══════════ TERRAIN RENDER ═══════════
  function renderTerrain() {
    const t = _state.terrainData;
    if (!t) return;

    const slopeColor = t.avgSlope > 5 ? 'var(--orange)' : t.avgSlope > 2 ? 'var(--yellow)' : 'var(--green)';

    $('terrainBody').innerHTML = `
      <div class="stat-grid">
        <div class="stat"><div class="val" style="font-size:0.95rem">${t.eMean.toFixed(1)}m</div><div class="lbl">Avg Elevation</div></div>
        <div class="stat"><div class="val" style="font-size:0.95rem">${(t.eMax - t.eMin).toFixed(1)}m</div><div class="lbl">Relief</div></div>
        <div class="stat"><div class="val" style="font-size:0.95rem;color:${slopeColor}">${t.avgSlope.toFixed(1)}°</div><div class="lbl">Avg Slope</div></div>
        <div class="stat"><div class="val" style="font-size:0.95rem">${t.maxSlope.toFixed(1)}°</div><div class="lbl">Max Slope</div></div>
      </div>
      <div class="data-row" style="margin-top:8px"><span class="dk">Elevation range</span><span class="dv">${t.eMin.toFixed(1)} – ${t.eMax.toFixed(1)} m</span></div>
      <div class="data-row"><span class="dk">Drainage class</span><span class="dv" style="color:${slopeColor}">${t.drainClass}</span></div>
      <div class="data-row"><span class="dk">Slope %</span><span class="dv">${(Math.tan(t.avgSlope * Math.PI / 180) * 100).toFixed(1)}%</span></div>
    `;
    $('terrainCard').style.display = (_state.mode !== 'farmer') ? '' : 'none';
  }

  // ═══════════ SOIL RENDER ═══════════
  function renderSoil() {
    const s = _state.soilData;
    if (!s) return;

    const fmt = (v, scale, unit) => v ? (v / scale).toFixed(1) + unit : 'N/A';
    const ph = fmt(s.phh2o, 10, '');
    const oc = fmt(s.soc, 10, ' g/kg');
    const clay = fmt(s.clay, 10, '%');
    const sand = fmt(s.sand, 10, '%');
    const silt = fmt(s.silt, 10, '%');
    const nitro = fmt(s.nitrogen, 100, ' g/kg');

    const clayVal = s.clay ? s.clay / 10 : 0,
      sandVal = s.sand ? s.sand / 10 : 0;
    let textureClass = 'Loam';
    if (clayVal > 40) textureClass = 'Clay';
    else if (sandVal > 70) textureClass = 'Sandy';
    else if (clayVal > 25 && sandVal > 45) textureClass = 'Sandy clay';
    else if (clayVal < 15 && sandVal > 55) textureClass = 'Sandy loam';

    $('soilBody').innerHTML = `
      <div class="stat-grid cols3">
        <div class="stat"><div class="val" style="font-size:0.9rem">${ph}</div><div class="lbl">pH</div></div>
        <div class="stat"><div class="val" style="font-size:0.9rem">${oc}</div><div class="lbl">Org. Carbon</div></div>
        <div class="stat"><div class="val" style="font-size:0.9rem">${nitro}</div><div class="lbl">Nitrogen</div></div>
      </div>
      <div style="margin-top:8px"><b style="font-size:0.7rem;color:var(--green-light)">TEXTURE (${textureClass})</b></div>
      <div class="bar-row"><div class="bar-name">Clay</div><div class="bar-track"><div class="bar-fill" style="width:${clayVal}%;background:var(--orange)"></div></div><div class="bar-pct">${clay}</div></div>
      <div class="bar-row"><div class="bar-name">Sand</div><div class="bar-track"><div class="bar-fill" style="width:${sandVal}%;background:var(--yellow)"></div></div><div class="bar-pct">${sand}</div></div>
      <div class="bar-row"><div class="bar-name">Silt</div><div class="bar-track"><div class="bar-fill" style="width:${100 - clayVal - sandVal}%;background:var(--cyan)"></div></div><div class="bar-pct">${silt}</div></div>
    `;
    $('soilCard').style.display = (_state.mode !== 'farmer') ? '' : 'none';
  }

  // ═══════════ RESULTS RENDER ═══════════
  function renderResults(analysisData) {
    const { crop, stage, seed, meanNdvi, cnt, cc, dataSource } = analysisData;
    const indexType = _state.currentIndex || 'ndvi';
    const activeClasses = FH_CONFIG.getActiveClasses(indexType);
    
    // Problem area represents classes 0, 1, 2 (stressed/dry zones)
    const prob = ((cc[0] || 0) + (cc[1] || 0) + (cc[2] || 0)) / cnt * 100;
    
    // Generic scoring calculation
    const score = Math.round(Math.min(100, (meanNdvi / (crop?.peak || 0.80)) * 115));

    $('resultsCard').style.display = '';
    $('layerSelectorCard').style.display = '';
    $('mapLegend').style.display = '';
    
    // Show data source badge at the top of results
    const isReal = dataSource !== 'simulated' && dataSource !== undefined;
    const sourceBadge = isReal 
      ? `<span class="badge badge-live" style="font-size:0.65rem">🛰️ LIVE | ${dataSource === 'google-earth-engine' ? 'Google Earth Engine' : 'Sentinel Hub'}</span>`
      : `<span class="badge badge-warn" style="font-size:0.65rem">🔄 DEMO | Simulated</span>`;
    
    // Insert source badge before the stats grid
    const statGrid = $('statGrid');
    if (statGrid) {
      let badgeContainer = document.getElementById('sourceBadge');
      if (!badgeContainer) {
        badgeContainer = document.createElement('div');
        badgeContainer.id = 'sourceBadge';
        badgeContainer.style.cssText = 'margin-bottom:8px;display:flex;align-items:center;gap:6px';
        statGrid.parentNode.insertBefore(badgeContainer, statGrid);
      }
      badgeContainer.innerHTML = sourceBadge + (isReal ? '' : '<span style="font-size:0.6rem;color:var(--text-faint)">Satellite telemetry active</span>');
    }
    
    // Dynamic label for the Average Index stats card
    const indexName = (FH_CONFIG.INDEX_INFO[indexType]?.name || FH_CONFIG.STRESS_INDEX_INFO[indexType]?.name || indexType).toUpperCase();
    const ndviVal = $('statNdvi');
    if (ndviVal) {
      ndviVal.textContent = meanNdvi.toFixed(3);
      if (ndviVal.nextElementSibling) {
        ndviVal.nextElementSibling.textContent = `Avg ${indexName}`;
      }
    }

    $('statScore').textContent = score + '%';
    $('statScore').className = 'val' + (score < 50 ? ' bad' : score < 70 ? ' warn' : '');
    const area = areaHa(_state.fieldLL);
    $('statArea').textContent = area.toFixed(2);
    $('statProblem').textContent = prob.toFixed(1) + '%';
    $('statProblem').className = 'val' + (prob > 30 ? ' bad' : prob > 15 ? ' warn' : '');
    
    // Yield Estimation (Algorithmic)
    const base = 3.0; // generic crop base yield
    const expected = (base * area * (score / 100)).toFixed(2);
    const unit = 'tons';
    
    if ($('statYield')) $('statYield').textContent = expected + ' ' + unit;

    $('bars').innerHTML = activeClasses.map((c, i) => {
      const p = (cc[i] || 0) / cnt * 100;
      return `<div class="bar-row"><div class="bar-name">${c.name}</div><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c.col}"></div></div><div class="bar-pct">${p.toFixed(1)}%</div></div>`;
    }).join('');
  }

  // ═══════════ ADVICE RENDER ═══════════
  function renderAdvice(parts) {
    const ad = _state.analysisData;
    const prob = ad ? (ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100 : 0;
    $('adviceBox').innerHTML = parts.map(p =>
      `<div class="advice ${prob > 40 ? 'bad' : prob > 15 ? '' : 'good'}">${p}</div>`
    ).join('');
  }

  // ═══════════ CHARTS ═══════════
  function renderHealthChart() {
    const ad = _state.analysisData;
    if (!ad) return;
    if (_state.charts.health) _state.charts.health.destroy();

    const indexType = _state.currentIndex || 'ndvi';
    const activeClasses = FH_CONFIG.getActiveClasses(indexType);

    const ctx = $('healthChart').getContext('2d');
    _state.charts.health = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: activeClasses.map(c => c.name),
        datasets: [{
          data: ad.cc.map(c => ((c / ad.cnt) * 100).toFixed(1)),
          backgroundColor: activeClasses.map(c => c.col),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#a3c9ae', font: { size: 10 } } }
        }
      }
    });
    $('chartCard').style.display = '';
  }

  function renderTSChart() {
    if (!_state.tsData.length) return;
    if (_state.charts.ts) _state.charts.ts.destroy();

    const ctx = $('tsChart').getContext('2d');
    _state.charts.ts = new Chart(ctx, {
      type: 'line',
      data: {
        labels: _state.tsData.map(d => d.date),
        datasets: [{
          label: 'True Mean NDVI (Sentinel Hub)',
          data: _state.tsData.map(d => d.ndvi.toFixed(3)),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46,204,113,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#7fa88c' } },
          y: { ticks: { color: '#7fa88c' }, min: 0, max: 1 }
        },
        plugins: { legend: { labels: { color: '#a3c9ae' } } }
      }
    });
    $('tsCard').style.display = (_state.mode === 'researcher') ? '' : 'none';
  }

  // ═══════════ MODAL HELPERS ═══════════
  function openModal(id) { $(id).classList.add('show'); }

  function closeModal(id) { $(id).classList.remove('show'); }

  function showChangeDetection() {
    if (_state.tsData.length < 2) return toast('⚠️ Need at least 2 time points', 'err');
    const sel1 = $('cdDate1'),
      sel2 = $('cdDate2');
    sel1.innerHTML = sel2.innerHTML = _state.tsData.map(d =>
      `<option value="${d.date}">${d.date} (NDVI: ${d.ndvi.toFixed(3)})</option>`
    ).join('');
    sel2.selectedIndex = _state.tsData.length - 1;
    $('cdResults').innerHTML = '';
    openModal('changeModal');
  }

  function runChangeDetection() {
    const d1 = $('cdDate1').value,
      d2 = $('cdDate2').value;
    const ts1 = _state.tsData.find(d => d.date === d1),
      ts2 = _state.tsData.find(d => d.date === d2);
    if (!ts1 || !ts2 || d1 === d2) return toast('⚠️ Select valid different dates', 'err');

    const diff = ts2.ndvi - ts1.ndvi;
    const pctChange = ((diff / ts1.ndvi) * 100).toFixed(1);
    const color = diff > 0 ? 'var(--green)' : diff < -0.05 ? 'var(--red)' : 'var(--yellow)';
    const arrow = diff > 0 ? '[↑]' : diff < -0.05 ? '[↓]' : '[→]';

    $('cdResults').innerHTML = `
      <div class="stat-grid" style="margin-top:10px">
        <div class="stat"><div class="val" style="color:${color}">${arrow} ${diff > 0 ? '+' : ''}${diff.toFixed(3)}</div><div class="lbl">NDVI Change</div></div>
        <div class="stat"><div class="val" style="color:${color}">${pctChange}%</div><div class="lbl">${diff > 0.05 ? 'Improvement' : diff < -0.05 ? 'Decline' : 'Stable'}</div></div>
      </div>
    `;
  }

  // ═══════════ CARD COLLAPSE ═══════════
  function toggleCard(h3) {
    h3.classList.toggle('collapsed');
    const body = h3.nextElementSibling;
    if (body) body.classList.toggle('hidden');
  }

  // ═══════════ USER MODES ═══════════
  function setMode(mode) {
    // Show everything automatically for all modes (Farmer, Student, Researcher unified)
    _state.mode = mode || 'researcher';
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === _state.mode));
    document.querySelectorAll('[data-require]').forEach(el => {
      el.style.display = '';
    });
    
    // Ensure advanced indexes and map selector are always displayed
    const ic = $('indexCard');
    if (ic) ic.style.display = '';
    const ism = $('indexSelectorMap');
    if (ism) ism.style.display = '';
    
    toast(`Active Mode: ${_state.mode.charAt(0).toUpperCase() + _state.mode.slice(1)}`);
  }

  // ═══════════ LEARNING MODULE (Lessons & Quiz) ═══════════
  // Build the colour scale straight from FH_CONFIG.HEALTH_CLASSES so the
  // lessons always show the EXACT same colours/classes as the live analysis
  // (map grid, report bars, doughnut chart and sidebar legend).
  function healthScaleHTML() {
    return '<div class="lesson-scale">' +
      HEALTH_CLASSES.map(c =>
        `<div class="lesson-scale-item"><span class="lesson-swatch" style="background:${c.col}"></span><span>${c.name}</span></div>`
      ).join('') +
      '</div>';
  }

  // NDVI thresholds shown in the lesson match valueToClassColor() in api.js
  // for a generic crop (peak NDVI 0.80): bare soil <0.15, then 40/55/72/88%
  // of the crop peak for Poor / Below avg / Moderate / Healthy / Very healthy.
  const LESSONS = [
    { title: 'Remote Sensing Basics', content: '<h4>What is Remote Sensing?</h4><p>Remote sensing is the science of obtaining information about objects from a distance using satellites or aircraft. In agriculture, we use satellite imagery to monitor crop health without visiting every field.</p><h4>Sentinel-2 Mission</h4><p>Sentinel-2 is a European Space Agency mission with two satellites providing free, open-access imagery globally every 5 days at 10m resolution.</p>' },
    { title: 'Understanding NDVI', content: '<h4>What is NDVI?</h4><p>The Normalized Difference Vegetation Index quantifies vegetation greenness by comparing near-infrared (NIR) and red light reflectance.</p><div class="formula">NDVI = (NIR − Red) / (NIR + Red)</div><h4>The colour scale FarmHealth uses</h4><p>These are the <b>exact same colours</b> the app paints on the map, the report bars, the doughnut chart and the sidebar legend — so what you learn here is what you see in your field analysis:</p>' + healthScaleHTML() + '<h4>NDVI ranges (generic crop, peak 0.80)</h4><ul><li><b>Bare soil / water (brown):</b> NDVI &lt; 0.15 — no crop cover yet</li><li><b>Poor / stressed (red):</b> 0.15 – 0.32 — urgent check needed</li><li><b>Below average (orange):</b> 0.32 – 0.44 — needs nutrients or irrigation</li><li><b>Moderate (yellow):</b> 0.44 – 0.58 — growing, keep monitoring</li><li><b>Healthy (green):</b> 0.58 – 0.70 — good growth, maintain care</li><li><b>Very healthy (dark green):</b> 0.70+ — excellent vigour</li></ul><p>Thresholds scale with your crop\u0027s peak NDVI (wheat 0.80, rice 0.78, sugarcane 0.88), which is why the same map can look different across crops.</p>' },
    { title: 'Vegetation Indices', content: '<h4>Beyond NDVI</h4><p><b>EVI</b> — Better for dense canopies. Uses blue band for atmospheric correction.<br><b>SAVI</b> — Soil-adjusted. Best for sparse vegetation.<br><b>GNDVI</b> — Chlorophyll-sensitive. Great for nitrogen assessment.<br><b>NDMI</b> — Measures leaf water content. Critical for drought detection.<br><b>NDRE</b> — Uses red edge band. Best for mid-to-late season monitoring.</p>' },
    { title: 'Sentinel-2 Bands', content: '<h4>13 Spectral Bands</h4><p><b>B2 (Blue, 490nm):</b> Atmospheric correction<br><b>B3 (Green, 560nm):</b> Chlorophyll assessment<br><b>B4 (Red, 665nm):</b> Chlorophyll absorption — key for NDVI<br><b>B5-7 (Red Edge, 705-783nm):</b> Canopy structure, LAI<br><b>B8 (NIR, 842nm):</b> Biomass, vegetation vigour<br><b>B11-12 (SWIR):</b> Moisture content</p><p><b>Resolution:</b> 10m (B2-4, B8), 20m (red edge, SWIR), 60m (atmospheric)</p>' },
    { title: 'Terrain in Agriculture', content: '<h4>Why Terrain Matters</h4><ul><li><b>Slope <2°:</b> Flat — water stagnation risk</li><li><b>Slope 2-5°:</b> Ideal for most crops</li><li><b>Slope >5°:</b> Erosion risk — consider contour farming</li></ul><p>Terrain affects water distribution, sunlight exposure, and microclimates across your field.</p>' },
    { title: 'Soil Properties', content: '<h4>Key Soil Parameters</h4><p><b>pH:</b> Controls nutrient availability. Ideal: 6.0-7.5<br><b>Organic Carbon:</b> Soil health indicator. >1.5% is good<br><b>Texture:</b> Clay retains water, sand drains fast<br><b>CEC:</b> Soil\'s ability to hold nutrients</p><p>Low NDVI zones often correlate with soil problems — combining soil data with NDVI maps finds the ROOT CAUSE.</p>' },
    { title: 'Weather & Farming', content: '<h4>Key Parameters</h4><p><b>Temperature:</b> >40°C = heat stress, <5°C = frost risk<br><b>Precipitation:</b> Compare 30-day total with crop water need<br><b>Humidity:</b> >85% + warmth = fungal disease risk<br><b>ET₀:</b> Atmospheric water demand. If ET₀ > rainfall, irrigate.</p><p>Combine ET₀ with NDMI for precise irrigation scheduling.</p>' },
    { title: 'Reading Reports', content: '<h4>Understanding Your Report</h4><p><b>Health Score (0-100%):</b> Average NDVI vs crop peak NDVI. Above 80% = excellent.<br><b>Problem Area:</b> Fraction in "Bare soil / Poor / Below avg". Even 10% matters.<br><b>Time Series:</b> Healthy crops show a bell curve — rising at vegetative, peaking at flowering, declining at maturity.</p><h4>The colour scale in your report</h4><p>The report bars, the doughnut chart and the map legend all use these same six colours — a red/orange bar simply means that fraction of the field needs attention:</p>' + healthScaleHTML() + '<p><b>Tip:</b> Hover any coloured cell on the map to see its class, index value and score.</p>' }
  ];

  let currentLesson = 0;

  function openLearning() {
    currentLesson = 0;
    renderLesson();
    openModal('learningModal');
  }

  function renderLesson() {
    const nav = $('lessonNav');
    nav.innerHTML = LESSONS.map((l, i) =>
      `<div class="lesson-dot ${i === currentLesson ? 'active' : i < currentLesson ? 'done' : ''}" onclick="FH.goToLesson(${i})">${i + 1}</div>`
    ).join('');
    $('lessonContent').innerHTML = `<h3 style="color:var(--green-light);margin-bottom:12px">${LESSONS[currentLesson].title}</h3>${LESSONS[currentLesson].content}`;
  }

  function goToLesson(i) { currentLesson = i;
    renderLesson(); }

  function nextLesson() {
    if (currentLesson < LESSONS.length - 1) { currentLesson++;
      renderLesson(); } else toast('All lessons complete!');
  }

  function prevLesson() {
    if (currentLesson > 0) { currentLesson--;
      renderLesson(); }
  }

  // Quiz
  const QUIZ = [
    { q: 'What does NDVI stand for?', opts: ['Normalized Difference Vegetation Index', 'Natural Detection of Vegetation Intensity', 'Normalized Digital Vegetation Image', 'None of the above'], ans: 0 },
    { q: 'Which two Sentinel-2 bands are used for NDVI?', opts: ['Blue and Green', 'Red and NIR (B4 and B8)', 'SWIR and Red Edge', 'Green and NIR'], ans: 1 },
    { q: 'A healthy plant has NDVI of approximately:', opts: ['0.1', '0.3', '0.7', '1.5'], ans: 2 },
    { q: 'What does high NDMI indicate?', opts: ['Dry vegetation', 'High moisture content', 'Bare soil', 'Cloud cover'], ans: 1 },
    { q: 'Sentinel-2 resolution for key vegetation bands:', opts: ['1m', '5m', '10m', '30m'], ans: 2 },
    { q: 'Which index is best for dense canopy?', opts: ['NDVI', 'SAVI', 'EVI', 'NDWI'], ans: 2 },
    { q: 'Soil pH below 5.5 is:', opts: ['Neutral', 'Alkaline', 'Acidic', 'Saline'], ans: 2 },
    { q: 'SAVI is better than NDVI when:', opts: ['Cloud cover is high', 'Vegetation is sparse', 'Canopy is dense', 'Temperature is extreme'], ans: 1 },
    { q: 'Ideal slope range for most crops:', opts: ['0-1°', '2-5°', '10-15°', 'Over 20°'], ans: 1 },
    { q: 'ET₀ measures:', opts: ['Soil nitrogen', 'Atmospheric water demand', 'Crop height', 'Seed germination rate'], ans: 1 }
  ];

  function openQuiz() {
    let html = '<div id="quizQuestions">';
    QUIZ.forEach((q, qi) => {
      html += `<div class="quiz-q"><h4>Q${qi + 1}. ${q.q}</h4>`;
      q.opts.forEach((o, oi) => {
        html += `<div class="quiz-opt" data-q="${qi}" data-o="${oi}" onclick="FH.selectQuizOpt(this)">${o}</div>`;
      });
      html += '</div>';
    });
    html += '</div><button class="btn-primary" onclick="FH.submitQuiz()" style="margin-top:12px">✅ Submit Quiz</button><div id="quizResult" style="margin-top:12px"></div>';
    $('quizBody').innerHTML = html;
    openModal('quizModal');
  }

  function selectQuizOpt(el) {
    const q = el.dataset.q;
    document.querySelectorAll(`.quiz-opt[data-q="${q}"]`).forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
  }

  function submitQuiz() {
    let score = 0;
    QUIZ.forEach((q, qi) => {
      const selected = document.querySelector(`.quiz-opt[data-q="${qi}"].selected`);
      const correct = document.querySelector(`.quiz-opt[data-q="${qi}"][data-o="${q.ans}"]`);
      if (correct) correct.classList.add('correct');
      if (selected) {
        if (parseInt(selected.dataset.o) === q.ans) score++;
        else selected.classList.add('wrong');
      }
    });
    const pct = Math.round(score / QUIZ.length * 100);
    const emoji = pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '📚';
    $('quizResult').innerHTML = `
      <div class="stat" style="text-align:center;padding:16px">
        <div class="val" style="font-size:2rem">${emoji} ${score}/${QUIZ.length}</div>
        <div class="lbl" style="font-size:0.85rem">${pct}% — ${pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep studying!'}</div>
      </div>`;
  }

  // ═══════════ SETTINGS ═══════════
  function loadSettings() {
    try {
      _state.settings = JSON.parse(localStorage.getItem('fh_settings') || '{}');
      if (_state.settings.geminiKey && $('geminiKey')) $('geminiKey').value = _state.settings.geminiKey;
      if (_state.settings.shClientId && $('shClientId')) $('shClientId').value = _state.settings.shClientId;
      if (_state.settings.shClientSecret && $('shClientSecret')) $('shClientSecret').value = _state.settings.shClientSecret;
      if (_state.settings.cloudThresh && $('cloudThresh')) $('cloudThresh').value = _state.settings.cloudThresh;
      if (_state.settings.searchMonths && $('searchMonths')) $('searchMonths').value = _state.settings.searchMonths;
      
      if (_state.settings.alertPhone && $('alertPhone')) $('alertPhone').value = _state.settings.alertPhone;
      if (_state.settings.alertEnabled && $('alertEnabled')) $('alertEnabled').checked = _state.settings.alertEnabled;

      if (_state.settings.mode) setMode(_state.settings.mode);
    } catch (e) { /* ignore */ }
  }

  // ═══════════ DYNAMIC LEGEND UPDATE ═══════════
  function updateLegend(indexType, dateStr, satelliteName) {
    const legend = $('mapLegend');
    if (!legend) return;
    
    const colorBar = $('legendColorBar');
    const legendDate = $('legendDate');
    const legendSat = $('legendSat');
    const legendSource = $('legendSource');
    
    if (!colorBar || !legendDate || !legendSat) return;
    
    legendDate.textContent = dateStr || '--';
    legendSat.textContent = satelliteName || 'Satellite';
    
    if (legendSource) {
      const isSim = _state.simulatedData;
      legendSource.innerHTML = isSim
        ? '<span style="color:var(--orange)">🔄 DEMO</span>'
        : '<span style="color:var(--green)">🛰️ LIVE</span>';
    }
    
    const classes = FH_CONFIG.getActiveClasses(indexType);
    
    // Choose color scale based on index type
    colorBar.innerHTML = classes.map(c => 
      `<div style="flex:1;background:${c.col};position:relative" title="${c.name}"></div>`
    ).join('');
    
    if (['ndmi', 'smmi', 'ndwi'].includes(indexType)) {
      $('legendLabels').innerHTML = 
        `<span style="color:${classes[0].col}">Dry</span>` +
        `<span style="color:${classes[classes.length-1].col}">Wet</span>`;
    } else if (['tvdi', 'csi'].includes(indexType)) {
      $('legendLabels').innerHTML = 
        `<span style="color:${classes[0].col}">Dry/Hot</span>` +
        `<span style="color:${classes[classes.length-1].col}">Cool/Wet</span>`;
    } else {
      $('legendLabels').innerHTML = 
        `<span>Low</span><span>High</span>`;
    }
    
    const sidebarLegend = $('moistureLegend');
    const ndviLegendEl = $('ndviLegend');
    
    if (['ndmi', 'smmi', 'ndwi', 'tvdi', 'csi'].includes(indexType)) {
      if (sidebarLegend) {
        sidebarLegend.style.display = 'block';
        sidebarLegend.innerHTML = classes.map(c =>
          `<div class="legend-item"><div class="legend-swatch" style="background:${c.col}"></div><div><b>${c.name}</b></div></div>`
        ).join('');
      }
      if (ndviLegendEl) ndviLegendEl.style.display = 'none';
    } else {
      if (sidebarLegend) sidebarLegend.style.display = 'none';
      if (ndviLegendEl) ndviLegendEl.style.display = '';
    }
    
    legend.style.display = 'block';
  }

  // ═══════════ GUIDED ONBOARDING ═══════════
  let _onboardingActive = false;
  let _onboardingStep = 0;
  
  function startOnboarding() {
    _onboardingActive = true;
    _onboardingStep = 0;
    renderOnboardingStep();
  }
  
  function renderOnboardingStep() {
    const steps = ONBOARDING_STEPS;
    if (_onboardingStep >= steps.length) {
      finishOnboarding();
      return;
    }
    
    const step = steps[_onboardingStep];
    const overlay = $('onboardingOverlay');
    if (!overlay) return;
    
    overlay.classList.add('show');
    
    const progress = ((_onboardingStep + 1) / steps.length) * 100;
    
    overlay.innerHTML = `
      <div class="onboard-card">
        <div class="onboard-progress-bar"><div class="onboard-progress-fill" style="width:${progress}%"></div></div>
        <div class="onboard-icon">${step.icon}</div>
        <div class="onboard-step-indicator">Step ${_onboardingStep + 1} of ${steps.length}</div>
        <h2 class="onboard-title">${step.title}</h2>
        <p class="onboard-desc">${step.desc.replace(/\n/g, '<br>')}</p>
        ${step.tip ? `<div class="onboard-tip">💡 ${step.tip}</div>` : ''}
        <div class="onboard-nav">
          <button class="onboard-btn onboard-btn-skip" onclick="FH.skipOnboarding()">Skip Tour</button>
          <div class="onboard-dots">
            ${steps.map((s, i) => `<div class="onboard-dot ${i === _onboardingStep ? 'active' : i < _onboardingStep ? 'done' : ''}"></div>`).join('')}
          </div>
          <button class="onboard-btn onboard-btn-next" onclick="FH.nextOnboardingStep()">
            ${_onboardingStep === steps.length - 1 ? '✨ Done!' : 'Next →'}
          </button>
        </div>
        <div class="onboard-footer">
          <span class="onboard-est">~2 min tour</span>
          <span class="onboard-highlight">${step.target ? 'Click the highlighted area to continue' : ''}</span>
        </div>
      </div>
    `;
    
    // Highlight the target element
    document.querySelectorAll('.onboard-highlight-target').forEach(el => el.classList.remove('onboard-highlight-target'));
    if (step.target) {
      const target = document.querySelector(step.target);
      if (target) {
        if (step.target !== '#map') {
          target.classList.add('onboard-highlight-target');
        }
        // Scroll sidebar to show target
        const sidebar = document.getElementById('sidebar');
        if (sidebar && step.target.startsWith('#') && step.target !== '#map') {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }
  
  function nextOnboardingStep() {
    _onboardingStep++;
    renderOnboardingStep();
  }
  
  function prevOnboardingStep() {
    if (_onboardingStep > 0) {
      _onboardingStep--;
      renderOnboardingStep();
    }
  }
  
  function skipOnboarding() {
    finishOnboarding();
    toast('Tour skipped. Click Tour button anytime to restart.');
  }
  
  function finishOnboarding() {
    _onboardingActive = false;
    const overlay = $('onboardingOverlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    }
    document.querySelectorAll('.onboard-highlight-target').forEach(el => el.classList.remove('onboard-highlight-target'));
    localStorage.setItem('fh_onboarding_done', 'true');
    toast('Tour complete! You\'re ready to analyze fields.');
  }

  function saveSettings() {
    _state.settings = {
      geminiKey: $('geminiKey')?.value || '',
      shClientId: $('shClientId')?.value || '',
      shClientSecret: $('shClientSecret')?.value || '',
      cloudThresh: $('cloudThresh')?.value || '30',
      searchMonths: $('searchMonths')?.value || '3',
      alertPhone: $('alertPhone')?.value || '',
      alertEnabled: $('alertEnabled')?.checked || false,
      mode: _state.mode
    };
    localStorage.setItem('fh_settings', JSON.stringify(_state.settings));
    toast('Settings saved');
  }

  // ═══════════ LAND INFO + INFRASTRUCTURE + FIELD JOURNAL ═══════════
  // - Land info: survey, khata, owner, location (user-entered, locally saved)
  // - Infrastructure: motor/pipeline/electricity (user-entered, locally saved)
  // - Field journal: offline-first notes with timestamps
  // - OSM Overpass: public infrastructure near the field (pipelines, power lines, water sources)
  // NO government data is scraped or bypassed. Everything is user-entered or from public OSM.

  function landStorageKey() {
    if (!_state.fieldCenter) return null;
    const lat = _state.fieldCenter[0].toFixed(4);
    const lng = _state.fieldCenter[1].toFixed(4);
    return `fh_land_${lat}_${lng}`;
  }

  function saveLandInfo() {
    if (!_state.fieldCenter) return toast('Select a field first', 'err');
    const data = {
      survey:  $('lrSurveyInput').value.trim(),
      khata:   $('lrKhataInput')?.value.trim() || '',
      owner:   $('lrOwnerInput').value.trim(),
      state:   $('lrStateInput')?.value.trim() || '',
      district: $('lrDistrictInput')?.value.trim() || '',
      tehsil:  $('lrTehsilInput')?.value.trim() || '',
      village: $('lrVillageInput')?.value.trim() || '',
      pincode: $('lrPincodeInput')?.value.trim() || '',
      savedAt: new Date().toISOString()
    };
    if (!data.survey && !data.owner && !data.khata && !data.village) {
      return toast('Enter at least one detail', 'err');
    }
    const key = landStorageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(data));
    updateLandStatus();
    toast('✅ Land details saved to this device');
  }

  function loadLandInfo(lat, lng) {
    ['lrSurveyInput', 'lrKhataInput', 'lrOwnerInput', 'lrStateInput', 'lrDistrictInput', 'lrTehsilInput', 'lrVillageInput', 'lrPincodeInput'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });

    const key = `fh_land_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.survey) $('lrSurveyInput').value = data.survey;
        if (data.khata && $('lrKhataInput')) $('lrKhataInput').value = data.khata;
        if (data.owner) $('lrOwnerInput').value = data.owner;
        if (data.state && $('lrStateInput')) $('lrStateInput').value = data.state;
        if (data.district && $('lrDistrictInput')) $('lrDistrictInput').value = data.district;
        if (data.tehsil && $('lrTehsilInput')) $('lrTehsilInput').value = data.tehsil;
        if (data.village && $('lrVillageInput')) $('lrVillageInput').value = data.village;
        if (data.pincode && $('lrPincodeInput')) $('lrPincodeInput').value = data.pincode;
      } catch (e) { /* ignore */ }
    }
    updateLandStatus();
  }

  function applyPlaceToLandInfo(place) {
    if (!place) return;
    const fill = (id, val) => {
      if (!val) return;
      const el = $(id);
      if (el && !el.value.trim()) el.value = val;
    };
    fill('lrStateInput', place.state);
    fill('lrDistrictInput', place.district);
    fill('lrTehsilInput', place.tehsil);
    fill('lrVillageInput', place.village);
    fill('lrPincodeInput', place.pincode);
    const stateVal = $('lrStateInput')?.value.trim() || place.state || '';
    const portal = FH_CONFIG.findLandPortal(stateVal);
    const portalHint = $('landPortalHint');
    if (portalHint) {
      portalHint.textContent = portal
        ? `✓ ${portal.state} recognised — ${portal.note}`
        : 'Select your state to find the official land records portal.';
    }
    const guideState = $('lrGuideState');
    if (guideState) guideState.textContent = portal ? portal.state : (stateVal || 'your state');
    const portalBtn = $('lrPortalBtn');
    if (portalBtn) {
      portalBtn.textContent = portal
        ? `🔗 Open ${portal.state} portal`
        : '🔗 Open official state portal';
    }
  }

  function openLandPortal() {
    const state = $('lrStateInput')?.value.trim() || '';
    const portal = FH_CONFIG.findLandPortal(state);
    if (!portal) {
      const q = encodeURIComponent((state ? state + ' ' : '') + 'land records portal official');
      window.open('https://www.google.com/search?q=' + q, '_blank');
      return toast('State not mapped — searching the web instead', 'info');
    }
    toast('Opening official ' + portal.state + ' portal (' + portal.note + ')...', 'info');
    window.open(portal.url, '_blank');
  }

  function updateLandStatus() {
    const badge = $('landStatusBadge');
    if (!badge) return;
    const key = landStorageKey();
    let saved = null;
    if (key) {
      try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* ignore */ }
    }
    if (saved && (saved.survey || saved.khata || saved.owner)) {
      badge.className = 'badge badge-live';
      badge.textContent = '✓ Saved — verify on the official portal';
    } else {
      badge.className = 'badge badge-warn';
      badge.textContent = '— Manual entry — verify on the official portal';
    }
  }

  // ═══════════ AUTO-SCAN: WHAT'S AT THIS LOCATION ═══════════
  // Runs automatically whenever a field is selected. Combines REAL public
  // data: pincode (India Post), nearby infrastructure (OpenStreetMap), and
  // any of the user's own imported CSV records that match the location.
  // Nothing here is scraped or invented — every source is public/legal.
  let _scanSeq = 0;

  function haversineM(aLat, aLng, bLat, bLng) {
    const R = 6371000;
    const dLat = (bLat - aLat) * Math.PI / 180;
    const dLng = (bLng - aLng) * Math.PI / 180;
    const s = Math.sin(dLat / 2) ** 2 +
              Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // HTML-escape user/CSV-supplied values before injecting into innerHTML
  // (prevents XSS via a malicious CSV cell or saved field value).
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Renders the auto-scan results panel inside the Land Info card.
  function renderLocationScan({ pincode, infra, csvRecord }) {
    const box = $('locationScan');
    if (!box) return;
    const parts = [];

    // Pincode row
    if (pincode) {
      parts.push(`<div style="display:flex;align-items:center;gap:6px;font-size:0.72rem;color:var(--text)"><span>📮</span><span>PIN Code: <b style="color:var(--green-light)">${esc(pincode)}</b> <span style="color:var(--text-faint)">(India Post)</span></span></div>`);
    }

    // Imported CSV record match (own data — takes priority)
    if (csvRecord) {
      const r = csvRecord;
      const recLines = [];
      if (r.survey) recLines.push(`Survey: <b>${esc(r.survey)}</b>`);
      if (r.khata) recLines.push(`Khata: <b>${esc(r.khata)}</b>`);
      if (r.owner) recLines.push(`Owner: <b>${esc(r.owner)}</b>`);
      if (r.motor) recLines.push(`Motor: <b>${esc(r.motor)}</b>`);
      if (r.pipeline) recLines.push(`Pipeline: <b>${esc(r.pipeline)}</b>`);
      if (r.electricity) recLines.push(`Electricity: <b>${esc(r.electricity)}</b>`);
      parts.push(`
        <div style="background:rgba(46,204,113,0.12);border:1px solid rgba(46,204,113,0.4);border-radius:8px;padding:8px;font-size:0.72rem;margin-top:6px">
          <div style="font-weight:700;color:var(--green-light);margin-bottom:4px">✅ My record found — ${csvRecord.dist ? Math.round(csvRecord.dist) + ' m from this field' : 'at this location'}</div>
          ${recLines.join('<br>')}
        </div>`);
    } else if (csvImportCount() > 0) {
      parts.push(`<div style="font-size:0.68rem;color:var(--text-faint);margin-top:6px">ℹ️ ${csvImportCount()} of your records imported — none within 500 m of this field.</div>`);
    }

    // OSM infrastructure summary (grouped, with distances)
    if (infra && infra.total > 0) {
      const items = infra.items; // [{ t, d }] — objects, not strings
      const groups = [];
      const addGroup = (label, icon, list) => {
        const rows = list.slice(0, 4).map(i => i.d + ' m');
        if (!rows.length) return;
        groups.push(`<div style="margin-top:5px"><span style="font-size:0.68rem;color:var(--text-dim)">${icon} ${label}:</span> <span style="font-size:0.7rem;color:var(--text)">${rows.join(', ')}${list.length > 4 ? ' +' + (list.length - 4) : ''}</span></div>`);
      };
      addGroup('Power lines/poles', '⚡', items.filter(i => i.t === 'power'));
      addGroup('Water pipelines', '🔵', items.filter(i => i.t === 'pipeline'));
      addGroup('Wells / pumps', '💧', items.filter(i => i.t === 'water'));
      addGroup('Canals', '🌊', items.filter(i => i.t === 'canal'));
      parts.push(`
        <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:8px;margin-top:6px">
          <div style="font-weight:700;color:var(--text);font-size:0.72rem;margin-bottom:4px">🗺️ Nearby infrastructure (OpenStreetMap, 2 km)</div>
          ${groups.join('')}
          <div style="font-size:0.65rem;color:var(--text-faint);margin-top:4px">Free public map data — tap “🗺️ Show Nearby Infrastructure” to see it on the map.</div>
        </div>`);
    }

    if (!parts.length) return;
    box.innerHTML = parts.join('');
    box.style.display = 'block';
  }

  function csvImportCount() {
    try { return JSON.parse(localStorage.getItem('fh_land_records_csv') || '[]').length; } catch (e) { return 0; }
  }

  // Find the nearest imported record within 500 m of the field center.
  function matchCSVRecord(lat, lng) {
    let rows = [];
    try { rows = JSON.parse(localStorage.getItem('fh_land_records_csv') || '[]'); } catch (e) { return null; }
    if (!rows.length || !_state.fieldCenter) return null;
    let best = null;
    rows.forEach(r => {
      if (r.lat === undefined || r.lng === undefined) return;
      const d = haversineM(lat, lng, Number(r.lat), Number(r.lng));
      if (d <= 500 && (!best || d < best.dist)) {
        best = { ...r, dist: d };
      }
    });
    return best;
  }

  // The full auto-scan: pincode + OSM infra + own-record match.
  async function autoScanLocation() {
    if (!_state.fieldCenter) return;
    const seq = ++_scanSeq;
    const [lat, lng] = _state.fieldCenter;
    const box = $('locationScan');
    if (box) {
      box.style.display = 'block';
      box.innerHTML = '<div style="font-size:0.7rem;color:var(--text-dim)">🔍 Scanning location…</div>';
    }

    // 1. Own CSV records (instant, local)
    const csvRecord = matchCSVRecord(lat, lng);

    // 2. Pincode from the village/place name (India Post API)
    let pincode = null;
    const village = $('lrVillageInput')?.value.trim() || '';
    const district = $('lrDistrictInput')?.value.trim() || '';
    const state = $('lrStateInput')?.value.trim() || '';
    if (village || district) {
      pincode = await FH_API.lookupPincode(village || district, district, state).catch(() => null);
    }
    if (seq !== _scanSeq) return; // stale — field changed mid-scan

    // 3. OSM infrastructure (public data, 2 km — matches the overlay query)
    let infra = null;
    try {
      const data = await FH_API.fetchInfrastructure(lat, lng, 2000);
      if (data && data.success && data.elements) {
        const items = data.elements
          .map(el => {
            const pt = el.type === 'node' ? { lat: el.lat, lon: el.lon }
              : (el.center || (el.geometry && el.geometry[Math.floor(el.geometry.length / 2)]));
            if (!pt || pt.lat === undefined) return null;
            const tags = el.tags || {};
            const t = tags.man_made || tags.power || tags.water || tags.waterway || 'other';
            const typeKey = tags.man_made === 'pipeline' ? 'pipeline'
              : (tags.power ? 'power'
                : (tags.water ? 'water'
                  : (tags.waterway === 'canal' ? 'canal' : 'other')));
            return {
              t: typeKey,
              d: Math.round(haversineM(lat, lng, pt.lat, pt.lon))
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.d - b.d);
        infra = {
          total: items.length,
          items: items  // keep { t, d } objects — renderLocationScan filters by .t
        };
      }
    } catch (e) {
      console.warn('[Scan] OSM infra failed:', e);
    }
    if (seq !== _scanSeq) return;

    renderLocationScan({ pincode, infra, csvRecord });
  }

  // ═══════════ IMPORT MY OWN LAND RECORDS (CSV) ═══════════
  // Columns: lat,lng,survey,khata,owner,motor,pipeline,electricity,village,district,state,pincode
  // Rows are stored locally and auto-matched to a clicked field (within 500 m).
  function importLandRecordsCSV(inputElement) {
    const file = inputElement.files?.[0];
    if (!file) return;
    const status = $('csvImportStatus');
    const show = (msg, ok) => {
      if (!status) return;
      status.style.display = 'block';
      status.style.color = ok ? 'var(--green-light)' : 'var(--orange)';
      status.textContent = msg;
    };
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return show('CSV needs a header row + at least 1 data row', false);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const rows = lines.slice(1).map(line => {
          const cells = line.split(',').map(c => c.trim());
          const row = {};
          headers.forEach((h, i) => { row[h] = cells[i] !== undefined ? cells[i] : ''; });
          return row;
        }).filter(r => r.lat && r.lng && !isNaN(Number(r.lat)) && !isNaN(Number(r.lng)));
        if (!rows.length) return show('No valid rows (need numeric lat and lng columns)', false);
        localStorage.setItem('fh_land_records_csv', JSON.stringify(rows));
        show(`✅ ${rows.length} records imported — they will auto-match when you click a field nearby`, true);
        // Re-scan the current field so the match appears immediately
        autoScanLocation();
      } catch (e) {
        console.error('[CSV] Import failed:', e);
        show('❌ Could not read CSV: ' + e.message, false);
      }
    };
    reader.readAsText(file);
  }

  function saveInfrastructure() {
    if (!_state.fieldCenter) return toast('Select a field first', 'err');
    const data = {
      motorNo: $('infraMotorInput')?.value.trim() || '',
      pipelineNo: $('infraPipelineInput')?.value.trim() || '',
      electricityNo: $('infraElectricityInput')?.value.trim() || '',
      waterSource: $('infraWaterSource')?.value || 'none',
      irrigationType: $('infraIrrigationType')?.value || 'none',
      notes: $('infraNotesInput')?.value.trim() || '',
      savedAt: new Date().toISOString()
    };
    const key = infraStorageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(data));
    updateInfraStatus();
    toast('✅ Infrastructure details saved');
  }

  function loadInfrastructure() {
    if (!_state.fieldCenter) return;
    const key = infraStorageKey();
    if (!key) return;
    const saved = localStorage.getItem(key);
    if (!saved) {
      ['infraMotorInput', 'infraPipelineInput', 'infraElectricityInput', 'infraWaterSource', 'infraIrrigationType', 'infraNotesInput'].forEach(id => {
        const el = $(id);
        if (el) el.value = el.tagName === 'SELECT' ? 'none' : '';
      });
      return;
    }
    try {
      const data = JSON.parse(saved);
      if ($('infraMotorInput')) $('infraMotorInput').value = data.motorNo || '';
      if ($('infraPipelineInput')) $('infraPipelineInput').value = data.pipelineNo || '';
      if ($('infraElectricityInput')) $('infraElectricityInput').value = data.electricityNo || '';
      if ($('infraWaterSource')) $('infraWaterSource').value = data.waterSource || 'none';
      if ($('infraIrrigationType')) $('infraIrrigationType').value = data.irrigationType || 'none';
      if ($('infraNotesInput')) $('infraNotesInput').value = data.notes || '';
    } catch (e) { /* ignore */ }
    updateInfraStatus();
  }

  function updateInfraStatus() {
    const badge = $('infraStatusBadge');
    if (!badge) return;
    const key = infraStorageKey();
    let saved = null;
    if (key) {
      try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* ignore */ }
    }
    if (saved && (saved.motorNo || saved.pipelineNo || saved.electricityNo)) {
      badge.className = 'badge badge-live';
      badge.textContent = '✓ Saved locally';
    } else {
      badge.className = 'badge badge-warn';
      badge.textContent = '— Not entered';
    }
  }

  let _osmInfraLayer = null;

  async function loadOSMInfrastructure() {
    if (!_state.fieldCenter || !_state.map) return;
    const [lat, lng] = _state.fieldCenter;
    const radius = 2000;
    if (_osmInfraLayer) {
      _state.map.removeLayer(_osmInfraLayer);
      _osmInfraLayer = null;
    }
    toast('🔍 Loading nearby infrastructure...');
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["man_made"="pipeline"]["substance"="water"](around:${radius},${lat},${lng});
          way["man_made"="pipeline"]["substance"="water"](around:${radius},${lat},${lng});
          node["power"="pole"](around:${radius},${lat},${lng});
          node["power"="tower"](around:${radius},${lat},${lng});
          way["power"="line"](around:${radius},${lat},${lng});
          node["water"="well"](around:${radius},${lat},${lng});
          node["water"="pump"](around:${radius},${lat},${lng});
          way["waterway"="canal"](around:${radius},${lat},${lng});
          node["emergency"="fire_hydrant"](around:${radius},${lat},${lng});
        );
        out body;
      `;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
      });
      if (!response.ok) throw new Error('Overpass API error: ' + response.status);
      const data = await response.json();
      if (!data.elements || data.elements.length === 0) {
        toast('No public infrastructure found nearby (OSM)');
        return;
      }
      const features = [];
      data.elements.forEach(el => {
        if (el.type === 'node' && el.lat && el.lon) {
          features.push({
            type: 'Feature',
            properties: {
              type: el.tags?.man_made || el.tags?.power || el.tags?.water || el.tags?.waterway || 'infrastructure',
              name: el.tags?.name || '',
              substance: el.tags?.substance || ''
            },
            geometry: { type: 'Point', coordinates: [el.lon, el.lat] }
          });
        } else if (el.type === 'way' && el.geometry) {
          const coords = el.geometry.map(g => [g.lon, g.lat]);
          features.push({
            type: 'Feature',
            properties: {
              type: el.tags?.man_made || el.tags?.power || el.tags?.waterway || 'infrastructure',
              name: el.tags?.name || '',
              substance: el.tags?.substance || ''
            },
            geometry: { type: 'LineString', coordinates: coords }
          });
        }
      });
      const geojson = { type: 'FeatureCollection', features };
      const getStyle = (feature) => {
        const t = (feature.properties.type || '').toLowerCase();
        if (t.includes('pipeline')) return { color: '#3498db', weight: 3, opacity: 0.8 };
        if (t.includes('power') || t.includes('pole') || t.includes('tower') || t.includes('line')) return { color: '#f39c12', weight: 2, opacity: 0.8 };
        if (t.includes('water') || t.includes('canal') || t.includes('ditch') || t.includes('well') || t.includes('pump') || t.includes('hydrant')) return { color: '#2ecc71', weight: 2, opacity: 0.8 };
        return { color: '#95a5a6', weight: 1, opacity: 0.6 };
      };
      const getIcon = (feature) => {
        const t = (feature.properties.type || '').toLowerCase();
        if (t.includes('pipeline')) return '🔵';
        if (t.includes('power')) return '⚡';
        if (t.includes('water') || t.includes('canal')) return '💧';
        return '📍';
      };
      _osmInfraLayer = L.geoJSON(geojson, {
        style: (f) => getStyle(f),
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: 6, ...getStyle(f), fillOpacity: 0.9
        }),
        onEachFeature: (f, layer) => {
          const p = f.properties;
          const title = p.name || p.type;
          const subtitle = [p.substance].filter(Boolean).join(' • ');
          layer.bindPopup(`<b>${title}</b>${subtitle ? '<br><small>' + subtitle + '</small>' : ''}<br><small>OSM public data</small>`);
          layer.bindTooltip(getIcon(f) + ' ' + (title || p.type), { permanent: false, direction: 'top' });
        }
      }).addTo(_state.map);
      toast(`✓ Loaded ${data.elements.length} infrastructure items from OpenStreetMap`);
      if (_osmInfraLayer.getBounds().isValid()) {
        _state.map.fitBounds(_osmInfraLayer.getBounds().pad(0.15));
      }
    } catch (e) {
      console.warn('[OSM] Infrastructure load failed:', e);
      toast('⚠️ Could not load OSM data (offline or API blocked)', 'err');
    }
  }

  function clearOSMInfrastructure() {
    if (_osmInfraLayer && _state.map) {
      _state.map.removeLayer(_osmInfraLayer);
      _osmInfraLayer = null;
      toast('Infrastructure overlay cleared');
    }
  }

  function saveJournalEntry() {
    if (!_state.fieldCenter) return toast('Select a field first', 'err');
    const textarea = $('journalTextarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return toast('Write something first', 'err');
    const key = journalStorageKey();
    if (!key) return;
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text,
      timestamp: new Date().toISOString(),
      synced: false
    };
    let entries = [];
    try {
      const existing = localStorage.getItem(key);
      if (existing) entries = JSON.parse(existing);
    } catch (e) { /* ignore */ }
    entries.unshift(entry);
    localStorage.setItem(key, JSON.stringify(entries));
    textarea.value = '';
    renderJournalEntries();
    toast('📝 Journal entry saved');
  }

  function loadJournalEntries() {
    if (!_state.fieldCenter) return;
    const key = journalStorageKey();
    if (!key) return;
    renderJournalEntries();
  }

  function renderJournalEntries() {
    const container = $('journalEntriesList');
    if (!container || !_state.fieldCenter) return;
    const key = journalStorageKey();
    if (!key) return;
    let entries = [];
    try {
      const existing = localStorage.getItem(key);
      if (existing) entries = JSON.parse(existing);
    } catch (e) { /* ignore */ }
    if (entries.length === 0) {
      container.innerHTML = '<div class="hint" style="font-size:0.75rem;color:var(--text-faint)">No entries yet. Start writing your field observations below.</div>';
      return;
    }
    container.innerHTML = entries.map(e => {
      const date = new Date(e.timestamp);
      const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const syncIcon = e.synced ? '☁️' : '💾';
      return `
        <div class="journal-entry" style="padding:10px;border-bottom:1px solid #e9ecef;background:#fafafa;border-radius:6px;margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <small style="color:var(--text-faint);font-size:0.7rem;">${syncIcon} ${dateStr}</small>
            <button onclick="FH.deleteJournalEntry('${e.id}')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:0.8rem;padding:2px 6px;" title="Delete">✕</button>
          </div>
          <div style="font-size:0.85rem;line-height:1.5;white-space:pre-wrap;">${e.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>`;
    }).join('');
  }

  function deleteJournalEntry(entryId) {
    if (!_state.fieldCenter) return;
    const key = journalStorageKey();
    if (!key) return;
    let entries = [];
    try {
      const existing = localStorage.getItem(key);
      if (existing) entries = JSON.parse(existing);
    } catch (e) { /* ignore */ }
    entries = entries.filter(e => e.id !== entryId);
    localStorage.setItem(key, JSON.stringify(entries));
    renderJournalEntries();
    toast('Entry deleted');
  }

  function exportJournal() {
    if (!_state.fieldCenter) return toast('Select a field first', 'err');
    const key = journalStorageKey();
    if (!key) return;
    let entries = [];
    try {
      const existing = localStorage.getItem(key);
      if (existing) entries = JSON.parse(existing);
    } catch (e) { /* ignore */ }
    if (!entries.length) return toast('No entries to export', 'err');
    const csv = 'Date,Time,Entry\n' + entries.map(e => {
      const d = new Date(e.timestamp);
      return `"${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${e.text.replace(/"/g, '\"\"')}"`;
    }).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-journal-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('📥 Journal exported as CSV');
  }

  function showAISourceIndicator(source) {
    const el = $('aiSourceIndicator');
    if (!el) return;
    const labels = {
      ollama: { text: '🟢 Self-hosted AI (Ollama)', color: '#2ecc71' },
      gemini: { text: '🔵 Cloud AI (Gemini)', color: '#3498db' },
      expert: { text: '🟡 Built-in Expert System', color: '#f39c12' },
      fallback: { text: '🟠 Offline Fallback', color: '#e67e22' }
    };
    const info = labels[source] || labels.expert;
    el.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:12px;background:${info.color}15;color:${info.color};font-size:0.75rem;font-weight:600;border:1px solid ${info.color}40;">${info.text}</span>`;
    el.style.display = 'inline-block';
  }

  function hideAISourceIndicator() {
    const el = $('aiSourceIndicator');
    if (el) el.style.display = 'none';
  }

  // ═══════════ YIELD PROJECTION RENDER ═══════════
  function renderYieldProjection(data) {
    const card = $('yieldCard');
    if (!card) return;
    
    if (!data) {
      card.style.display = 'none';
      return;
    }
    
    card.style.display = '';
    $('yieldValue').textContent = `${data.yieldPerHa} ${data.unit}`;
    $('yieldTotal').textContent = `${data.totalYield} ${data.unit}`;
    $('yieldRating').textContent = data.rating;
    $('yieldConfidence').textContent = `Confidence: ${data.confidence.toUpperCase()}`;
    
    // Color confidence badge
    const badge = $('yieldConfidence');
    badge.className = 'badge';
    if (data.confidence === 'high') badge.className += ' badge-live';
    else if (data.confidence === 'medium') badge.className += ' badge-new';
    else badge.className += ' badge-warn';
    
    // Value estimate (if applicable)
    const valEl = $('yieldValueEstimate');
    if (data.estimatedValue && valEl) {
      valEl.textContent = `~₹${(parseInt(data.estimatedValue) * 83).toLocaleString()} (est.)`;
      valEl.style.display = '';
    } else if (valEl) {
      valEl.style.display = 'none';
    }
  }

  // ═══════════ PEST RISK RENDER ═══════════
  function renderPestRiskCards(data) {
    const card = $('pestCard');
    if (!card) return;
    
    if (!data || !data.risks || data.risks.length === 0) {
      card.style.display = 'none';
      return;
    }
    
    card.style.display = '';
    
    const container = $('pestBody');
    const levelColor = data.level === 'high' ? 'var(--red)' : data.level === 'medium' ? 'var(--orange)' : 'var(--green)';
    
    $('pestOverallLevel').textContent = data.level.toUpperCase();
    $('pestOverallLevel').style.color = levelColor;
    $('pestOverallValue').textContent = `${data.overall}%`;
    $('pestOverallValue').style.color = levelColor;
    
    container.innerHTML = data.risks.slice(0, 4).map(r => {
      const rColor = r.level === 'high' ? 'var(--red)' : r.level === 'medium' ? 'var(--orange)' : 'var(--text-dim)';
      return `
        <div class="pest-item">
          <div class="pest-header">
            <span class="pest-name">${r.name}</span>
            <span class="pest-risk-badge" style="background:${rColor};color:#fff">${r.risk}%</span>
          </div>
          <div class="pest-desc">${r.desc}</div>
          <div class="pest-bar-track"><div class="pest-bar-fill" style="width:${r.risk}%;background:${rColor}"></div></div>
        </div>`;
    }).join('');
  }

  // ═══════════ ALERTS RENDER ═══════════
  function renderAlerts(alerts) {
    const container = $('alertsBody');
    const countEl = $('alertsCount');
    const card = $('alertsCard');
    
    if (!container || !card) return;
    
    if (!alerts || alerts.length === 0) {
      card.style.display = 'none';
      return;
    }
    
    card.style.display = '';
    
    const criticalCount = alerts.filter(a => a.level === 'critical').length;
    const warningCount = alerts.filter(a => a.level === 'warning').length;
    
    if (countEl) {
      countEl.textContent = `${criticalCount + warningCount} issue${criticalCount + warningCount > 1 ? 's' : ''}`;
      countEl.className = 'badge ' + (criticalCount > 0 ? 'badge-critical' : 'badge-warn');
    }
    
    container.innerHTML = alerts.map(a => {
      const bg = a.level === 'critical' ? 'rgba(231,76,60,0.12)' : a.level === 'warning' ? 'rgba(243,156,18,0.12)' : 'rgba(52,152,219,0.12)';
      const border = a.level === 'critical' ? 'var(--red)' : a.level === 'warning' ? 'var(--orange)' : 'var(--blue)';
      return `
        <div class="alert-item" style="background:${bg};border-left:3px solid ${border}">
          <div class="alert-header">
            <span class="alert-icon">${a.icon}</span>
            <span class="alert-title">${a.title}</span>
            <span class="alert-time">${new Date(a.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="alert-msg">${a.msg}</div>
        </div>`;
    }).join('');
  }

  // ═══════════ PROFESSIONAL UI COMPONENTS ═══════════
  
  // Render saved fields list
  function renderSavedFields() {
    const container = $('savedFieldsList');
    if (!container) return;
    const saved = FH_MAP.loadSavedFields();
    
    if (!saved.length) {
      container.innerHTML = '<div class="advice info" style="font-size:0.75rem">No saved fields yet. Run an analysis and save it!</div>';
      return;
    }
    
    container.innerHTML = saved.map((f, idx) => {
      const ndviStr = f.ndvi ? `NDVI: ${f.ndvi.toFixed(3)}` : '';
      const dateStr = new Date(f.date).toLocaleDateString();
      const safeName = f.name.replace(/'/g, '\\x27');
      return `<div class="saved-field-item" onclick="FH.loadFieldFromSaved(${idx})">
        <div class="saved-field-info">
          <div class="saved-field-name">📍 ${safeName}</div>
          <div class="saved-field-meta">${dateStr} ${ndviStr}</div>
        </div>
        <button class="saved-field-del" onclick="event.stopPropagation(); FH.deleteSavedField('${f.id}')">✕</button>
      </div>`;
    }).join('');
  }
  
  // Render professional data dashboard
  function renderDataDashboard() {
    const ad = _state.analysisData;
    const w = _state.weatherData?.forecast?.current;
    const t = _state.terrainData;
    const s = _state.soilData;
    if (!ad) return;
    
    const dashboard = $('dataDashboard');
    if (!dashboard) return;
    
    const score = Math.round(Math.min(100, (ad.meanNdvi / ad.crop.peak) * 115));
    const prob = ((ad.cc[0] + ad.cc[1] + ad.cc[2]) / ad.cnt * 100).toFixed(1);
    
    dashboard.innerHTML = `
      <div class="dashboard-grid">
        <div class="dashboard-card">
          <div class="dash-label">Crop Health</div>
          <div class="dash-value ${score < 50 ? 'dash-bad' : score < 70 ? 'dash-warn' : 'dash-good'}">${score}%</div>
          <div class="dash-trend">${score > 70 ? '📈 Thriving' : score > 50 ? '📊 Monitor' : '📉 Critical'}</div>
        </div>
        <div class="dashboard-card">
          <div class="dash-label">NDVI</div>
          <div class="dash-value">${ad.meanNdvi.toFixed(3)}</div>
          <div class="dash-trend">Peak: ${ad.crop.peak}</div>
        </div>
        <div class="dashboard-card">
          <div class="dash-label">Problem Area</div>
          <div class="dash-value ${prob > 30 ? 'dash-bad' : prob > 15 ? 'dash-warn' : 'dash-good'}">${prob}%</div>
          <div class="dash-trend">${prob > 30 ? '🚨 Needs attention' : '✅ Acceptable'}</div>
        </div>
        <div class="dashboard-card">
          <div class="dash-label">Temperature</div>
          <div class="dash-value">${w ? w.temperature_2m.toFixed(1) + '°C' : '--'}</div>
          <div class="dash-trend">${w && w.temperature_2m > 35 ? '🌡️ Heat stress' : w ? '✅ Normal' : ''}</div>
        </div>
        ${t ? `
        <div class="dashboard-card">
          <div class="dash-label">Elevation</div>
          <div class="dash-value">${t.eMean.toFixed(0)}m</div>
          <div class="dash-trend">Range: ${t.eMin.toFixed(0)}-${t.eMax.toFixed(0)}m</div>
        </div>
        <div class="dashboard-card">
          <div class="dash-label">Slope</div>
          <div class="dash-value">${t.avgSlope.toFixed(1)}°</div>
          <div class="dash-trend">${t.drainClass}</div>
        </div>` : ''}
        ${s ? `
        <div class="dashboard-card">
          <div class="dash-label">Soil pH</div>
          <div class="dash-value">${s.phh2o ? (s.phh2o/10).toFixed(1) : '--'}</div>
          <div class="dash-trend">${s.phh2o ? (s.phh2o/10 > 7.5 ? 'Alkaline' : s.phh2o/10 < 6.0 ? 'Acidic' : 'Neutral') : ''}</div>
        </div>
        <div class="dashboard-card">
          <div class="dash-label">Organic Carbon</div>
          <div class="dash-value">${s.soc ? (s.soc/10).toFixed(1) + 'g/kg' : '--'}</div>
          <div class="dash-trend">${s.soc && s.soc/10 > 1.5 ? '✅ Healthy' : s.soc ? '⚠️ Low' : ''}</div>
        </div>` : ''}
      </div>
      ${_state.tsData.length > 1 ? `
      <div class="dashboard-timeline">
        <div class="dash-timeline-label">NDVI Time Series (${_state.tsData.length} points)</div>
        <div class="dash-timeline-bars">${_state.tsData.slice(-10).map((d, i, arr) => {
          const h = Math.max(8, (d.ndvi / Math.max(...arr.map(x => x.ndvi))) * 40);
          return `<div class="dash-bar" style="height:${h}px" title="${d.date}: ${d.ndvi.toFixed(3)}"></div>`;
        }).join('')}</div>
      </div>` : ''}
    `;
    dashboard.style.display = '';
    const dashCard = $('dashCard');
    if (dashCard) dashCard.style.display = '';
  }

  // Render enhanced scene browser with thumbnails
  function renderEnhancedScenes() {
    const el = $('scenesList');
    if (!_state.scenes.length) {
      el.innerHTML = '<div class="advice info">No scenes found. Adjust settings and try again.</div>';
      return;
    }
    el.innerHTML = _state.scenes.map((s, i) => {
      const cloudPct = s.cloud;
      const cloudBg = cloudPct < 10 ? '#2ecc71' : cloudPct < 25 ? '#f39c12' : '#e74c3c';
      const quality = cloudPct < 10 ? 'Excellent' : cloudPct < 25 ? 'Good' : 'Poor';
      return `<div class="scene-item ${i === 0 ? 'active' : ''}" onclick="FH.selectScene(${i})" data-idx="${i}">
        <div class="scene-thumb" style="background:linear-gradient(135deg,#1a3826,#0d2013);display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:6px;font-size:1.3rem">🛰️</div>
        <div style="flex:1;min-width:0">
          <div class="scene-date">📅 ${s.date}</div>
          <div class="scene-cloud">☁️ ${cloudPct}% · ${quality}</div>
        </div>
        <div style="text-align:right">
          <span class="scene-badge" style="background:${cloudBg};color:#fff">${cloudPct}%</span>
          <div style="font-size:0.6rem;color:var(--text-faint);margin-top:2px">Sentinel-2 L2A</div>
        </div>
      </div>`;
    }).join('');
    $('scenesCard').style.display = '';
    if (_state.scenes.length > 0) selectScene(0);
  }

  // ═══════════ FARM DASHBOARD (Cropin-style overview) ═══════════
  // Helper: derive a field health status label from NDVI
  function fieldStatusOf(ndvi, peak) {
    if (ndvi == null || isNaN(ndvi)) return 'NODATA';
    const p = peak || 0.80;
    const ratio = ndvi / p;
    if (ratio >= 0.72) return 'OPTIMAL';
    if (ratio >= 0.45) return 'STRESSED';
    return 'CRITICAL';
  }

  // Helper: derive a 0-100 health score from NDVI
  function healthScoreOf(ndvi, peak) {
    if (ndvi == null || isNaN(ndvi)) return null;
    return Math.round(Math.min(100, (ndvi / (peak || 0.80)) * 115));
  }

  // View switching: 'dashboard' | 'map'
  function showView(view) {
    const dash = $('dashboardView');
    const side = $('sidebar');
    const mapArea = $('mapArea');
    const switcherBtns = document.querySelectorAll('.view-btn');
    const bodyEl = document.body;

    if (view === 'dashboard') {
      dash.style.display = 'block';
      side.style.display = 'none';
      mapArea.style.display = 'none';
      switcherBtns.forEach(b => b.classList.toggle('active', b.dataset.view === 'dashboard'));
      if (bodyEl) bodyEl.classList.add('fh-dash-active');
      renderDashboard();
      toast('📊 Farm Dashboard');
    } else {
      dash.style.display = 'none';
      side.style.display = '';
      mapArea.style.display = '';
      switcherBtns.forEach(b => b.classList.toggle('active', b.dataset.view === 'map'));
      if (bodyEl) bodyEl.classList.remove('fh-dash-active');
      // Refresh map size after layout shift
      setTimeout(() => {
        if (_state.map) _state.map.invalidateSize();
      }, 120);
    }
  }

  // ─── SEED DEMO FIELDS (so the dashboard shows a realistic Cropin-style view) ───
  // Realistic sample fields with plausible satellite telemetry, clearly marked DEMO.
  function loadDemoFields() {
    const existing = FH_MAP.loadSavedFields();
    if (existing.some(f => f.demo)) return toast('Demo farm already loaded', 'info');

    const baseDate = Date.now();
    const demos = [
      {
        id: 'demo-' + Date.now().toString(36) + '-1',
        name: 'North Sector B-12',
        coords: [[40.018, -88.247], [40.018, -88.239], [40.012, -88.239], [40.012, -88.247]],
        center: [40.015, -88.243],
        crop: 'wheat',
        cropName: 'Wheat',
        cropPeak: 0.80,
        stage: 'mid',
        date: new Date(baseDate - 86400000 * 2).toISOString(),
        ndvi: 0.82,
        healthScore: 94,
        status: 'OPTIMAL',
        dataSource: 'sentinel-hub',
        demo: true
      },
      {
        id: 'demo-' + Date.now().toString(36) + '-2',
        name: 'West Pivot 04',
        coords: [[40.034, -88.275], [40.034, -88.267], [40.028, -88.267], [40.028, -88.275]],
        center: [40.031, -88.271],
        crop: 'maize',
        cropName: 'Maize',
        cropPeak: 0.85,
        stage: 'mid',
        date: new Date(baseDate - 86400000 * 5).toISOString(),
        ndvi: 0.45,
        healthScore: 61,
        status: 'STRESSED',
        dataSource: 'sentinel-hub',
        demo: true
      },
      {
        id: 'demo-' + Date.now().toString(36) + '-3',
        name: 'Hillside Vineyard',
        coords: [[40.005, -88.215], [40.005, -88.207], [39.999, -88.207], [39.999, -88.215]],
        center: [40.002, -88.211],
        crop: 'soybean',
        cropName: 'Soybean',
        cropPeak: 0.82,
        stage: 'mid',
        date: new Date(baseDate - 86400000 * 9).toISOString(),
        ndvi: 0.78,
        healthScore: 89,
        status: 'OPTIMAL',
        dataSource: 'sentinel-hub',
        demo: true
      },
      {
        id: 'demo-' + Date.now().toString(36) + '-4',
        name: 'East Paddy 09',
        coords: [[40.051, -88.229], [40.051, -88.221], [40.045, -88.221], [40.045, -88.229]],
        center: [40.048, -88.225],
        crop: 'rice',
        cropName: 'Rice',
        cropPeak: 0.78,
        stage: 'mid',
        date: new Date(baseDate - 86400000 * 14).toISOString(),
        ndvi: 0.12,
        healthScore: 18,
        status: 'CRITICAL',
        dataSource: 'sentinel-hub',
        demo: true
      }
    ];

    const merged = demos.concat(existing);
    _state.savedFields = merged;
    localStorage.setItem('fh_saved_fields', JSON.stringify(merged));
    renderDashboard();
    toast('🌾 Demo farm loaded — explore the dashboard!');
  }

  // ─── RENDER THE FULL DASHBOARD ───
  function renderDashboard() {
    const saved = FH_MAP.loadSavedFields();
    const grid = $('dashGrid');
    if (!grid) return;

    const query = ($('dashSearch')?.value || '').toLowerCase().trim();
    const filter = $('dashFilter')?.value || 'all';

    const cards = saved
      .map(f => {
        const status = fieldStatusOf(f.ndvi, f.cropPeak);
        const score = healthScoreOf(f.ndvi, f.cropPeak);
        const area = FH_UTILS.areaHa(f.coords || []);
        return { f, status, score, area };
      })
      .filter(({ f, status }) => {
        if (filter !== 'all' && status !== filter) return false;
        if (query && !(f.name || '').toLowerCase().includes(query) &&
            !(f.cropName || f.crop || '').toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    renderDashboardSummary(saved);
    renderDashboardAlerts(saved);

    if (!saved.length) {
      grid.innerHTML = `
        <div class="dash-empty">
          <div class="dash-empty-icon">🌾</div>
          <h3>No fields monitored yet</h3>
          <p>Select your first field on the map, run a full satellite analysis, and save it — your farm dashboard will come alive with live health scores from Sentinel-2. Or preview the dashboard with a sample farm.</p>
          <div class="row" style="max-width:420px;margin:0 auto">
            <button class="btn-primary" onclick="FH.showView('map')">＋ Start Your First Analysis</button>
            <button class="btn-secondary" onclick="FH.loadDemoFields()">🌾 Load Demo Farm</button>
          </div>
        </div>`;
      return;
    }

    if (!cards.length) {
      grid.innerHTML = `<div class="dash-empty"><div class="dash-empty-icon">🔍</div><h3>No fields match your filter</h3><p>Try a different search or clear the status filter.</p></div>`;
      return;
    }

    grid.innerHTML = cards.map(({ f, status, score, area }) => {
      const ndviPct = f.ndvi != null ? Math.max(2, Math.min(98, (f.ndvi / 1.0) * 100)) : 2;
      const cropName = f.cropName || (f.crop ? (FH_CONFIG.CROPS[f.crop]?.name || f.crop) : 'Crop');
      const cropIcon = f.crop ? (FH_CONFIG.CROPS[f.crop]?.icon || '🌿') : '🌿';
      const dateTxt = f.date ? new Date(f.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
      const srcBadge = f.demo
        ? '<span class="field-card-src">DEMO</span>'
        : (f.ndvi != null ? '<span class="field-card-src">🛰️ LIVE</span>' : '<span class="field-card-src">UNANALYZED</span>');
      const safeId = String(f.id).replace(/'/g, '&#39;');
      const safeName = String(f.name || 'Field').replace(/'/g, '&#39;');

      return `
        <div class="field-card" onclick="FH.openFieldFromDashboard('${safeId}')" title="Open ${safeName} on map">
          <div class="field-card-banner">
            <span class="field-card-status ${status}">${status}</span>
            ${srcBadge}
          </div>
          <div class="field-card-body">
            <div class="field-card-name">📍 ${safeName}</div>
            <div class="field-card-meta">
              <span>📐 ${area.toFixed(1)} ha</span>
              <span>${cropIcon} ${cropName}</span>
              <span>📅 ${dateTxt}</span>
            </div>
            <div class="ndvi-bar-wrap">
              <div class="ndvi-bar"><div class="ndvi-bar-fill" style="left:${ndviPct}%"></div></div>
              <div class="ndvi-bar-labels"><span>0.0</span><span>NDVI ${f.ndvi != null ? f.ndvi.toFixed(2) : '--'}</span><span>1.0</span></div>
            </div>
            <div class="field-card-footer">
              <span class="field-card-score ${score != null && score < 50 ? 'bad' : score != null && score < 70 ? 'warn' : ''}">
                ${score != null ? 'Health ' + score + '%' : 'Run analysis to score'}
              </span>
              <div class="field-card-actions">
                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); FH.loadFieldFromSavedById('${safeId}')">Analyze</button>
                <button class="btn-secondary btn-sm" onclick="event.stopPropagation(); FH.exportFieldGeoJSON('${safeId}')">GeoJSON</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  // ─── SUMMARY STATS ───
  function renderDashboardSummary(saved) {
    const fields = saved.filter(f => f.ndvi != null);
    let totalArea = 0;
    let scoreSum = 0;
    let alertCount = 0;

    saved.forEach(f => {
      const a = FH_UTILS.areaHa(f.coords || []);
      totalArea += a;
      const status = fieldStatusOf(f.ndvi, f.cropPeak);
      if (status === 'CRITICAL' || status === 'STRESSED') alertCount++;
      if (f.ndvi != null) {
        scoreSum += healthScoreOf(f.ndvi, f.cropPeak);
      }
    });

    const avg = fields.length ? Math.round(scoreSum / fields.length) : null;

    const areaEl = $('dashTotalArea');
    if (areaEl) {
      areaEl.textContent = totalArea >= 100 ? Math.round(totalArea) + ' ha' : totalArea.toFixed(1) + ' ha';
    }
    const healthEl = $('dashAvgHealth');
    if (healthEl) {
      healthEl.textContent = avg != null ? avg + '%' : '--';
      healthEl.className = 'dash-stat-value' + (avg != null && avg < 50 ? ' bad' : avg != null && avg < 70 ? ' warn' : '');
    }
    const countEl = $('dashFieldCount');
    if (countEl) countEl.textContent = saved.length;
    const alertEl = $('dashAlertCount');
    if (alertEl) {
      alertEl.textContent = alertCount;
      alertEl.className = 'dash-stat-value' + (alertCount > 0 ? ' warn' : '');
    }
  }

  // ─── ALERTS LISTING ───
  function renderDashboardAlerts(saved) {
    const section = $('dashAlertsSection');
    const box = $('dashAlerts');
    if (!section || !box) return;

    const alerts = saved
      .map(f => {
        const status = fieldStatusOf(f.ndvi, f.cropPeak);
        if (status === 'OPTIMAL' || status === 'NODATA') return null;
        return { f, status };
      })
      .filter(Boolean)
      .sort((a, b) => (a.status === 'CRITICAL' ? 0 : 1) - (b.status === 'CRITICAL' ? 0 : 1));

    if (!alerts.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    box.innerHTML = alerts.map(({ f, status }) => {
      const safeId = String(f.id).replace(/'/g, '&#39;');
      const isCrit = status === 'CRITICAL';
      const msg = isCrit
        ? `NDVI ${f.ndvi != null ? f.ndvi.toFixed(2) : '--'} is critically low — immediate irrigation, nutrient or scouting intervention recommended.`
        : `NDVI ${f.ndvi != null ? f.ndvi.toFixed(2) : '--'} is below optimum — spot-check stressed zones and consider irrigation or fertilizer.`;
      return `
        <div class="dash-alert-item ${isCrit ? 'critical' : ''}" onclick="FH.openFieldFromDashboard('${safeId}')">
          <span class="dash-alert-icon">${isCrit ? '🚨' : '⚠️'}</span>
          <div class="dash-alert-body">
            <div class="dash-alert-title">${isCrit ? 'Critical stress' : 'Stress detected'} — ${String(f.name || 'Field').replace(/'/g, '&#39;')}</div>
            <div class="dash-alert-msg">${msg}</div>
          </div>
          <span class="dash-alert-field">${status}</span>
        </div>`;
    }).join('');
  }

  // ─── OPEN A FIELD FROM DASHBOARD ───
  function openFieldFromDashboard(id) {
    const field = FH_MAP.findSavedField(id);
    if (!field) return toast('⚠️ Field not found', 'err');
    showView('map');
    setTimeout(() => {
      FH_MAP.loadFieldFromSaved(field);
      toast('📌 Loaded: ' + (field.name || 'Field'));
    }, 150);
  }

  // ─── DELETE A FIELD FROM DASHBOARD ───
  function deleteFieldFromDashboard(id) {
    if (!confirm('Delete this field from your dashboard?')) return;
    FH_MAP.deleteSavedField(id);
    renderDashboard();
  }

  // ─── EXPORT A SAVED FIELD AS GEOJSON ───
  function exportFieldGeoJSON(id) {
    const field = FH_MAP.findSavedField(id);
    if (!field || !field.coords || !field.coords.length) return toast('⚠️ No boundary for this field', 'err');
    const coords = field.coords.map(ll => [ll[1], ll[0]]);
    coords.push(coords[0]);
    const gj = JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {
          name: field.name || 'Field',
          area_ha: FH_UTILS.areaHa(field.coords).toFixed(2),
          ndvi: field.ndvi,
          health_score: healthScoreOf(field.ndvi, field.cropPeak),
          crop: field.crop || '',
          last_analyzed: field.date || null
        }
      }]
    }, null, 2);
    FH_UTILS.downloadBlob(gj, (field.name || 'field').replace(/\s+/g, '_').toLowerCase() + '.geojson', 'application/json');
    toast('GeoJSON exported');
  }

  return {
    setStateRef,
    checkLoginState,
    handleLogin,
    handleGoogleLogin,
    selectGoogleAccount,
    updateLoginUI,
    renderScenes,
    selectScene,
    renderEnhancedScenes,
    renderWeather,
    renderTerrain,
    renderSoil,
    renderResults,
    renderAdvice,
    renderHealthChart,
    renderTSChart,
    openModal,
    closeModal,
    showChangeDetection,
    runChangeDetection,
    toggleCard,
    setMode,
    openLearning,
    openQuiz,
    goToLesson,
    nextLesson,
    prevLesson,
    selectQuizOpt,
    submitQuiz,
    loadSettings,
    saveSettings,
    saveLandInfo,
    loadLandInfo,
    applyPlaceToLandInfo,
    openLandPortal,
    updateLandStatus,
    autoScanLocation,
    importLandRecordsCSV,
    matchCSVRecord,
    renderLocationScan,
    updateLegend,
    renderYieldProjection,
    renderPestRiskCards,
    renderAlerts,
    startOnboarding,
    nextOnboardingStep,
    prevOnboardingStep,
    skipOnboarding,
    finishOnboarding,
    renderSavedFields,
    renderDataDashboard,
    // Farm Dashboard
    showView,
    renderDashboard,
    loadDemoFields,
    openFieldFromDashboard,
    deleteFieldFromDashboard,
    exportFieldGeoJSON,
    fieldStatusOf,
    healthScoreOf,
    // Infrastructure & Journal
    saveInfrastructure,
    loadInfrastructure,
    loadOSMInfrastructure,
    clearOSMInfrastructure,
    saveJournalEntry,
    loadJournalEntries,
    renderJournalEntries,
    deleteJournalEntry,
    exportJournal,
    showAISourceIndicator,
    hideAISourceIndicator
  };
})();
