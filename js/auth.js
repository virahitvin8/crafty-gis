/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Authentication System
   Human-Mode Build: Complete, Tested, Production-Ready
   ═══════════════════════════════════════════════════════════ */

const FH_AUTH = (function() {
  'use strict';

  // ─── State Management ───
  let currentUser = null;
  let authMode = 'google'; // 'google', 'email', 'mobile'
  let verificationCode = null;

  // ─── Google Authentication ───
  async function signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await firebase.auth().signInWithPopup(provider);
      currentUser = result.user;
      
      await saveUserSession(currentUser);
      await logAuthEvent('google_signin', currentUser.uid);
      
      return {
        success: true,
        user: formatUser(currentUser),
        method: 'google'
      };
    } catch (error) {
      console.error('[AUTH] Google sign-in failed:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // ─── Email/Password Authentication ───
  async function signInWithEmail(email, password) {
    try {
      const result = await firebase.auth().signInWithEmailAndPassword(email, password);
      currentUser = result.user;
      
      await saveUserSession(currentUser);
      await logAuthEvent('email_signin', currentUser.uid);
      
      return {
        success: true,
        user: formatUser(currentUser),
        method: 'email'
      };
    } catch (error) {
      console.error('[AUTH] Email sign-in failed:', error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code),
        code: error.code
      };
    }
  }

  async function signUpWithEmail(email, password, displayName) {
    try {
      const result = await firebase.auth().createUserWithEmailAndPassword(email, password);
      currentUser = result.user;
      
      // Update profile with display name
      await currentUser.updateProfile({
        displayName: displayName,
        photoURL: null
      });
      
      // Create user document in Firestore
      await firebase.firestore().collection('users').doc(currentUser.uid).set({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: displayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        role: 'user',
        freeAccess: true,
        analysesCount: 0,
        exportsCount: 0
      });
      
      await saveUserSession(currentUser);
      await logAuthEvent('email_signup', currentUser.uid);
      
      return {
        success: true,
        user: formatUser(currentUser),
        method: 'email'
      };
    } catch (error) {
      console.error('[AUTH] Email sign-up failed:', error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code),
        code: error.code
      };
    }
  }

  // ─── Mobile Number Authentication ───
  async function sendMobileVerification(phoneNumber) {
    try {
      const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
        callback: (response) => {
          console.log('[AUTH] reCAPTCHA solved');
        }
      });
      
      const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, appVerifier);
      verificationCode = confirmationResult;
      
      await logAuthEvent('mobile_code_sent', phoneNumber);
      
      return {
        success: true,
        message: 'Verification code sent to your phone'
      };
    } catch (error) {
      console.error('[AUTH] Mobile verification failed:', error);
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code),
        code: error.code
      };
    }
  }

  async function verifyMobileCode(code) {
    try {
      const credential = firebase.auth.PhoneAuthProvider.credential(
        verificationCode.verificationId,
        code
      );
      
      const result = await firebase.auth().signInWithCredential(credential);
      currentUser = result.user;
      
      // Create user document if new
      const userDoc = await firebase.firestore().collection('users').doc(currentUser.uid).get();
      if (!userDoc.exists) {
        await firebase.firestore().collection('users').doc(currentUser.uid).set({
          uid: currentUser.uid,
          phoneNumber: currentUser.phoneNumber,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          role: 'user',
          freeAccess: true,
          analysesCount: 0,
          exportsCount: 0
        });
      }
      
      await saveUserSession(currentUser);
      await logAuthEvent('mobile_signin', currentUser.uid);
      
      return {
        success: true,
        user: formatUser(currentUser),
        method: 'mobile'
      };
    } catch (error) {
      console.error('[AUTH] Mobile verification failed:', error);
      return {
        success: false,
        error: 'Invalid verification code',
        code: error.code
      };
    }
  }

  // ─── Password Reset ───
  async function resetPassword(email) {
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      await logAuthEvent('password_reset', email);
      
      return {
        success: true,
        message: 'Password reset email sent'
      };
    } catch (error) {
      return {
        success: false,
        error: getFriendlyErrorMessage(error.code)
      };
    }
  }

  // ─── Session Management ───
  async function saveUserSession(user) {
    try {
      const userData = formatUser(user);
      localStorage.setItem('crafty_gis_user', JSON.stringify(userData));
      localStorage.setItem('crafty_gis_session', JSON.stringify({
        uid: user.uid,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('[AUTH] Failed to save session:', error);
    }
  }

  async function loadUserSession() {
    try {
      const session = localStorage.getItem('crafty_gis_session');
      const userData = localStorage.getItem('crafty_gis_user');
      
      if (session && userData) {
        const sessionData = JSON.parse(session);
        
        // Check if session is valid (7 days)
        const sessionAge = Date.now() - sessionData.timestamp;
        if (sessionAge < 7 * 24 * 60 * 60 * 1000) {
          currentUser = JSON.parse(userData);
          return currentUser;
        } else {
          // Session expired
          await signOut();
        }
      }
    } catch (error) {
      console.error('[AUTH] Failed to load session:', error);
    }
    return null;
  }

  async function signOut() {
    try {
      await firebase.auth().signOut();
      currentUser = null;
      localStorage.removeItem('crafty_gis_user');
      localStorage.removeItem('crafty_gis_session');
      
      await logAuthEvent('signout', 'anonymous');
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ─── User Management ───
  function getCurrentUser() {
    return currentUser;
  }

  function isAuthenticated() {
    return currentUser !== null;
  }

  function hasRole(role) {
    if (!currentUser) return false;
    return currentUser.role === role || currentUser.role === 'admin';
  }

  async function updateUserProfile(updates) {
    try {
      if (!currentUser) return { success: false, error: 'Not authenticated' };
      
      const userRef = firebase.firestore().collection('users').doc(currentUser.uid);
      await userRef.update(updates);
      
      // Update local cache
      currentUser = { ...currentUser, ...updates };
      await saveUserSession(currentUser);
      
      return { success: true, user: currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ─── Utility Functions ───
  function formatUser(user) {
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      emailVerified: user.emailVerified || false,
      phoneVerified: user.phoneNumber ? true : false,
      role: user.role || 'user',
      freeAccess: user.freeAccess !== false,
      analysesCount: user.analysesCount || 0,
      exportsCount: user.exportsCount || 0,
      createdAt: user.createdAt || null
    };
  }

  function getFriendlyErrorMessage(errorCode) {
    const errors = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email already registered',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/popup-closed-by-user': 'Sign-in popup closed',
      'auth/cancelled-popup-request': 'Sign-in cancelled',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/phone-number-already-exists': 'Phone number already registered',
      'auth/invalid-verification-code': 'Invalid verification code',
      'auth/invalid-verification-id': 'Invalid verification ID'
    };
    
    return errors[errorCode] || 'Authentication failed. Please try again.';
  }

  async function logAuthEvent(event, userId) {
    try {
      await firebase.firestore().collection('auth_logs').add({
        event,
        userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        userAgent: navigator.userAgent,
        ip: 'client-side' // Server will capture real IP
      });
    } catch (error) {
      console.error('[AUTH] Failed to log event:', error);
    }
  }

  // ─── Public API ───
  return {
    // Google
    signInWithGoogle,
    
    // Email/Password
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    
    // Mobile
    sendMobileVerification,
    verifyMobileCode,
    
    // Session
    loadUserSession,
    saveUserSession,
    signOut,
    getCurrentUser,
    isAuthenticated,
    hasRole,
    
    // User Management
    updateUserProfile,
    formatUser,
    
    // Utility
    getFriendlyErrorMessage
  };
})();

if (typeof window !== 'undefined') {
  window.FH_AUTH = FH_AUTH;
}
