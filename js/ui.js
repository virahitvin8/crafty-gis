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
  const LESSONS = [
    { title: 'Remote Sensing Basics', content: '<h4>What is Remote Sensing?</h4><p>Remote sensing is the science of obtaining information about objects from a distance using satellites or aircraft. In agriculture, we use satellite imagery to monitor crop health without visiting every field.</p><h4>Sentinel-2 Mission</h4><p>Sentinel-2 is a European Space Agency mission with two satellites providing free, open-access imagery globally every 5 days at 10m resolution.</p>' },
    { title: 'Understanding NDVI', content: '<h4>What is NDVI?</h4><p>The Normalized Difference Vegetation Index quantifies vegetation greenness by comparing near-infrared (NIR) and red light reflectance.</p><div class="formula">NDVI = (NIR − Red) / (NIR + Red)</div><h4>Value Ranges</h4><ul><li><b>-1 to 0:</b> Water, snow, bare soil</li><li><b>0.15 to 0.30:</b> Stressed vegetation</li><li><b>0.45 to 0.60:</b> Moderate vegetation</li><li><b>0.60 to 0.90:</b> Dense healthy vegetation</li></ul>' },
    { title: 'Vegetation Indices', content: '<h4>Beyond NDVI</h4><p><b>EVI</b> — Better for dense canopies. Uses blue band for atmospheric correction.<br><b>SAVI</b> — Soil-adjusted. Best for sparse vegetation.<br><b>GNDVI</b> — Chlorophyll-sensitive. Great for nitrogen assessment.<br><b>NDMI</b> — Measures leaf water content. Critical for drought detection.<br><b>NDRE</b> — Uses red edge band. Best for mid-to-late season monitoring.</p>' },
    { title: 'Sentinel-2 Bands', content: '<h4>13 Spectral Bands</h4><p><b>B2 (Blue, 490nm):</b> Atmospheric correction<br><b>B3 (Green, 560nm):</b> Chlorophyll assessment<br><b>B4 (Red, 665nm):</b> Chlorophyll absorption — key for NDVI<br><b>B5-7 (Red Edge, 705-783nm):</b> Canopy structure, LAI<br><b>B8 (NIR, 842nm):</b> Biomass, vegetation vigour<br><b>B11-12 (SWIR):</b> Moisture content</p><p><b>Resolution:</b> 10m (B2-4, B8), 20m (red edge, SWIR), 60m (atmospheric)</p>' },
    { title: 'Terrain in Agriculture', content: '<h4>Why Terrain Matters</h4><ul><li><b>Slope <2°:</b> Flat — water stagnation risk</li><li><b>Slope 2-5°:</b> Ideal for most crops</li><li><b>Slope >5°:</b> Erosion risk — consider contour farming</li></ul><p>Terrain affects water distribution, sunlight exposure, and microclimates across your field.</p>' },
    { title: 'Soil Properties', content: '<h4>Key Soil Parameters</h4><p><b>pH:</b> Controls nutrient availability. Ideal: 6.0-7.5<br><b>Organic Carbon:</b> Soil health indicator. >1.5% is good<br><b>Texture:</b> Clay retains water, sand drains fast<br><b>CEC:</b> Soil\'s ability to hold nutrients</p><p>Low NDVI zones often correlate with soil problems — combining soil data with NDVI maps finds the ROOT CAUSE.</p>' },
    { title: 'Weather & Farming', content: '<h4>Key Parameters</h4><p><b>Temperature:</b> >40°C = heat stress, <5°C = frost risk<br><b>Precipitation:</b> Compare 30-day total with crop water need<br><b>Humidity:</b> >85% + warmth = fungal disease risk<br><b>ET₀:</b> Atmospheric water demand. If ET₀ > rainfall, irrigate.</p><p>Combine ET₀ with NDMI for precise irrigation scheduling.</p>' },
    { title: 'Reading Reports', content: '<h4>Understanding Your Report</h4><p><b>Health Score (0-100%):</b> Average NDVI vs crop peak NDVI. Above 80% = excellent.<br><b>Problem Area:</b> Fraction in "Bare soil/Poor/Below avg". Even 10% matters.<br><b>Time Series:</b> Healthy crops show a bell curve — rising at vegetative, peaking at flowering, declining at maturity.</p>' }
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

  // ─── Deterministic Land Info Generator ───
  function generateDeterministicLandInfo(lat, lng) {
    const latInt = Math.abs(Math.round(lat * 10000));
    const lngInt = Math.abs(Math.round(lng * 10000));
    
    // Deterministic Survey Number
    const surveyNum = `${(latInt % 400) + 1}/${(lngInt % 15) + 1}`;
    
    // Deterministic Bona / Patta / Khata Number
    const bonaNum = `${(lngInt % 800) + 100}/${(latInt % 900) + 100}`;
    
    // Deterministic Owner Name
    const owners = [
      'Ram Singh', 'Rajesh Kumar', 'Suresh Patel', 'Vijay Sharma', 'Amit Verma',
      'Sunita Devi', 'Ramesh Yadav', 'Harpreet Singh', 'Baldev Chaudhary', 'Karan Johar',
      'Gurpreet Singh', 'Anil Mehta', 'Sanjay Patil', 'Devi Lal', 'Santosh Devi',
      'Radha Raman', 'Mahendra Prasad', 'Shiv Charan', 'Jagdish Chandra', 'Rupesh Gowda'
    ];
    const ownerName = owners[(latInt + lngInt) % owners.length];
    
    return {
      survey: surveyNum,
      bona: bonaNum,
      owner: ownerName
    };
  }

  // ═══════════ LAND INFO (CADASTRAL) ═══════════
  function saveLandInfo() {
    if (!_state.fieldCenter) return toast('Select a field first', 'err');
    const survey = $('lrSurveyInput').value.trim();
    const owner = $('lrOwnerInput').value.trim();
    const bona = $('lrBonaInput')?.value.trim() || '';
    if (!survey && !owner && !bona) return toast('Enter at least one detail', 'err');
    
    const lat = _state.fieldCenter[0].toFixed(4);
    const lng = _state.fieldCenter[1].toFixed(4);
    const key = `fh_land_${lat}_${lng}`;
    
    localStorage.setItem(key, JSON.stringify({ survey, owner, bona }));
    toast('Farm details saved to device!');
  }

  function loadLandInfo(lat, lng) {
    const key = `fh_land_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const saved = localStorage.getItem(key);
    
    // Generate automatic defaults based on selected location coordinates
    const generated = generateDeterministicLandInfo(lat, lng);
    let survey = generated.survey;
    let bona = generated.bona;
    let owner = generated.owner;
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.survey) survey = data.survey;
        if (data.bona) bona = data.bona;
        if (data.owner) owner = data.owner;
      } catch (e) { /* ignore */ }
    }
    
    $('lrSurveyInput').value = survey;
    $('lrOwnerInput').value = owner;
    if ($('lrBonaInput')) $('lrBonaInput').value = bona;
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

  return {
    setStateRef,
    checkLoginState,
    handleLogin,
    handleGoogleLogin,
    selectGoogleAccount,
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
    renderDataDashboard
  };
})();
