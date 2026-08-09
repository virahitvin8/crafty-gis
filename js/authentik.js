/* ═══════════════════════════════════════════════════════════
   FarmHealth — Authentik OIDC Authentication (PRIMARY)
   Self-hosted OpenID Connect provider
   ═══════════════════════════════════════════════════════════ */

const FH_AUTH = (function() {
  'use strict';

  // ─── Authentik Configuration (read dynamically so it can be set later) ───
  function getIssuer() {
    return (localStorage.getItem('fh_authentik_issuer') || '').replace(/\/+$/, '');
  }
  function getClientId() {
    return localStorage.getItem('fh_authentik_client_id') || 'farmhealth';
  }
  const REDIRECT_URI = () => window.location.origin + '/callback';
  
  // ─── State ───
  let _user = null;
  let _token = null;
  
  // ─── Check if authentik is configured ───
  function isConfigured() {
    return !!getIssuer();
  }
  
  // ─── Login with authentik ───
  function login() {
    if (!isConfigured()) {
      console.warn('[Auth] authentik not configured, falling back to Firebase');
      return false;
    }
    const issuer = getIssuer();
    const authUrl = `${issuer}/application/o/authorize/` +
      `?client_id=${encodeURIComponent(getClientId())}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI())}` +
      `&response_type=code` +
      `&scope=openid profile email`;
    
    window.location.href = authUrl;
    return true;
  }
  
  // ─── Handle OAuth2 callback ───
  async function handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (!code) return null;
    const issuer = getIssuer();
    if (!issuer) return null;
    
    try {
      // Exchange authorization code for tokens
      const tokenResponse = await fetch(`${issuer}/application/o/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI(),
          client_id: getClientId()
        })
      });
      
      if (!tokenResponse.ok) throw new Error('Token exchange failed');
      
      const tokenData = await tokenResponse.json();
      _token = tokenData.access_token;
      
      // Fetch user info
      const userResponse = await fetch(`${issuer}/application/o/userinfo/`, {
        headers: { 'Authorization': `Bearer ${_token}` }
      });
      
      if (!userResponse.ok) throw new Error('Failed to fetch user info');
      
      _user = await userResponse.json();
      
      // Store in localStorage
      localStorage.setItem('fh_authentik_user', JSON.stringify(_user));
      localStorage.setItem('fh_authentik_token', _token);
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return _user;
      
    } catch (error) {
      console.error('[Auth] Callback error:', error);
      return null;
    }
  }
  
  // ─── Get current user ───
  function getUser() {
    if (!_user) {
      const stored = localStorage.getItem('fh_authentik_user');
      if (stored) {
        try {
          _user = JSON.parse(stored);
        } catch (e) {
          console.error('[Auth] Failed to parse stored user:', e);
        }
      }
    }
    return _user;
  }
  
  // ─── Logout ───
  function logout() {
    _user = null;
    _token = null;
    localStorage.removeItem('fh_authentik_user');
    localStorage.removeItem('fh_authentik_token');
    
    // Redirect to authentik logout
    if (isConfigured()) {
      window.location.href = `${getIssuer()}/application/o/logout/`;
    }
  }
  
  // ─── Configure authentik (for settings) ───
  function configure(issuer, clientId) {
    localStorage.setItem('fh_authentik_issuer', issuer);
    localStorage.setItem('fh_authentik_client_id', clientId);
  }
  
  // ─── Exports ───
  return {
    isConfigured,
    login,
    handleCallback,
    getUser,
    logout,
    configure,
    isAuthentik: () => true // Marker function
  };
})();
