// lib/utils/safari-auth-fix.ts

/**
 * Utilitaires pour résoudre les problèmes d'authentification sur Safari
 */

export const isSafari = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const isSafariBrowser = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  return isSafariBrowser || isIOS;
};

/**
 * Force le rafraîchissement des cookies pour Safari
 */
export const refreshSafariSession = async () => {
  if (!isSafari()) return;
  
  try {
    // Forcer une requête pour rafraîchir la session
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (response.ok) {
      const session = await response.json();
      return session;
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement de session Safari:', error);
  }
  
  return null;
};

/**
 * Nettoie les cookies problématiques sur Safari
 */
export const clearSafariAuthCookies = () => {
  if (!isSafari()) return;
  
  // Liste des cookies NextAuth à nettoyer
  const authCookies = [
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    '__Host-next-auth.session-token',
    'next-auth.csrf-token',
    '__Host-next-auth.csrf-token',
    'next-auth.callback-url',
    '__Secure-next-auth.callback-url'
  ];
  
  authCookies.forEach(cookieName => {
    // Essayer de supprimer avec différents paths et domaines
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
  });
};

/**
 * Applique un workaround pour Safari après connexion
 */
export const applySafariAuthWorkaround = async () => {
  if (!isSafari()) return;
  
  // Attendre un peu pour que NextAuth définisse les cookies
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Forcer le rafraîchissement de la session
  const session = await refreshSafariSession();
  
  if (session) {
    // Si la session est valide, forcer un rechargement complet
    window.location.href = window.location.origin;
  }
};