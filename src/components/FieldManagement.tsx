import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  History, 
  Download, 
  PlusCircle, 
  MapPin,
  CheckCircle,
  AlertTriangle,
  FileDown,
  Info,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Field } from '../types';

interface FieldManagementProps {
  fields: Field[];
  activeField: Field;
  onSelectField: (field: Field) => void;
  onAddField: (field: Field) => void;
  onDeleteField: (id: string) => void;
}

export default function FieldManagement({
  fields,
  activeField,
  onSelectField,
  onAddField,
  onDeleteField
}: FieldManagementProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPTIMAL' | 'STRESSED' | 'CRITICAL'>('ALL');
  
  // Simulated state for specific card analysis loads
  const [analyzingFieldId, setAnalyzingFieldId] = useState<string | null>(null);
  const [completedFieldId, setCompletedFieldId] = useState<string | null>(null);

  // Form state for adding a field
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newCrop, setNewCrop] = useState<string>('Winter Wheat');
  const [newArea, setNewArea] = useState<string>('15');
  const [newElevation, setNewElevation] = useState<string>('210');

  // Compute stats
  const totalArea = fields.reduce((sum, f) => sum + f.area, 0);
  const avgNdvi = fields.reduce((sum, f) => sum + f.ndvi, 0) / (fields.length || 1);

  // Filter list
  const filteredFields = fields.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          f.crop.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const runAnalyse = (id: string) => {
    setAnalyzingFieldId(id);
    setTimeout(() => {
      setAnalyzingFieldId(null);
      setCompletedFieldId(id);
      setTimeout(() => {
        setCompletedFieldId(null);
      }, 2000);
    }, 1500);
  };

  const handleAddNewField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const lat = 40.0 + (Math.random() - 0.5) * 0.1;
    const lng = -88.2 + (Math.random() - 0.5) * 0.1;

    const newField: Field = {
      id: 'field_' + Date.now(),
      name: newName,
      crop: newCrop,
      cropVariety: `${newCrop} Select`,
      area: parseFloat(newArea) || 10,
      elevation: parseInt(newElevation) || 200,
      ndvi: parseFloat((0.4 + Math.random() * 0.5).toFixed(2)),
      status: Math.random() > 0.4 ? 'OPTIMAL' : 'STRESSED',
      coordinates: { lat, lng },
      backgroundUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrptR-q-n-81Ckbz6ME4HNy4X0ooBognsC43hEazLJgLHhtCs98zilvzCTJ6DAxZtOTuO_lQEOl0F7vxGBHc7fFLLqMFQrnNz8EGZBCnCdMhOV1_U7_eUNjWlBPq5NFXxE6tUi0VFnLydCvKHKFrm_SLAWo-KoZ3616PLktu5TTyU-j88VYEL-D1CdjLqTxzNPmczzTz5v3CkGIZ16ScOAYzqa34eGM8sZl8BLv0e9Ce8GMNjFDpLyaa9J3nK2Lu8dmRDmHJihnURo',
      soilPh: 6.5,
      soilNitrogen: 120,
      soilOrganicCarbon: 1.8,
      yieldProjection: 8.5,
      growthStage: 'mid',
      pestRiskScore: 20
    };

    onAddField(newField);
    setNewName('');
    setShowAddForm(false);
  };

  const downloadGeoJSON = (field: Field) => {
    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: field.name,
            crop: field.crop,
            area_ha: field.area,
            elevation_m: field.elevation,
            ndvi_score: field.ndvi,
            status: field.status
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              field.boundary 
                ? [...field.boundary.map(p => [p.lng, p.lat]), [field.boundary[0].lng, field.boundary[0].lat]]
                : [
                    [field.coordinates.lng - 0.002, field.coordinates.lat + 0.002],
                    [field.coordinates.lng + 0.002, field.coordinates.lat + 0.002],
                    [field.coordinates.lng + 0.002, field.coordinates.lat - 0.002],
                    [field.coordinates.lng - 0.002, field.coordinates.lat - 0.002],
                    [field.coordinates.lng - 0.002, field.coordinates.lat + 0.002]
                  ]
            ]
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${field.name.toLowerCase().replace(/\s+/g, '_')}_boundary.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllGeoJSON = () => {
    alert("Compiling GeoJSON coordinate records for all fields...");
    const geojson = {
      type: "FeatureCollection",
      features: fields.map(field => ({
        type: "Feature",
        properties: {
          name: field.name,
          crop: field.crop,
          area_ha: field.area,
          ndvi: field.ndvi
        },
        geometry: {
          type: "Point",
          coordinates: [field.coordinates.lng, field.coordinates.lat]
        }
      }))
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farmhealth_all_fields.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="md:ml-80 pt-20 px-6 pb-12 min-h-screen bg-[#F5F5F0] text-[#1A1A1A]">
      
      {/* Header section with summary KPI blocks */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-black/10 pb-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-serif font-bold text-[#1A1A1A]">Field Management</h2>
          
          <div className="flex items-center gap-4 text-black/60 pt-1">
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-60 font-bold">Total Area</span>
              <span className="text-xl font-bold text-[#2A4B35] font-mono">
                {totalArea.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-black/60">ha</span>
              </span>
            </div>
            
            <div className="h-8 w-px bg-black/10"></div>
            
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-60 font-bold">Avg. Health</span>
              <span className="text-xl font-bold text-emerald-800 font-mono">
                {avgNdvi.toFixed(2)} <span className="text-xs font-normal text-black/60">NDVI</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={downloadAllGeoJSON}
            className="px-4 py-2 border border-[#2A4B35] text-[#2A4B35] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl flex items-center gap-2 hover:bg-[#2A4B35]/5 transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>Export All GeoJSON</span>
          </button>
          
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-[#2A4B35] text-white font-mono text-xs uppercase tracking-wider font-bold rounded-xl flex items-center gap-2 hover:bg-[#3E654C] transition-all cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add New Field</span>
          </button>
        </div>
      </header>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
        <div className="relative flex-1 w-full group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-black/50 group-focus-within:text-[#2A4B35] transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-black focus:border-[#2A4B35] outline-none transition-colors"
            placeholder="Search saved fields..."
          />
        </div>

        {/* Filter badging row */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'OPTIMAL', 'STRESSED', 'CRITICAL'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`py-1.5 px-3 text-[10px] font-mono rounded-lg border transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-[#2A4B35] text-white border-transparent font-bold'
                  : 'bg-white text-black/60 border-black/10 hover:border-black/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List of Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFields.map((field) => {
          const isAnalyzing = analyzingFieldId === field.id;
          const isCompleted = completedFieldId === field.id;
          
          return (
            <div 
              key={field.id}
              className={`glass-panel rounded-2xl overflow-hidden flex flex-col group border transition-all duration-300 ${
                activeField.id === field.id 
                  ? 'border-[#2A4B35] bg-white ring-1 ring-[#2A4B35]/20 shadow-md' 
                  : 'border-black/10 bg-white hover:shadow-md'
              }`}
            >
              
              {/* Field Satellite View Top Preview */}
              <div 
                className="h-40 relative overflow-hidden bg-black/5 cursor-pointer"
                onClick={() => onSelectField(field)}
              >
                <div 
                  className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-700" 
                  style={{ backgroundImage: `url(${field.backgroundUrl})` }}
                ></div>
                
                {/* Status Badging */}
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded border border-black/10 select-none shadow-sm">
                  <span className={`font-mono text-[9px] uppercase tracking-wider font-bold ${
                    field.status === 'OPTIMAL' ? 'text-emerald-700' : field.status === 'STRESSED' ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {field.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2.5">
                  <h3 
                    className="text-base font-serif font-bold text-[#1A1A1A] truncate cursor-pointer hover:text-[#2A4B35] transition-colors"
                    onClick={() => onSelectField(field)}
                  >
                    {field.name}
                  </h3>
                  
                  <button 
                    onClick={() => onDeleteField(field.id)}
                    className="text-black/40 hover:text-rose-600 transition-colors p-1 hover:bg-black/5 rounded-lg cursor-pointer"
                    title="Delete Field"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-black/60 text-xs font-mono mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-black/40" />
                    <span>{field.area.toFixed(1)} ha</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-black/40" />
                    <span className={`font-bold ${
                      field.status === 'OPTIMAL' ? 'text-emerald-700' : field.status === 'STRESSED' ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {field.ndvi.toFixed(2)} NDVI
                    </span>
                  </div>
                </div>

                {/* mini legend bar slider representation */}
                <div className="mb-6 space-y-1">
                  <div className="h-1.5 w-full ndvi-gradient rounded-full relative border border-black/10">
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-[#2A4B35] rounded-full shadow" 
                      style={{ left: `${field.ndvi * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-black/50 font-mono font-semibold">
                    <span>0.0</span>
                    <span>CURRENT: {field.ndvi.toFixed(2)}</span>
                    <span>1.0</span>
                  </div>
                </div>

                {/* Card footer action buttons */}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => runAnalyse(field.id)}
                    disabled={isAnalyzing}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#F5F5F0] hover:bg-black/5 text-[#2A4B35] border border-black/10 rounded-lg transition-all text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#2A4B35]" />
                        <span>Queuing...</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-bold">
                        <CheckCircle className="w-3 h-3" />
                        <span>COMPLETE</span>
                      </span>
                    ) : (
                      <>
                        <History className="w-3.5 h-3.5" />
                        <span>RUN ANALYSE</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => downloadGeoJSON(field)}
                    className="flex items-center justify-center gap-1.5 py-2 bg-[#F5F5F0] hover:bg-black/5 text-black/70 border border-black/10 rounded-lg transition-all text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer"
                    title="Export boundaries"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>GEOJSON</span>
                  </button>
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* Add New Field Modal Overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-black/10 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-[#1A1A1A] font-serif">Add New Crop Field</h3>
            
            <form onSubmit={handleAddNewField} className="space-y-4 text-left">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block font-bold">Field Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. South Pasture D"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-black/15 rounded-lg py-2 px-3 text-xs text-black focus:border-[#2A4B35] outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block font-bold">Crop Type</label>
                <select 
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value)}
                  className="w-full bg-[#F5F5F0] border border-black/15 rounded-lg py-2 px-3 text-xs text-black focus:border-[#2A4B35] outline-none"
                >
                  <option value="Winter Wheat">Winter Wheat</option>
                  <option value="Corn (Maize)">Corn (Maize)</option>
                  <option value="Soybeans">Soybeans</option>
                  <option value="Canola">Canola</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block font-bold">Area (ha)</label>
                  <input 
                    type="number"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-black/15 rounded-lg py-2 px-3 text-xs text-black focus:border-[#2A4B35] outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[9px] uppercase tracking-widest text-black/60 mb-1.5 block font-bold">Elev (m ASL)</label>
                  <input 
                    type="number"
                    value={newElevation}
                    onChange={(e) => setNewElevation(e.target.value)}
                    className="w-full bg-[#F5F5F0] border border-black/15 rounded-lg py-2 px-3 text-xs text-black focus:border-[#2A4B35] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-[#2A4B35] text-white font-mono text-xs uppercase font-bold tracking-wider rounded-lg hover:bg-[#3E654C] cursor-pointer shadow-sm"
                >
                  Save Field
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="py-2 px-4 bg-[#F5F5F0] text-black/70 font-mono text-xs uppercase rounded-lg hover:bg-black/5 border border-black/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}
