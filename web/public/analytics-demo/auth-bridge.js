/* Use the signed-in app session for embedded analytics requests. */
(() => {
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  globalThis.wtfAnalyticsRequest = async (path, options) => {
    if (!embedded) return fetch(path, options);
    if (!window.wtfAuthenticatedFetch) {
      await new Promise((resolve, reject) => {
        const ready = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(() => {
          window.removeEventListener('wtf-analytics-auth-ready', ready);
          reject(new Error('Your session could not be loaded. Refresh the page and try again.'));
        }, 15000);
        window.addEventListener('wtf-analytics-auth-ready', ready, { once: true });
      });
    }
    return window.wtfAuthenticatedFetch(path, options);
  };
})();
