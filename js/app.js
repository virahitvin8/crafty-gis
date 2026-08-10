/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Main Application Module
   ═══════════════════════════════════════════════════════════
   Orchestrates all modules and exposes the public FH API.
   ═══════════════════════════════════════════════════════════ */

const FH = (function() {
  'use strict';

  // ─── Initialize shared state ───
  const state = FH_CONFIG.createDefaultState();

  // ─── Inject state reference into all modules that support it ───
  if (FH_MAP.setStateRef) FH_MAP.setStateRef(state);
  if (FH_API.setStateRef) FH_API.setStateRef(state);
  if (FH_UI.setStateRef) FH_UI.setStateRef(state);
  if (FH_ANALYSIS.setStateRef) FH_ANALYSIS.setStateRef(state);
  if (FH_INTEL.setStateRef) FH_INTEL.setStateRef(state);

  // ═══════════ INITIALIZATION ═══════════
  function init() {
    // PRIMARY: Initialize authentik (self-hosted OIDC)
    // Falls back to Firebase if authentik not configured
    try {
      if (typeof FH_AUTH !== 'undefined' && FH_AUTH.isConfigured && FH_AUTH.isConfigured()) {
        // Handle OAuth2 callback if present
        if (window.location.search.includes('code=')) {
          FH_AUTH.handleCallback().then(user => {
            if (user) {
              console.log('[FH] Authentik login successful:', user.email);
              FH_UI.updateLoginUI(user);
            }
          });
        } else {
          console.log('[FH] Authentik configured (primary auth)');
        }
        
        // Show authentik button in login modal
        const authBtn = document.getElementById('authentikLoginBtn');
        const primaryLabel = document.getElementById('authPrimaryLabel');
        const secondaryLabel = document.getElementById('authSecondaryLabel');
        
        if (authBtn) {
          authBtn.style.display = 'flex';
          authBtn.style.alignItems = 'center';
          authBtn.style.justifyContent = 'center';
        }
        if (primaryLabel) primaryLabel.style.display = 'inline';
        if (secondaryLabel) secondaryLabel.textContent = 'Google Sign-In (secondary)';
        
      } else if (typeof FH_FIREBASE !== 'undefined' && FH_FIREBASE.init) {
        // SECONDARY: Initialize Firebase (legacy fallback)
        FH_FIREBASE.init();
        console.log('[FH] Firebase initialized (secondary auth)');
      }
    } catch (e) {
      console.warn('[FH] Auth init skipped:', e.message);
    }

    FH_MAP.initMap();
    FH_MAP.initTabs();
    FH_MAP.initFileInput();
    FH_UI.loadSettings();
    FH_UI.checkLoginState();

    // Auto-place the blue "You are here" marker when GPS is available
    setTimeout(() => {
      try {
        FH_MAP.locateUser(false);
      } catch (e) { console.warn('[FH] Auto-locate skipped:', e.message); }
    }, 1200);

    // Modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) m.classList.remove('show');
      });
    });

    // Load saved fields from localStorage (and Firestore if logged in)
    FH_UI.renderSavedFields();
    
    // Auto-show onboarding on first visit
    if (!localStorage.getItem('fh_onboarding_done')) {
      setTimeout(() => {
        FH_UI.startOnboarding();
      }, 800);
    }
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ═══════════ PUBLIC API ═══════════
  // All functions exposed for HTML onclick handlers and external access
  return {
    // Auth (PRIMARY: authentik, SECONDARY: Firebase/Google)
    loginWithAuthentik: function() {
      if (typeof FH_AUTH !== 'undefined' && FH_AUTH.login) {
        FH_AUTH.login();
      }
    },
    handleLogin: FH_UI.handleLogin,
    handleGoogleLogin: FH_UI.handleGoogleLogin,
    selectGoogleAccount: FH_UI.selectGoogleAccount,
    // Map
    setFieldFromCoords: FH_MAP.setFieldFromCoords,
    toggleDraw: FH_MAP.toggleDraw,
    finishDraw: FH_MAP.finishDraw,
    clearDraw: FH_MAP.clearDraw,
    toggleLayer: FH_MAP.toggleLayer,
    cycleBasemap: FH_MAP.cycleBasemap,
    startGpsWalk: FH_MAP.startGpsWalk,
    dropGpsPin: FH_MAP.dropGpsPin,
    finishGpsWalk: FH_MAP.finishGpsWalk,
    locateUser: FH_MAP.locateUser,
    showMyLocation: FH_MAP.locateUser,

    // Analysis
    runFullAnalysis: FH_ANALYSIS.runFullAnalysis,
    switchLayer: FH_ANALYSIS.switchLayer,
    getAIAdvice: FH_API.getAIAdvice,
    analyzeCropPhoto: FH_API.analyzeCropPhoto,

    // GIS Utilities (Senior GIS Analyst grade)
    validateField: FH_GIS.validateCoordinates,
    calculateFieldArea: FH_GIS.polygonArea,
    calculateFieldPerimeter: FH_GIS.polygonPerimeter,
    getFieldCentroid: FH_GIS.polygonCentroid,
    formatCoordinates: FH_GIS.formatCoord,
    detectUTMZone: FH_GIS.detectUTMZone,
    haversineDistance: FH_GIS.haversineDistance,

    // Professional Analysis (GEE continuous + clipped terrain + ML)
    runProfessionalAnalysis: FH_ANALYSIS.runProfessionalAnalysis,
    exportProZoneCSV: FH_ANALYSIS.exportProZoneCSV,
    exportProReportCSV: FH_ANALYSIS.exportProReportCSV,
    retrainProModel: FH_ANALYSIS.retrainProModel,

    // G5/G8: Ground-truth labels + PDF reports
    submitGroundTruth: FH_ANALYSIS.submitGroundTruth,
    refreshGroundTruthCount: FH_ANALYSIS.refreshGroundTruthCount,
    exportPDFReport: FH_ANALYSIS.exportPDFReport,

    // Research Intelligence (FH_INTEL — from the 12 PDFs)
    renderResearchKB: FH_INTEL.renderResearchKB,
    toggleResearchCard: FH_INTEL.toggleResearchCard,
    recordDiseaseOutbreak: FH_INTEL.recordDiseaseOutbreak,
    renderOutbreakLayer: FH_INTEL.renderOutbreakLayer,
    renderDiseaseTimeline: FH_INTEL.renderDiseaseTimeline,
    computeSpreadRisk: FH_INTEL.computeSpreadRisk,
    clearOutbreaks: FH_INTEL.clearOutbreaks,
    addDetectionFromVision: FH_INTEL.addDetectionFromVision,
    saveSensorReading: FH_INTEL.saveSensorReading,
    renderSensorFusion: FH_INTEL.renderSensorFusion,
    computeDiseaseEWS: FH_INTEL.computeDiseaseEWS,
    runManagementZones: FH_INTEL.runManagementZones,
    renderManagementZones: FH_INTEL.renderManagementZones,
    exportMgmtZonesCSV: FH_INTEL.exportMgmtZonesCSV,
    // Zone yield forecast (agronomy-14-01975)
    runZoneYieldPrediction: FH_INTEL.runZoneYieldPrediction,
    renderZoneYield: FH_INTEL.renderZoneYield,
    exportZoneYieldCSV: FH_INTEL.exportZoneYieldCSV,
    // Yield history timeline
    renderYieldHistory: FH_INTEL.renderYieldHistory,
    exportYieldHistoryCSV: FH_INTEL.exportYieldHistoryCSV,
    // Server Random Forest yield (POST /api/ml/yield)
    runServerYieldPrediction: FH_INTEL.runServerYieldPrediction,
    renderServerYield: FH_INTEL.renderServerYield,
    // GEDI biomass / carbon stock (remotesensing-13-02486)
    runBiomassEstimate: FH_INTEL.runBiomassEstimate,
    renderBiomass: FH_INTEL.renderBiomass,
    exportBiomassCSV: FH_INTEL.exportBiomassCSV,
    // Irrigation scheduler (FAO-56 water balance)
    computeIrrigationSchedule: FH_INTEL.computeIrrigationSchedule,
    renderIrrigation: FH_INTEL.renderIrrigation,
    exportIrrigationCSV: FH_INTEL.exportIrrigationCSV,
    // Crop health surveillance (pone.0324347 / 09119071)
    renderSurveillance: FH_INTEL.renderSurveillance,
    refreshSurveillance: FH_INTEL.refreshSurveillance,
    exportSurveillanceCSV: FH_INTEL.exportSurveillanceCSV,

    // UI
    setMode: FH_UI.setMode,
    toggleCard: FH_UI.toggleCard,
    selectScene: FH_UI.selectScene,
    openModal: FH_UI.openModal,
    closeModal: FH_UI.closeModal,
    saveLandInfo: FH_UI.saveLandInfo,
    loadLandInfo: FH_UI.loadLandInfo,
    openLandPortal: FH_UI.openLandPortal,
    autoScanLocation: FH_UI.autoScanLocation,
    importLandRecordsCSV: FH_UI.importLandRecordsCSV,
    updateLegend: FH_UI.updateLegend,
    renderMoistureGrid: FH_MAP.renderMoistureGrid,
    // Infrastructure & Journal
    saveInfrastructure: FH_UI.saveInfrastructure,
    loadInfrastructure: FH_UI.loadInfrastructure,
    loadOSMInfrastructure: FH_UI.loadOSMInfrastructure,
    clearOSMInfrastructure: FH_UI.clearOSMInfrastructure,
    saveJournalEntry: FH_UI.saveJournalEntry,
    loadJournalEntries: FH_UI.loadJournalEntries,
    renderJournalEntries: FH_UI.renderJournalEntries,
    deleteJournalEntry: FH_UI.deleteJournalEntry,
    exportJournal: FH_UI.exportJournal,
    showAISourceIndicator: FH_UI.showAISourceIndicator,
    hideAISourceIndicator: FH_UI.hideAISourceIndicator,

    // Alerts, Yield, Pest
    renderAlerts: FH_UI.renderAlerts,
    renderYieldProjection: FH_UI.renderYieldProjection,
    renderPestRiskCards: FH_UI.renderPestRiskCards,

    // Guided Onboarding
    startOnboarding: FH_UI.startOnboarding,
    nextOnboardingStep: FH_UI.nextOnboardingStep,
    prevOnboardingStep: FH_UI.prevOnboardingStep,
    skipOnboarding: FH_UI.skipOnboarding,
    finishOnboarding: FH_UI.finishOnboarding,

    // Education
    openLearning: FH_UI.openLearning,
    openQuiz: FH_UI.openQuiz,
    goToLesson: FH_UI.goToLesson,
    nextLesson: FH_UI.nextLesson,
    prevLesson: FH_UI.prevLesson,
    selectQuizOpt: FH_UI.selectQuizOpt,
    submitQuiz: FH_UI.submitQuiz,

    // Change detection
    showChangeDetection: FH_UI.showChangeDetection,
    runChangeDetection: FH_UI.runChangeDetection,

    // Exports
    copyReport: FH_ANALYSIS.copyReport,
    exportCSV: FH_ANALYSIS.exportCSV,
    exportGeoJSON: FH_ANALYSIS.exportGeoJSON,
    showFullReport: FH_ANALYSIS.showFullReport,

    // Settings
    saveSettings: FH_UI.saveSettings,
    
    // Firebase Auth
    signOut: FH_FIREBASE ? FH_FIREBASE.signOut : null,
    getCurrentUser: FH_FIREBASE ? FH_FIREBASE.getCurrentUser : null,
    isAdmin: FH_FIREBASE ? FH_FIREBASE.isAdmin : null,
    
    // Professional Features
    toggleFullscreen: FH_MAP.toggleFullscreen,
    enableCompare: FH_MAP.enableCompare,
    compareLayer: FH_MAP.compareLayer,
    disableCompare: FH_MAP.disableCompare,
    startTimeAnimation: FH_MAP.startTimeAnimation,
    stopTimeAnimation: FH_MAP.stopTimeAnimation,
    toggleTimeAnimation: FH_MAP.toggleTimeAnimation,
    saveCurrentField: FH_MAP.saveCurrentField,
    loadFieldFromSaved: FH_MAP.loadFieldFromSaved,
    loadFieldFromSavedById: FH_MAP.loadFieldFromSavedById,
    findSavedField: FH_MAP.findSavedField,
    deleteSavedField: FH_MAP.deleteSavedField,
    renderSavedFields: FH_UI.renderSavedFields,
    renderDataDashboard: FH_UI.renderDataDashboard,

    // Farm Dashboard
    showView: FH_UI.showView,
    renderDashboard: FH_UI.renderDashboard,
    loadDemoFields: FH_UI.loadDemoFields,
    openFieldFromDashboard: FH_UI.openFieldFromDashboard,
    deleteFieldFromDashboard: FH_UI.deleteFieldFromDashboard,
    exportFieldGeoJSON: FH_UI.exportFieldGeoJSON
  };
})();
