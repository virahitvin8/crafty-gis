/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Map Module
   ═══════════════════════════════════════════════════════════ */

const FH_MAP = (function() {
  'use strict';

  const { $, toast, parseDMS, polyCenter } = FH_UTILS;

  // ─── Shared state reference ───
  let _state = null;
  let _gpsWatchId = null;

  function setStateRef(state) {
    _state = state;
  }

  // ═══════════ USER GPS LOCATION MARKER ═══════════
  // Places a pulsing blue "You are here" dot + accuracy circle at the user's
  // current location whenever GPS is available, and keeps it live via watchPosition.
  let _userMarker = null;
  let _userAccuracyCircle = null;
  let _userWatchId = null;

  function placeUserMarker(lat, lng, accuracy) {
    if (!_state.map) return;
    // Remove previous marker + accuracy circle
    if (_userMarker) _state.map.removeLayer(_userMarker);
    if (_userAccuracyCircle) _state.map.removeLayer(_userAccuracyCircle);

    if (accuracy) {
      _userAccuracyCircle = L.circle([lat, lng], {
        radius: accuracy || 50,
        color: '#2e86de', weight: 1, opacity: 0.4,
        fillColor: '#2e86de', fillOpacity: 0.08
      }).addTo(_state.map);
    }

    const icon = L.divIcon({
      className: 'user-loc-marker',
      html: '<div class="user-loc-pulse"></div><div class="user-loc-dot"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
    _userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
      .bindTooltip('📍 You are here', { permanent: false, direction: 'top' })
      .addTo(_state.map);
  }

  // Requests the user's current GPS position and drops the blue "You are here"
  // marker on the map. Optional: recenters the map to the user location.
  function locateUser(centerMap) {
    if (!('geolocation' in navigator)) {
      toast('GPS not supported on this device', 'err');
      return;
    }
    toast('📍 Locating you…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        placeUserMarker(latitude, longitude, accuracy);
        if (centerMap) _state.map.setView([latitude, longitude], 17);
        toast(`📍 You are here (accuracy ±${Math.round(accuracy || 0)}m)`);
        // Keep the marker live as the user moves
        if (_userWatchId === null) {
          _userWatchId = navigator.geolocation.watchPosition(
            (p2) => placeUserMarker(p2.coords.latitude, p2.coords.longitude, p2.coords.accuracy),
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
          );
        }
      },
      (err) => {
        console.warn('GPS Error:', err);
        toast('GPS Error: ' + err.message, 'err');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  // ═══════════ MAP SETUP ═══════════
  function initMap() {
    _state.map = L.map('map', { zoomControl: true, attributionControl: true, maxZoom: 19 }).setView([22.5, 78.9], 5);

    // Basemaps: every layer uses providers with global coverage and NO
    // "Map data not yet available" placeholder tiles (that message came from
    // OpenTopoMap / tile.openstreetmap.org tiles that had not been rendered).
    // maxNativeZoom is set so Leaflet scales tiles instead of requesting
    // missing tiles when zooming in past a layer's native resolution.
    _state.basemaps = [
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, maxNativeZoom: 19, attribution: 'Imagery © Esri'
      }),
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 20, maxNativeZoom: 20, subdomains: 'abcd', attribution: '© OpenStreetMap contributors © CARTO'
      }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19, maxNativeZoom: 19, attribution: 'Tiles © Esri'
      })
    ];
    _state.satLayer = _state.basemaps[0].addTo(_state.map);
    // Labels overlay uses Esri reference tiles (designed to sit on top of the
    // satellite basemap) instead of OSM tiles, which showed placeholder text.
    _state.lblLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, maxNativeZoom: 19, opacity: 0.25
    }).addTo(_state.map);

    _state.ndviLayer = L.layerGroup().addTo(_state.map);
    _state.drawMarkers = L.layerGroup().addTo(_state.map);

    // Click handler for drawing field corners
    _state.map.on('click', e => {
      if (!_state.drawMode) return;
      _state.drawPts.push(e.latlng);
      L.circleMarker(e.latlng, {
        radius: 7, color: '#f39c12', fillColor: '#f1c40f', fillOpacity: 1, weight: 2
      }).bindTooltip('Corner ' + _state.drawPts.length).addTo(_state.drawMarkers);

      if (_state.drawLine) _state.map.removeLayer(_state.drawLine);
      if (_state.drawPts.length > 1)
        _state.drawLine = L.polyline(_state.drawPts, {
          color: '#f39c12', dashArray: '6,6', weight: 2
        }).addTo(_state.map);

      $('coordList').innerHTML = _state.drawPts.map((p, i) =>
        `<div>Corner ${i + 1}: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>`
      ).join('');
    });
  }

  function toggleLayer() {
    _state.labelsOn = !_state.labelsOn;
    _state.labelsOn ? _state.lblLayer.addTo(_state.map) : _state.map.removeLayer(_state.lblLayer);
  }

  function cycleBasemap() {
    _state.map.removeLayer(_state.basemaps[_state.basemapIdx]);
    _state.basemapIdx = (_state.basemapIdx + 1) % _state.basemaps.length;
    _state.basemaps[_state.basemapIdx].addTo(_state.map);
    const names = ['Satellite', 'Street', 'Terrain'];
    toast('Basemap switched to ' + names[_state.basemapIdx]);
  }

  // ═══════════ FIELD INPUT: COORDINATES ═══════════
  function setFieldFromCoords() {
    let lat = parseFloat($('latInput').value);
    let lng = parseFloat($('lngInput').value);
    if (isNaN(lat)) lat = parseDMS($('latInput').value);
    if (isNaN(lng)) lng = parseDMS($('lngInput').value);
    const ha = parseFloat($('haInput').value) || 5;

    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      return toast('Enter valid coordinates', 'err');

    const sideM = Math.sqrt(ha * 10000);
    const dLat = (sideM / 2) / 111320;
    const dLng = (sideM / 2) / (111320 * Math.cos(lat * Math.PI / 180));

    setFieldBoundary([
      [lat - dLat, lng - dLng], [lat - dLat, lng + dLng],
      [lat + dLat, lng + dLng], [lat + dLat, lng - dLng]
    ]);
    _state.map.setView([lat, lng], 16);
    toast('Field set — press Run Full Analysis.');
  }

  // ═══════════ FIELD INPUT: CLICK-TO-DRAW ═══════════
  function toggleDraw() {
    _state.drawMode = !_state.drawMode;
    const btn = $('drawBtn'),
      banner = $('modeBanner');
    if (_state.drawMode) {
      btn.classList.add('btn-active');
      btn.textContent = 'Marking Corners… (click map)';
      banner.style.display = 'block';
      _state.map.getContainer().style.cursor = 'crosshair';
    } else {
      btn.classList.remove('btn-active');
      btn.textContent = 'Start Marking Corners';
      banner.style.display = 'none';
      _state.map.getContainer().style.cursor = '';
    }
  }

  function finishDraw() {
    if (_state.drawPts.length < 3) return toast('Mark at least 3 corners', 'err');
    setFieldBoundary(_state.drawPts.map(p => [p.lat, p.lng]));
    if (_state.drawMode) toggleDraw();
    clearDrawHelpers();
    toast('Boundary saved.');
  }

  function clearDraw() {
    clearDrawHelpers();
    _state.drawPts = [];
    $('coordList').innerHTML = '';
    toast('Points cleared');
  }

  function clearDrawHelpers() {
    _state.drawMarkers.clearLayers();
    if (_state.drawLine) {
      _state.map.removeLayer(_state.drawLine);
      _state.drawLine = null;
    }
  }

  // ═══════════ FIELD INPUT: GPS WALK ═══════════
  function startGpsWalk() {
    if (!('geolocation' in navigator)) return toast('GPS not supported on this device', 'err');
    
    _state.drawPts = [];
    clearDrawHelpers();
    
    $('gpsStartBtn').style.display = 'none';
    $('gpsPinBtn').style.display = 'block';
    $('gpsFinishBtn').style.display = 'block';
    $('gpsHint').textContent = 'Walk to the next corner and press Drop Pin.';
    
    toast('Requesting GPS location...');
    
    _gpsWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        placeUserMarker(latitude, longitude, accuracy);
        _state.map.setView([latitude, longitude], 19);
        toast(`Location updated (Accuracy: ${Math.round(accuracy)}m)`);
      },
      (err) => {
        console.warn('GPS Error:', err);
        toast('GPS Error: ' + err.message, 'err');
      },
      { enableHighAccuracy: true, maximumAge: 0 }
    );
  }

  function dropGpsPin() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        placeUserMarker(latitude, longitude, accuracy);
        const p = L.latLng(latitude, longitude);
        _state.drawPts.push(p);
        L.circleMarker(p, {
          radius: 8, color: '#e74c3c', fillColor: '#c0392b', fillOpacity: 1, weight: 2
        }).bindTooltip('GPS Pin ' + _state.drawPts.length).addTo(_state.drawMarkers);

        if (_state.drawLine) _state.map.removeLayer(_state.drawLine);
        if (_state.drawPts.length > 1) {
          _state.drawLine = L.polyline(_state.drawPts, {
            color: '#e74c3c', dashArray: '5,5', weight: 3
          }).addTo(_state.map);
        }
        toast(`Pinned corner ${_state.drawPts.length}`);
      },
      (err) => toast('Could not pin location: ' + err.message, 'err'),
      { enableHighAccuracy: true }
    );
  }

  function finishGpsWalk() {
    if (_gpsWatchId !== null) {
      navigator.geolocation.clearWatch(_gpsWatchId);
      _gpsWatchId = null;
    }
    
    $('gpsStartBtn').style.display = 'block';
    $('gpsPinBtn').style.display = 'none';
    $('gpsFinishBtn').style.display = 'none';
    $('gpsHint').textContent = 'Walk to the first corner of your field and press Start. Ensure location services are enabled.';
    
    if (_state.drawPts.length < 3) {
      _state.drawPts = [];
      clearDrawHelpers();
      return toast('Mark at least 3 GPS corners to form a field', 'err');
    }
    
    setFieldBoundary(_state.drawPts.map(p => [p.lat, p.lng]));
    clearDrawHelpers();
    _state.drawPts = [];
    toast('GPS Boundary saved.');
  }

  // ═══════════ FIELD BOUNDARY ── shared ═══════════
  function setFieldBoundary(ll) {
    if (_state.fieldPoly) _state.map.removeLayer(_state.fieldPoly);
    _state.ndviLayer.clearLayers();
    hideResults();
    _state.fieldLL = ll;
    _state.fieldCenter = polyCenter(ll);
    // Reset simulated data flag — new field needs fresh analysis
    _state.simulatedData = false;
    _state.analysisData = null;
    _state.fieldPoly = L.polygon(ll, {
      color: '#2ecc71', weight: 2.5, fillOpacity: 0.04, dashArray: '8,4'
    }).addTo(_state.map);
    _state.map.fitBounds(_state.fieldPoly.getBounds(), { padding: [50, 50] });
    
    // Trigger Land Info logic
    $('landRecordCard').style.display = 'block';
    $('infraCard').style.display = 'block';
    $('journalCard').style.display = 'block';
    $('lrLocation').textContent = 'Fetching...';
    if ($('lrArea')) $('lrArea').textContent = FH_UTILS.areaHa(ll).toFixed(2);
    
    // Auto-load any previously saved data for these coordinates
    if (window.FH_UI && FH_UI.loadLandInfo) {
      FH_UI.loadLandInfo(_state.fieldCenter[0], _state.fieldCenter[1]);
    }
    if (window.FH_UI && FH_UI.loadInfrastructure) {
      FH_UI.loadInfrastructure();
    }
    if (window.FH_UI && FH_UI.loadJournalEntries) {
      FH_UI.loadJournalEntries();
    }
    
    // Real location details (village/district/state) via a single reverse geocode
    FH_API.reverseGeocodeFull(_state.fieldCenter[0], _state.fieldCenter[1])
      .then(place => {
        if (!place) {
          $('lrLocation').textContent = 'Location Unavailable';
          return;
        }
        const parts = [];
        if (place.village) parts.push(place.village);
        if (place.district) parts.push(place.district);
        if (place.subdistrict) parts.push(place.subdistrict);
        if (place.state) parts.push(place.state);
        if (place.pincode) parts.push('PIN ' + place.pincode);
        $('lrLocation').textContent = parts.join(', ') || place.full || 'Unknown Location';
        if (window.FH_UI && FH_UI.applyPlaceToLandInfo) {
          FH_UI.applyPlaceToLandInfo(place);
        }
        // Auto-scan: pincode + OSM infrastructure + imported records match,
        // all shown in the Land Info card ("What's at this location").
        if (window.FH_UI && FH_UI.autoScanLocation) {
          FH_UI.autoScanLocation();
        }
      })
      .catch(() => {
        $('lrLocation').textContent = 'Location Unavailable';
      });
      
    // Fetch live weather immediately when location is set
    FH_API.fetchWeather()
      .then(() => {
        if (window.FH_UI && FH_UI.renderWeather) {
          FH_UI.renderWeather();
        }
      })
      .catch(err => console.warn('Live weather fetch on field boundary change failed:', err));
  }

  // ═══════════ MOISTURE GRID OVERLAY ═══════════
  // Draws a colored grid on the map showing moisture distribution
  let _moistureGrid = null;

  function renderMoistureGrid(moistureData, bounds) {
    // Remove existing grid
    if (_moistureGrid) {
      _state.map.removeLayer(_moistureGrid);
      _moistureGrid = null;
    }
    
    if (!moistureData || !bounds) return;
    
    _moistureGrid = L.layerGroup().addTo(_state.map);
    
    // Create a 4x4 grid
    const rows = 4, cols = 4;
    const latStep = (bounds._northEast.lat - bounds._southWest.lat) / rows;
    const lngStep = (bounds._northEast.lng - bounds._southWest.lng) / cols;
    
    // Generate simulated grid values based on the moisture index
    // (In production, would fetch real pixel values)
    const baseMoisture = moistureData.moistureIndex || 0.5;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const lat1 = bounds._southWest.lat + i * latStep;
        const lng1 = bounds._southWest.lng + j * lngStep;
        const lat2 = lat1 + latStep;
        const lng2 = lng1 + lngStep;
        
        // Add some spatial variation
        const variation = (Math.sin(i * 1.5 + j * 2.3) * 0.15 + Math.cos(i * 2.1 - j * 1.7) * 0.1);
        const cellMoisture = Math.max(0, Math.min(1, baseMoisture + variation));
        
        // Color: blue (wet) to brown (dry)
        const r = Math.round(139 + (52 - 139) * cellMoisture);
        const g = Math.round(90 + (152 - 90) * cellMoisture);
        const b = Math.round(43 + (219 - 43) * cellMoisture);
        
        const color = `rgba(${r},${g},${b},0.4)`;
        
        L.rectangle([
          [lat1, lng1],
          [lat2, lng2]
        ], {
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.5,
          weight: 1
        }).bindTooltip(`Moisture: ${(cellMoisture * 100).toFixed(0)}%`).addTo(_moistureGrid);
      }
    }
  }


  // ═══════ SHOW MY CURRENT LOCATION ═══════
  function showMyLocation() {
    if (!('geolocation' in navigator)) {
      return toast('GPS not supported on this device', 'err');
    }

    toast('📍 Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const userLatLng = L.latLng(latitude, longitude);
        
        // Remove existing user marker if present
        if (_state.userLocationMarker) {
          _state.map.removeLayer(_state.userLocationMarker);
        }
        
        // Add user location marker with custom icon
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `<div style="background-color: #3498db; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        _state.userLocationMarker = L.marker(userLatLng, { icon: userIcon })
          .addTo(_state.map)
          .bindPopup(`<b>📍 You are here</b><br>Accuracy: ±${Math.round(accuracy)}m`)
          .openPopup();
        
        // Center map on user location
        _state.map.setView([latitude, longitude], 17);
        
        toast(`✅ Location found (Accuracy: ±${Math.round(accuracy)}m)`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        let errorMsg = 'Could not get location';
        if (err.code === 1) errorMsg = 'Location permission denied. Please enable GPS.';
        else if (err.code === 2) errorMsg = 'Location unavailable. Please try again.';
        else if (err.code === 3) errorMsg = 'Location request timed out. Please try again.';
        toast('❌ ' + errorMsg, 'err');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function hideResults() {
    ['resultsCard', 'scenesCard', 'weatherCard', 'terrainCard', 'soilCard', 'chartCard', 'tsCard', 'aiCard', 'indexCard', 'landRecordCard', 'infraCard', 'journalCard']
    .forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    const ml = $('mapLegend');
    if (ml) ml.style.display = 'none';
    const ism = $('indexSelectorMap');
    if (ism) ism.style.display = 'none';
  }

  // ═══════════ FILE INPUT (KML/GeoJSON) ═══════════
  function initFileInput() {
    const dz = $('dropzone'),
      fi = $('fileInput');
    dz.addEventListener('click', () => fi.click());
    dz.addEventListener('dragover', e => { e.preventDefault();
      dz.classList.add('drag'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]);
    });
    fi.addEventListener('change', () => { if (fi.files[0]) readFile(fi.files[0]); });
  }

  function readFile(f) {
    const r = new FileReader();
    r.onload = () => {
      const text = r.result;
      if (f.name.endsWith('.geojson') || f.name.endsWith('.json')) {
        try {
          const gj = JSON.parse(text);
          const coords = extractGeoJSONCoords(gj);
          if (coords.length < 3) throw new Error('too few');
          setFieldBoundary(coords);
          toast('GeoJSON loaded.');
        } catch { toast('No polygon found in GeoJSON', 'err'); }
      } else {
        try {
          const x = new DOMParser().parseFromString(text, 'text/xml');
          let c = x.querySelector('Polygon coordinates') || x.querySelector('coordinates');
          if (!c) throw 0;
          const pts = c.textContent.trim().split(/\s+/).map(s => {
            const [a, b] = s.split(',').map(Number);
            return [b, a];
          }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
          if (pts.length < 3) throw 0;
          setFieldBoundary(pts);
          toast('KML loaded.');
        } catch { toast('No polygon found in file', 'err'); }
      }
    };
    r.readAsText(f);
  }

  function extractGeoJSONCoords(gj) {
    let feature = gj;
    if (gj.type === 'FeatureCollection') feature = gj.features[0];
    if (feature.type === 'Feature') feature = feature.geometry;
    if (feature.type === 'Polygon') return feature.coordinates[0].map(c => [c[1], c[0]]);
    if (feature.type === 'MultiPolygon') return feature.coordinates[0][0].map(c => [c[1], c[0]]);
    return [];
  }

  // ═══════════ FULLSCREEN MAP ═══════════
  function toggleFullscreen() {
    const mapArea = document.getElementById('mapArea');
    const sidebar = document.getElementById('sidebar');
    if (!_state.fullscreen) {
      _state.fullscreen = true;
      sidebar.style.display = 'none';
      mapArea.style.width = '100vw';
      mapArea.style.height = '100vh';
      setTimeout(() => _state.map.invalidateSize(), 100);
      toast('Fullscreen mode — press Esc to exit');
    } else {
      _state.fullscreen = false;
      sidebar.style.display = '';
      mapArea.style.width = '';
      mapArea.style.height = '';
      setTimeout(() => _state.map.invalidateSize(), 100);
      toast('Exited fullscreen mode');
    }
  }

  // ═══════════ SPLIT-VIEW COMPARISON ═══════════
  // Renders the current layer on the LEFT half of the map and a second
  // index (default NDMI) on the RIGHT half, separated by a draggable divider.
  // The right pane is rendered via FH_API.renderGrid(..., 'comparePane', true)
  // which gracefully falls back to DEMO data when the satellite API is
  // unreachable — so Compare always produces a visible result.
  let _splitActive = false;
  let _splitDividerInited = false;

  function indexName(idx) {
    const key = idx === 'sar' ? 'smmi' : idx;
    return FH_CONFIG.INDEX_INFO[key]?.name ||
           FH_CONFIG.STRESS_INDEX_INFO[key]?.name ||
           (idx || '').toUpperCase() || 'Layer';
  }

  function compareDateStr() {
    return _state.selectedScene ? _state.selectedScene.date : new Date().toISOString().split('T')[0];
  }

  function updateCompareLabel() {
    const el = document.getElementById('compareLabel');
    if (el) el.textContent = indexName(_state.currentIndex) + '  |  ' + indexName(_state.compareLayer);
  }

  function setCompareSplit(pct) {
    const map = _state.map;
    const div = document.getElementById('compareDivider');
    if (!map || !div) return;
    div.style.left = pct + '%';
    const overlay = map.getPane('overlayPane');
    const pane = map.getPane('comparePane');
    if (overlay) {
      overlay.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      overlay.style.webkitClipPath = `inset(0 ${100 - pct}% 0 0)`;
    }
    if (pane) {
      pane.style.clipPath = `inset(0 0 0 ${pct}%)`;
      pane.style.webkitClipPath = `inset(0 0 0 ${pct}%)`;
    }
  }

  function initCompareDivider() {
    if (_splitDividerInited) return;
    _splitDividerInited = true;
    const div = document.getElementById('compareDivider');
    const mapArea = document.getElementById('mapArea');
    if (!div || !mapArea) return;
    div.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (div.setPointerCapture) div.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const rect = mapArea.getBoundingClientRect();
        const pct = Math.max(12, Math.min(88, ((ev.clientX - rect.left) / rect.width) * 100));
        setCompareSplit(pct);
      };
      const up = () => {
        div.removeEventListener('pointermove', move);
        div.removeEventListener('pointerup', up);
      };
      div.addEventListener('pointermove', move);
      div.addEventListener('pointerup', up);
    });
  }

  function renderCompareLayer(idx, dateStr) {
    return FH_API.renderGrid(idx || 'ndmi', dateStr, cropPeak(), null, 'comparePane', true)
      .then(() => toast('Right pane: ' + indexName(idx || 'ndmi')));
  }

  function enableCompare(layerType, dateStr) {
    if (!_state.fieldPoly) return toast('Select a field first', 'err');
    if (_splitActive) disableCompare();

    _splitActive = true;
    _state.compareMode = true;
    _state.compareLayer = layerType || 'ndmi';
    _state.compareDate = dateStr || compareDateStr();

    // Dedicated Leaflet pane for the right-hand (compare) layer
    const map = _state.map;
    if (!map.getPane('comparePane')) map.createPane('comparePane');
    const pane = map.getPane('comparePane');
    pane.style.pointerEvents = 'none';
    pane.style.zIndex = '450';
    pane.style.clipPath = 'inset(0 0 0 50%)';
    pane.style.webkitClipPath = 'inset(0 0 0 50%)';

    // Fresh layer group for the compare layers
    if (_state.compareLayers) map.removeLayer(_state.compareLayers);
    _state.compareLayers = L.layerGroup().addTo(map);

    initCompareDivider();
    setCompareSplit(50);

    // Show the compare bar overlay + divider
    const bar = document.getElementById('compareBar');
    if (bar) bar.classList.add('show');
    const div = document.getElementById('compareDivider');
    if (div) div.style.display = 'flex';

    updateCompareLabel();
    toast('Split-view: ' + indexName(_state.currentIndex) + ' (left) vs ' + indexName(_state.compareLayer) + ' (right) — drag the divider');

    // Ensure the left side has content (e.g. before a full analysis) and
    // render the compare layer into the right pane — never shows API errors.
    const leftReady = _state.analysisData
      ? Promise.resolve()
      : FH_API.renderGrid(_state.currentIndex, _state.compareDate, cropPeak(), null, null, true);
    leftReady.then(() => renderCompareLayer(_state.compareLayer, _state.compareDate));
  }

  function cropPeak() {
    return (FH_CONFIG.CROPS[$('cropSelect')?.value] || FH_CONFIG.CROPS.generic).peak;
  }

  // Switch which index the RIGHT pane shows (while left keeps the current one)
  function compareLayer(layerType) {
    if (!_splitActive) return enableCompare(layerType);
    _state.compareLayer = layerType || 'ndmi';
    _state.compareDate = compareDateStr();
    updateCompareLabel();
    renderCompareLayer(_state.compareLayer, _state.compareDate);
  }

  function disableCompare() {
    if (!_splitActive) return;
    _splitActive = false;
    _state.compareMode = false;
    _state.compareLayer = null;
    _state.compareDate = null;

    const map = _state.map;
    const overlay = map.getPane('overlayPane');
    if (overlay) {
      overlay.style.clipPath = '';
      overlay.style.webkitClipPath = '';
    }
    if (_state.compareLayers) {
      map.removeLayer(_state.compareLayers);
      _state.compareLayers = null;
    }
    const pane = map.getPane('comparePane');
    if (pane) {
      pane.style.clipPath = '';
      pane.style.webkitClipPath = '';
    }

    // Hide the compare bar overlay + divider
    const bar = document.getElementById('compareBar');
    if (bar) bar.classList.remove('show');
    const div = document.getElementById('compareDivider');
    if (div) div.style.display = 'none';

    toast('Split-view disabled');
  }

  // ═══════════ TIME ANIMATION ═══════════
  function startTimeAnimation(scenes) {
    if (!scenes || scenes.length < 2) {
      return toast('Need at least 2 scenes for animation', 'err');
    }

    if (_state.timeAnimating) {
      stopTimeAnimation();
      return;
    }

    _state.timeAnimScenes = scenes;
    _state.timeAnimIdx = 0;
    _state.timeAnimating = true;

    // Show animation controls
    const controls = document.getElementById('animControls');
    if (controls) controls.classList.add('show');
    const progress = document.getElementById('animProgress');
    if (progress) progress.textContent = `1/${scenes.length}`;

    toast('Animation started — click again to stop');
    animateNextFrame();
  }

  // ─── Convenience wrapper: reads scenes from internal state ───
  function toggleTimeAnimation() {
    if (!_state.scenes || _state.scenes.length < 2) {
      return toast('Run analysis first to get satellite scenes', 'err');
    }
    if (_state.timeAnimating) {
      stopTimeAnimation();
    } else {
      startTimeAnimation(_state.scenes);
    }
  }

  function animateNextFrame() {
    if (!_state.timeAnimating || !_state.timeAnimScenes.length) {
      stopTimeAnimation();
      return;
    }

    const scene = _state.timeAnimScenes[_state.timeAnimIdx];
    _state.selectedScene = scene;

    // Update animation date display
    const animDateEl = document.getElementById('animDate');
    if (animDateEl) animDateEl.textContent = scene.date || '--';
    const progress = document.getElementById('animProgress');
    if (progress) progress.textContent = `${_state.timeAnimIdx + 1}/${_state.timeAnimScenes.length}`;

    if (_state.analysisData) {
      FH_ANALYSIS.switchLayer(_state.currentIndex);
    }

    _state.timeAnimIdx = (_state.timeAnimIdx + 1) % _state.timeAnimScenes.length;
    _state.timeAnimFrame = setTimeout(() => animateNextFrame(), 1500);
  }

  function stopTimeAnimation() {
    _state.timeAnimating = false;
    if (_state.timeAnimFrame) {
      clearTimeout(_state.timeAnimFrame);
      _state.timeAnimFrame = null;
    }
    
    // Hide animation controls
    const controls = document.getElementById('animControls');
    if (controls) controls.classList.remove('show');
    
    toast('Animation stopped');
  }

  // ═══════════ SAVED FIELDS ═══════════
  // Find a saved field by id (string or number)
  function findSavedField(id) {
    const saved = _state.savedFields.length ? _state.savedFields : loadSavedFields();
    return saved.find(f => String(f.id) === String(id)) || null;
  }

  // Load a saved field by id, then show it on the map
  function loadFieldFromSavedById(id) {
    const field = findSavedField(id);
    if (!field) return toast('⚠️ Invalid saved field', 'err');
    if (FH_UI && FH_UI.showView) FH_UI.showView('map');
    setTimeout(() => loadFieldFromSaved(field), 150);
  }

  // Update an existing saved field whose coords match the current field with
  // fresh analysis data — keeps the dashboard live after re-analysis.
  function updateSavedFieldHealth() {
    if (!_state.fieldLL || !_state.fieldLL.length || !_state.analysisData) return;
    const saved = _state.savedFields.length ? _state.savedFields : loadSavedFields();
    if (!saved.length) return;

    const curCenter = _state.fieldCenter
      ? _state.fieldCenter.map(v => v.toFixed(5)).join(',')
      : FH_UTILS.polyCenter(_state.fieldLL).map(v => v.toFixed(5)).join(',');

    let changed = false;
    saved.forEach(f => {
      if (!f.center) return;
      const fCenter = f.center.map(v => v.toFixed(5)).join(',');
      if (fCenter !== curCenter) return;
      const cropDef = FH_CONFIG.CROPS[f.crop || 'generic'] || FH_CONFIG.CROPS.generic;
      const ad = _state.analysisData;
      f.ndvi = ad.meanNdvi;
      f.date = new Date().toISOString();
      f.cropPeak = cropDef.peak;
      f.healthScore = FH_UI && FH_UI.healthScoreOf ? FH_UI.healthScoreOf(ad.meanNdvi, cropDef.peak) : null;
      f.status = FH_UI && FH_UI.fieldStatusOf ? FH_UI.fieldStatusOf(ad.meanNdvi, cropDef.peak) : null;
      f.dataSource = ad.dataSource || null;
      changed = true;
    });

    if (changed) {
      _state.savedFields = saved;
      localStorage.setItem('fh_saved_fields', JSON.stringify(saved));
    }
  }

  function saveCurrentField(name) {
    if (!_state.fieldLL.length) return toast('No field selected to save', 'err');
    const cropType = $('cropSelect')?.value || 'generic';
    const cropDef = FH_CONFIG.CROPS[cropType] || FH_CONFIG.CROPS.generic;
    const ad = _state.analysisData;
    const field = {
      id: Date.now().toString(36),
      name: name || `Field ${_state.savedFields.length + 1}`,
      coords: _state.fieldLL,
      center: _state.fieldCenter,
      crop: cropType,
      cropName: cropDef.name,
      cropPeak: cropDef.peak,
      stage: $('stageSelect')?.value || 'mid',
      date: new Date().toISOString(),
      ndvi: ad?.meanNdvi ?? null,
      healthScore: FH_UI && FH_UI.healthScoreOf ? FH_UI.healthScoreOf(ad?.meanNdvi, cropDef.peak) : null,
      status: FH_UI && FH_UI.fieldStatusOf ? FH_UI.fieldStatusOf(ad?.meanNdvi, cropDef.peak) : null,
      dataSource: ad?.dataSource || null,
      demo: false
    };

    // Save to localStorage (always — fast, immediate)
    _state.savedFields.push(field);
    localStorage.setItem('fh_saved_fields', JSON.stringify(_state.savedFields));
    
    // Also sync to Firestore (if Firebase is available and logged in)
    if (typeof FH_FIREBASE !== 'undefined' && FH_FIREBASE.getCurrentUser()) {
      FH_FIREBASE.saveField(field).catch(err => 
        console.warn('[Fields] Firestore save failed:', err)
      );
    }
    
    toast(`Saved: ${field.name}`);
    return field;
  }

  function loadSavedFields() {
    try {
      const saved = JSON.parse(localStorage.getItem('fh_saved_fields') || '[]');
      _state.savedFields = saved;
      return saved;
    } catch (e) {
      _state.savedFields = [];
      return [];
    }
  }

  /**
   * Merge fields from Firestore into the saved fields list.
   * Called after Firebase auth state change to sync cloud data.
   * Firestore fields take priority over localStorage (newer by updatedAt).
   */
  function mergeFromFirestore(firestoreFields) {
    if (!firestoreFields || !firestoreFields.length) return;
    
    // Build a map of existing fields by id
    const localMap = {};
    _state.savedFields.forEach(f => { localMap[f.id] = f; });
    
    // Merge: Firestore fields override localStorage ones with same id
    firestoreFields.forEach(f => {
      localMap[f.id] = f;
    });
    
    // Convert back to array, sorted by date descending
    _state.savedFields = Object.values(localMap).sort((a, b) => 
      new Date(b.date || 0) - new Date(a.date || 0)
    );
    
    // Persist merged result to localStorage
    localStorage.setItem('fh_saved_fields', JSON.stringify(_state.savedFields));
  }

  function loadFieldFromSaved(fieldOrIdx) {
    let field = fieldOrIdx;
    if (typeof fieldOrIdx === 'number') {
      field = _state.savedFields[fieldOrIdx];
    }
    if (!field || !field.coords) return toast('⚠️ Invalid saved field', 'err');
    setFieldBoundary(field.coords);
    if (field.crop && $('cropSelect')) $('cropSelect').value = field.crop;
    if (field.stage && $('stageSelect')) $('stageSelect').value = field.stage;
    toast(`📌 Loaded: ${field.name}`);
  }

  function deleteSavedField(id) {
    _state.savedFields = _state.savedFields.filter(f => f.id !== id);
    localStorage.setItem('fh_saved_fields', JSON.stringify(_state.savedFields));
    
    // Also delete from Firestore (if logged in)
    if (typeof FH_FIREBASE !== 'undefined' && FH_FIREBASE.getCurrentUser()) {
      FH_FIREBASE.deleteSavedField(id).catch(err =>
        console.warn('[Fields] Firestore delete failed:', err)
      );
    }
    
    FH_UI.renderSavedFields();
  }

  // ═══════════ TABS ═══════════
  function initTabs() {
    document.querySelectorAll('#fieldTabs .tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('#fieldTabs .tab').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('#sidebar .tab-panel').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      $('panel-' + t.dataset.tab).classList.add('active');
      if (t.dataset.tab !== 'click' && _state.drawMode) toggleDraw();
    }));
  }

  // ═══════════ ML ZONE OVERLAY (professional analysis patches) ═══════════
  // A dedicated layer that shows the real per-zone patches of the field
  // (NDVI-classified grid from the GEE zone features) on the map.
  let _zoneLayer = null;

  function getZoneLayer() {
    if (!_state.map) return null;
    if (!_zoneLayer) {
      _zoneLayer = L.layerGroup().addTo(_state.map);
    }
    return _zoneLayer;
  }

  function clearZoneOverlay() {
    if (_zoneLayer) { _zoneLayer.clearLayers(); }
  }

  // ═══════════ DISEASE OUTBREAK LAYER (research s44163) ═══════════
  // Heat circles geotagging disease detections on the map.
  let _outbreakLayer = null;

  function getOutbreakLayer() {
    if (!_state.map) return null;
    if (!_outbreakLayer) {
      _outbreakLayer = L.layerGroup().addTo(_state.map);
    }
    return _outbreakLayer;
  }

  function clearOutbreakLayer() {
    if (_outbreakLayer) { _outbreakLayer.clearLayers(); }
  }

  // ═══════════ MANAGEMENT ZONES LAYER (research Geo-Intelligent) ═══════════
  // Colored per-zone patches for the site-specific management zones.
  let _mgmtLayer = null;

  function getMgmtLayer() {
    if (!_state.map) return null;
    if (!_mgmtLayer) {
      _mgmtLayer = L.layerGroup().addTo(_state.map);
    }
    return _mgmtLayer;
  }

  function clearMgmtOverlay() {
    if (_mgmtLayer) { _mgmtLayer.clearLayers(); }
  }

  // ═══════════ ZONE YIELD LAYER (research agronomy-14-01975) ═══════════
  // Colored per-zone patches showing the predicted yield per management
  // zone (crop-specific coefficients × zone feature vectors).
  let _yieldLayer = null;

  function getYieldLayer() {
    if (!_state.map) return null;
    if (!_yieldLayer) {
      _yieldLayer = L.layerGroup().addTo(_state.map);
    }
    return _yieldLayer;
  }

  function clearYieldOverlay() {
    if (_yieldLayer) { _yieldLayer.clearLayers(); }
  }

  return {
    setStateRef,
    findSavedField,
    initMap,
    locateUser,
    placeUserMarker,
    toggleLayer,
    cycleBasemap,
    setFieldFromCoords,
    toggleDraw,
    finishDraw,
    clearDraw,
    setFieldBoundary,
    hideResults,
    renderMoistureGrid,
    initFileInput,
    initTabs,
    startGpsWalk,
    dropGpsPin,
    finishGpsWalk,
    // Professional Features
    toggleFullscreen,
    enableCompare,
    compareLayer,
    disableCompare,
    updateCompareLabel,
    startTimeAnimation,
    stopTimeAnimation,
    toggleTimeAnimation,
    saveCurrentField,
    loadSavedFields,
    loadFieldFromSaved,
    loadFieldFromSavedById,
    updateSavedFieldHealth,
    deleteSavedField,
    mergeFromFirestore,
    // ML zone overlay
    getZoneLayer,
    clearZoneOverlay,
    getYieldLayer,
    clearYieldOverlay,
    // Disease outbreak layer
    getOutbreakLayer,
    clearOutbreakLayer,
    // Management zones layer
    getMgmtLayer,
    clearMgmtOverlay
  };
})();
