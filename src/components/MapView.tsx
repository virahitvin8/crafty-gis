import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Layers, 
  Plus, 
  Minus, 
  CheckCircle, 
  Cloud, 
  Satellite, 
  Info, 
  Navigation,
  Globe,
  PlusCircle,
  FileCode,
  Upload,
  Play
} from 'lucide-react';
import { Field, SatelliteScene } from '../types';
import { SATELLITE_SCENES } from '../data';

interface MapViewProps {
  fields: Field[];
  activeField: Field;
  onSelectField: (field: Field) => void;
  onAddField: (field: Field) => void;
  indexType: string;
  onIndexTypeChange: (type: string) => void;
  cropType: string;
  onCropTypeChange: (crop: string) => void;
  onStartWalk: () => void;
}

export default function MapView({
  fields,
  activeField,
  onSelectField,
  onAddField,
  indexType,
  onIndexTypeChange,
  cropType,
  onCropTypeChange,
  onStartWalk
}: MapViewProps) {
  const [activeTab, setActiveTab] = useState<'coords' | 'click' | 'kml' | 'walk'>('coords');
  const [latVal, setLatVal] = useState<string>(activeField.coordinates.lat.toFixed(4));
  const [lngVal, setLngVal] = useState<string>(activeField.coordinates.lng.toFixed(4));
  const [areaVal, setAreaVal] = useState<string>(activeField.area.toString());
  
  // For Click-to-draw simulation
  const [drawMode, setDrawMode] = useState<boolean>(false);
  const [drawnPoints, setDrawnPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  // For Walk GPS walk tracking simulation
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [walkTimer, setWalkTimer] = useState<NodeJS.Timeout | null>(null);

  // Sync state with selected field changes
  useEffect(() => {
    setLatVal(activeField.coordinates.lat.toFixed(4));
    setLngVal(activeField.coordinates.lng.toFixed(4));
    setAreaVal(activeField.area.toString());
  }, [activeField]);

  const handleIdentify = () => {
    const lat = parseFloat(latVal) || 40.015;
    const lng = parseFloat(lngVal) || -88.243;
    const area = parseFloat(areaVal) || 12.5;

    // Check if there is an existing field nearby, else create a new one dynamically
    const existing = fields.find(f => 
      Math.abs(f.coordinates.lat - lat) < 0.01 && Math.abs(f.coordinates.lng - lng) < 0.01
    );

    if (existing) {
      onSelectField(existing);
    } else {
      const newField: Field = {
        id: 'new_' + Date.now(),
        name: `Sector Lat: ${lat.toFixed(3)}`,
        crop: cropType,
        cropVariety: `${cropType} Select`,
        area: area,
        elevation: Math.floor(180 + Math.random() * 80),
        ndvi: 0.55 + Math.random() * 0.3,
        status: 'OPTIMAL',
        coordinates: { lat, lng },
        backgroundUrl: activeField.backgroundUrl, // use current for continuity
        soilPh: parseFloat((6.0 + Math.random() * 1.5).toFixed(1)),
        soilNitrogen: Math.floor(60 + Math.random() * 100),
        soilOrganicCarbon: parseFloat((1.0 + Math.random() * 2.0).toFixed(1)),
        yieldProjection: parseFloat((4.0 + Math.random() * 10).toFixed(1)),
        growthStage: 'mid',
        pestRiskScore: Math.floor(Math.random() * 50)
      };
      onAddField(newField);
      onSelectField(newField);
    }
  };

  // Map clicking simulation handler
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawMode) return;
    
    // Calculate simulated lat/lng offset based on click position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const latOffset = (y / rect.height - 0.5) * -0.01;
    const lngOffset = (x / rect.width - 0.5) * 0.01;
    
    const newPt = {
      lat: activeField.coordinates.lat + latOffset,
      lng: activeField.coordinates.lng + lngOffset
    };

    setDrawnPoints([...drawnPoints, newPt]);
  };

  const finishBoundary = () => {
    if (drawnPoints.length < 3) {
      alert("Please mark at least 3 points to create a boundary.");
      return;
    }
    
    // Create new field from drawn boundary
    const latSum = drawnPoints.reduce((sum, p) => sum + p.lat, 0);
    const lngSum = drawnPoints.reduce((sum, p) => sum + p.lng, 0);
    const centerLat = latSum / drawnPoints.length;
    const centerLng = lngSum / drawnPoints.length;
    const estimatedArea = parseFloat((5 + Math.random() * 45).toFixed(1));

    const newField: Field = {
      id: 'drawn_' + Date.now(),
      name: `Drawn Parcel ${fields.length + 1}`,
      crop: cropType,
      cropVariety: `${cropType} Elite`,
      area: estimatedArea,
      elevation: Math.floor(200 + Math.random() * 50),
      ndvi: 0.72,
      status: 'OPTIMAL',
      coordinates: { lat: centerLat, lng: centerLng },
      boundary: drawnPoints,
      backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrptR-q-n-81Ckbz6ME4HNy4X0ooBognsC43hEazLJgLHhtCs98zilvzCTJ6DAxZtOTuO_lQEOl0F7vxGBHc7fFLLqMFQrnNz8EGZBCnCdMhOV1_U7_eUNjWlBPq5NFXxE6tUi0VFnLydCvKHKFrm_SLAWo-KoZ3616PLktu5TTyU-j88VYEL-D1CdjLqTxzNPmczzTz5v3CkGIZ16ScOAYzqa34eGM8sZl8BLv0e9Ce8GMNjFDpLyaa9J3nK2Lu8dmRDmHJihnURo',
      soilPh: 6.5,
      soilNitrogen: 120,
      soilOrganicCarbon: 1.8,
      yieldProjection: 9.2,
      growthStage: 'mid',
      pestRiskScore: 15
    };

    onAddField(newField);
    onSelectField(newField);
    setDrawnPoints([]);
    setDrawMode(false);
  };

  const handleKmlSimulate = () => {
    alert("Simulating KML/GeoJSON parser: Detected 1 polygon from 'farm_boundary.kml'. Zooming to boundary...");
    
    const simPoints = [
      { lat: activeField.coordinates.lat + 0.002, lng: activeField.coordinates.lng - 0.003 },
      { lat: activeField.coordinates.lat + 0.002, lng: activeField.coordinates.lng + 0.003 },
      { lat: activeField.coordinates.lat - 0.002, lng: activeField.coordinates.lng + 0.003 },
      { lat: activeField.coordinates.lat - 0.002, lng: activeField.coordinates.lng - 0.003 },
    ];

    const newField: Field = {
      id: 'kml_' + Date.now(),
      name: "Imported KML Parcel",
      crop: cropType,
      cropVariety: `${cropType} Standard`,
      area: 52.4,
      elevation: activeField.elevation + 12,
      ndvi: 0.68,
      status: 'OPTIMAL',
      coordinates: activeField.coordinates,
      boundary: simPoints,
      backgroundUrl: activeField.backgroundUrl,
      soilPh: 6.4,
      soilNitrogen: 95,
      soilOrganicCarbon: 1.5,
      yieldProjection: 7.1,
      growthStage: 'mid',
      pestRiskScore: 30
    };

    onAddField(newField);
    onSelectField(newField);
  };

  const toggleGpsWalk = () => {
    if (isWalking) {
      if (walkTimer) clearInterval(walkTimer);
      setWalkTimer(null);
      setIsWalking(false);
      onStartWalk(); // Open Deep-Dive View on completion
    } else {
      setIsWalking(true);
      alert("GPS Walk Mode Activated. Telemetry is now tracking your coordinates. Walk along the boundaries of your field and click 'Stop' when finished to compile agricultural profile.");
      
      // Simulate capturing walking points
      let count = 0;
      const interval = setInterval(() => {
        count++;
        console.log(`Captured GPS Point ${count}`);
      }, 3000);
      setWalkTimer(interval);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] relative overflow-hidden">
      
      {/* Sidebar: Left Side Control Panel */}
      <aside className="w-full md:w-80 h-full bg-white border-r border-black/10 flex flex-col overflow-y-auto shrink-0 z-10 pb-16 md:pb-0">
        <div className="p-5 space-y-6">
          
          {/* Section: Select Field Tab list */}
          <section>
            <h2 className="font-mono text-[10px] text-[#2A4B35] mb-2 tracking-widest uppercase font-bold">Select Your Field</h2>
            <div className="grid grid-cols-4 bg-[#F5F5F0] rounded-lg p-1 border border-black/10">
              <button 
                onClick={() => { setActiveTab('coords'); setDrawMode(false); }}
                className={`text-[10px] py-1.5 rounded-md font-mono transition-all cursor-pointer ${
                  activeTab === 'coords' ? 'bg-[#2A4B35] text-white font-bold' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                Coords
              </button>
              <button 
                onClick={() => { setActiveTab('click'); setDrawMode(true); }}
                className={`text-[10px] py-1.5 rounded-md font-mono transition-all cursor-pointer ${
                  activeTab === 'click' ? 'bg-[#2A4B35] text-white font-bold' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                Click
              </button>
              <button 
                onClick={() => { setActiveTab('kml'); setDrawMode(false); }}
                className={`text-[10px] py-1.5 rounded-md font-mono transition-all cursor-pointer ${
                  activeTab === 'kml' ? 'bg-[#2A4B35] text-white font-bold' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                KML
              </button>
              <button 
                onClick={() => { setActiveTab('walk'); setDrawMode(false); }}
                className={`text-[10px] py-1.5 rounded-md font-mono transition-all cursor-pointer ${
                  activeTab === 'walk' ? 'bg-[#2A4B35] text-white font-bold' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                Walk
              </button>
            </div>

            {/* Sub-panels for active tabs */}
            <div className="mt-4 space-y-3">
              {activeTab === 'coords' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-black/60">LAT</span>
                      <input 
                        type="text"
                        value={latVal}
                        onChange={(e) => setLatVal(e.target.value)}
                        className="w-full bg-[#F5F5F0] border border-black/10 rounded-lg py-2 pl-9 pr-2 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none transition-colors"
                        placeholder="Latitude"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-black/60">LNG</span>
                      <input 
                        type="text"
                        value={lngVal}
                        onChange={(e) => setLngVal(e.target.value)}
                        className="w-full bg-[#F5F5F0] border border-black/10 rounded-lg py-2 pl-9 pr-2 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none transition-colors"
                        placeholder="Longitude"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-black/60">HA</span>
                    <input 
                      type="text"
                      value={areaVal}
                      onChange={(e) => setAreaVal(e.target.value)}
                      className="w-full bg-[#F5F5F0] border border-black/10 rounded-lg py-2 pl-8 pr-2 text-xs font-mono text-[#1A1A1A] focus:border-[#2A4B35] outline-none transition-colors"
                      placeholder="Area size"
                    />
                  </div>
                  <button 
                    onClick={handleIdentify}
                    className="w-full py-2 bg-[#2A4B35] text-white font-mono text-xs tracking-wider uppercase font-bold rounded-lg hover:bg-[#3E654C] active:scale-98 transition-all cursor-pointer"
                  >
                    Identify Parcel
                  </button>
                </div>
              )}

              {activeTab === 'click' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-black/60 leading-relaxed">
                    Click along the corners of your field boundary directly on the map.
                  </p>
                  <div className="bg-[#F5F5F0] border border-black/10 rounded-lg p-2 max-h-24 overflow-y-auto font-mono text-[10px] space-y-1">
                    {drawnPoints.length === 0 ? (
                      <span className="text-black/60 italic">No vertices added yet.</span>
                    ) : (
                      drawnPoints.map((pt, idx) => (
                        <div key={idx} className="flex justify-between text-[#1A1A1A]">
                          <span>Pt {idx + 1}: {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={finishBoundary}
                      disabled={drawnPoints.length < 3}
                      className="flex-1 py-2 bg-[#2A4B35] text-white font-mono text-[10px] tracking-wider uppercase font-bold rounded-lg hover:bg-[#3E654C] disabled:opacity-50 transition-colors cursor-pointer text-center"
                    >
                      Finish
                    </button>
                    <button 
                      onClick={() => setDrawnPoints([])}
                      className="py-2 px-3 bg-[#EAEAE2] text-[#1A1A1A] font-mono text-[10px] tracking-wider uppercase rounded-lg hover:bg-[#DCDCD2] transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'kml' && (
                <div className="space-y-3">
                  <div 
                    onClick={handleKmlSimulate}
                    className="border border-dashed border-[#2A4B35]/30 rounded-lg p-5 text-center cursor-pointer hover:bg-[#2A4B35]/5 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#2A4B35] mx-auto mb-2" />
                    <span className="font-mono text-[10px] text-black/80 block">UPLOAD KML or GEOJSON</span>
                    <span className="text-[9px] text-black/50">Supported survey types: .kml, .geojson</span>
                  </div>
                </div>
              )}

              {activeTab === 'walk' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-black/60 leading-relaxed">
                    Walk the boundaries of your field on foot and hit 'Start' to trace with dynamic mobile GPS points.
                  </p>
                  <button 
                    onClick={toggleGpsWalk}
                    className={`w-full py-2 rounded-lg font-mono text-xs tracking-wider uppercase font-bold cursor-pointer transition-all ${
                      isWalking ? 'bg-red-700 text-white animate-pulse' : 'bg-[#2A4B35] text-white'
                    }`}
                  >
                    {isWalking ? "Stop GPS Walk" : "Start GPS Walk"}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Crop Type Selection */}
          <section className="space-y-4">
            <div>
              <label className="font-mono text-[10px] text-black/60 mb-2 block tracking-widest uppercase">Crop Type</label>
              <select 
                value={cropType}
                onChange={(e) => onCropTypeChange(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-black/10 rounded-lg py-2 px-3 text-xs text-[#1A1A1A] focus:border-[#2A4B35] outline-none cursor-pointer"
              >
                <option value="Winter Wheat">Winter Wheat</option>
                <option value="Corn (Maize)">Corn (Maize)</option>
                <option value="Soybeans">Soybeans</option>
                <option value="Canola">Canola</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] text-black/60 mb-2 block tracking-widest uppercase">Analysis Index</label>
              <select 
                value={indexType}
                onChange={(e) => onIndexTypeChange(e.target.value)}
                className="w-full bg-[#F5F5F0] border border-black/10 rounded-lg py-2 px-3 text-xs text-[#1A1A1A] focus:border-[#2A4B35] outline-none cursor-pointer"
              >
                <option value="ndvi">NDVI (Plant Health)</option>
                <option value="evi">EVI (Enhanced Vegetation)</option>
                <option value="ndmi">NDMI (Moisture Stress)</option>
              </select>
            </div>
          </section>

          {/* Satellite Scenes */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-mono text-[10px] text-[#2A4B35] tracking-widest uppercase font-bold">Satellite Scenes</h2>
              <span className="text-[10px] text-black/60 font-mono">12 Available</span>
            </div>

            <div className="space-y-2">
              {SATELLITE_SCENES.map((scene) => (
                <div 
                  key={scene.id}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                    scene.id === 's1' 
                      ? 'bg-[#F5F5F0] border-black/20' 
                      : 'bg-white border-black/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-10 bg-[#EAEAE2] rounded-md flex items-center justify-center overflow-hidden">
                    <img 
                      className="w-full h-full object-cover" 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuByXlMHaxp-WY6qa3ofWLdlpZKToPwukRjh00ADxQaXjMwU3NEGsGXaa69qTEnQnsSb7vC00xa8kEjlYFcu1kqf3FnrVnhwYE13QLhIj0-wpdSIgNSM4DWh_y1EFlxaDrK2roaGX6IQK8fATdsNh62XFsDXfYIDSeVdmJCB9hPz8gM2BIrKH7bAI2dfPzLK2TqHuVw0WerigndNRr8Qx1OSyvLt-txzNifYI7RbCbcdRhyrkjJaKJkKB-MHjM3E1oRfoU7aR9AF6zlp" 
                      alt="Satellite preview"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0 font-mono">
                    <div className="text-[11px] font-bold text-[#1A1A1A]">{scene.date}</div>
                    <div className="text-[9px] text-black/60">Cloud Cover: {scene.cloudCover}%</div>
                  </div>
                  {scene.id === 's1' && <CheckCircle className="text-[#2A4B35] w-4.5 h-4.5" />}
                </div>
              ))}
            </div>

            <button className="w-full mt-2 py-1 text-[10px] font-mono text-black/60 hover:text-black transition-colors border-t border-black/10 pt-3 text-center uppercase tracking-wider">
              View Historical Archive
            </button>
          </section>

          {/* Quick Stats widget */}
          <section className="pt-2">
            <div className="p-4 rounded-xl space-y-2 bg-[#F5F5F0] border border-black/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1A1A]">Field Health</span>
                <span className="text-emerald-700 text-xs font-bold font-mono">+4.2%</span>
              </div>
              <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#2A4B35] transition-all duration-1000" 
                  style={{ width: `${activeField.ndvi * 100}%` }}
                ></div>
              </div>
              <p className="font-mono text-[10px] text-black/60">Average NDVI: {activeField.ndvi.toFixed(2)} (Optimal)</p>
            </div>
          </section>

        </div>
      </aside>

      {/* Main Map Content Panel: Right Area */}
      <section className="flex-1 relative bg-[#F5F5F0] overflow-hidden cursor-crosshair" onClick={handleMapClick}>
        
        {/* Map Background (High resolution top-down satellite background) */}
        <div className="absolute inset-0 z-0">
          <img 
            className="w-full h-full object-cover opacity-80 select-none" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmDKhry4EVF0fRM4mLYYLLkicF7fWDeZYtgwcM-bIfScaWB6PZ63YiusyxrVjIcg2l_oNX4_uS2X9iVLqb7kma2V2MP2AfFZfLPnhdrjDLsbkOFAnimLFTo-mg5fNKbRMtal6cEIw4XMJlF9FlrEJCb8o_shp1fn4dLlHYuwZjDFzNJydKBlfS5xohiYFpIMxL1WPz57BMAaFlpswHlexlW3Y_FqkF2n63mz9T8K3hxRdVdS9DFYBLP44ygirJ0bW6e_uDpVqa1G5z" 
            alt="Satellite map grid view"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Floating geographic grid lines simulation */}
        <div className="absolute inset-0 z-1 pointer-events-none border border-black/5 flex flex-col justify-between p-12">
          <div className="flex justify-between text-black/30 font-mono text-[9px]">
            <span>N 40° 01' 58"</span>
            <span>N 40° 02' 30"</span>
          </div>
          <div className="flex justify-between text-black/30 font-mono text-[9px]">
            <span>W 88° 24' 40"</span>
            <span>W 88° 23' 50"</span>
          </div>
        </div>

        {/* Drawn boundary polygon overlay (visual representation using SVG) */}
        <div className="absolute inset-0 z-1 pointer-events-none flex items-center justify-center">
          <svg className="w-full h-full absolute inset-0 opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Draw active field polygon boundaries */}
            <polygon 
              points="35,35 65,35 65,65 35,65" 
              className="fill-[#2A4B35]/15 stroke-[#2A4B35]" 
              strokeWidth="0.5" 
            />
            
            {/* Dynamic visual indicator pins for click custom boundaries */}
            {drawnPoints.map((_, idx) => (
              <circle key={idx} cx={40 + idx * 5} cy={40 + idx * 5} r="1" className="fill-[#2A4B35] animate-ping" />
            ))}
          </svg>
        </div>

        {/* HUD Overlay panels (Active Parcel information & Zoom/Layers) */}
        <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
          
          {/* Top HUD Row */}
          <div className="flex justify-between items-start w-full">
            
            {/* Parcel Description HUD */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-[#2A4B35] pointer-events-auto bg-white shadow-md">
              <div className="font-mono text-[9px] text-black/60 uppercase tracking-widest mb-1">Active Parcel</div>
              <div className="text-xl font-serif font-bold text-[#1A1A1A] mb-2">{activeField.name}</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 border-t border-black/5 pt-2">
                <div>
                  <span className="font-mono text-[9px] text-black/60 uppercase block">Area</span>
                  <span className="text-sm font-bold text-[#1A1A1A] font-mono">{activeField.area.toFixed(1)} Ha</span>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-black/60 uppercase block">Elevation</span>
                  <span className="text-sm font-bold text-[#1A1A1A] font-mono">{activeField.elevation}m ASL</span>
                </div>
              </div>
            </div>

            {/* Right Map Controls HUD */}
            <div className="flex flex-col gap-2 pointer-events-auto">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 1, 18))}
                className="glass-panel w-10 h-10 rounded-lg flex items-center justify-center bg-white hover:bg-[#F5F5F0] text-[#1A1A1A] transition-all cursor-pointer shadow-sm"
                title="Zoom In"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 1, 10))}
                className="glass-panel w-10 h-10 rounded-lg flex items-center justify-center bg-white hover:bg-[#F5F5F0] text-[#1A1A1A] transition-all cursor-pointer shadow-sm"
                title="Zoom Out"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="h-px bg-black/10 my-1"></div>
              <button 
                onClick={() => alert("Toggled base satellite imagery filters")}
                className="glass-panel w-10 h-10 rounded-lg flex items-center justify-center bg-white hover:bg-[#F5F5F0] text-[#1A1A1A] transition-all cursor-pointer shadow-sm"
                title="Layers"
              >
                <Layers className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom HUD: Start Walk + NDVI Health Spectrum Color Scale */}
          <div className="flex flex-col gap-4 w-full items-center">
            
            {/* Start GPS walk tracking floating action trigger */}
            <div className="flex justify-end w-full pointer-events-auto">
              <button 
                onClick={toggleGpsWalk}
                className={`flex items-center gap-3 px-6 py-3.5 rounded-full font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                  isWalking 
                    ? 'bg-red-700 text-white shadow-red-700/10' 
                    : 'bg-[#2A4B35] text-white shadow-black/10'
                }`}
              >
                <Navigation className={`w-5 h-5 ${isWalking ? 'animate-spin' : ''}`} />
                <span className="font-mono text-xs uppercase tracking-wider">
                  {isWalking ? "Recording Walk..." : "Start GPS Walk"}
                </span>
              </button>
            </div>

            {/* Dynamic sliding NDVI index health spectrum legend overlay */}
            <div className="glass-panel p-4 rounded-2xl w-full max-w-xl pointer-events-auto bg-white border border-black/10 shadow-md">
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-mono text-[10px] text-black/60 tracking-wider uppercase font-bold">
                  {indexType.toUpperCase()} Health Spectrum
                </span>
                <div className="flex items-center gap-3 font-mono text-[9px] text-black/60">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d9534f]"></span> Critical
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5cb85c]"></span> Optimal
                  </span>
                </div>
              </div>

              {/* NDVI Color Scale Gradient Bar */}
              <div className="relative h-6 rounded-full ndvi-gradient overflow-hidden border border-black/20 select-none">
                <div className="absolute inset-0 flex justify-between px-4 items-center text-[9px] font-mono text-white/90 font-bold">
                  <span>0.0</span>
                  <span>0.2</span>
                  <span>0.4</span>
                  <span>0.6</span>
                  <span>0.8</span>
                  <span>1.0</span>
                </div>

                {/* Sliding indicator pin for the active parcel's NDVI value */}
                <div 
                  className="absolute top-0 h-full w-1 bg-white shadow-xl transition-all duration-1000" 
                  style={{ left: `${activeField.ndvi * 100}%` }}
                >
                  <div className="absolute -top-1 -translate-y-full left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border border-black/10 shadow-sm">
                    {activeField.ndvi.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Map Gradient Vignette Overlay */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#F5F5F0]/80 to-transparent pointer-events-none z-1"></div>

      </section>

    </div>
  );
}
