/* ═══════════════════════════════════════════════════════════
   FarmHealth — Main Application Module
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

  // ═══════════ INITIALIZATION ═══════════
  function init() {
    // Initialize Firebase (Google Sign-In + Firestore database)
    try {
      if (typeof FH_FIREBASE !== 'undefined' && FH_FIREBASE.init) {
        FH_FIREBASE.init();
        console.log('[FH] Firebase initialized');
      }
    } catch (e) {
      console.warn('[FH] Firebase init skipped:', e.message);
    }

    FH_MAP.initMap();
    FH_MAP.initTabs();
    FH_MAP.initFileInput();
    FH_UI.loadSettings();
    FH_UI.checkLoginState();

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

    // Analysis
    runFullAnalysis: FH_ANALYSIS.runFullAnalysis,
    switchLayer: FH_ANALYSIS.switchLayer,
    getAIAdvice: FH_API.getAIAdvice,

    // UI
    setMode: FH_UI.setMode,
    toggleCard: FH_UI.toggleCard,
    selectScene: FH_UI.selectScene,
    openModal: FH_UI.openModal,
    closeModal: FH_UI.closeModal,
    saveLandInfo: FH_UI.saveLandInfo,
    updateLegend: FH_UI.updateLegend,
    renderMoistureGrid: FH_MAP.renderMoistureGrid,

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
    disableCompare: FH_MAP.disableCompare,
    startTimeAnimation: FH_MAP.startTimeAnimation,
    stopTimeAnimation: FH_MAP.stopTimeAnimation,
    toggleTimeAnimation: FH_MAP.toggleTimeAnimation,
    saveCurrentField: FH_MAP.saveCurrentField,
    loadFieldFromSaved: FH_MAP.loadFieldFromSaved,
    deleteSavedField: FH_MAP.deleteSavedField,
    renderSavedFields: FH_UI.renderSavedFields,
    renderDataDashboard: FH_UI.renderDataDashboard
  };
})();
