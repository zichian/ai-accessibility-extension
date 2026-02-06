(() => {
  console.log('[AI-Accessibility] Content script loaded');

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('voice-module.js');
  script.type = 'text/javascript';

  script.onload = () => {
    console.log('[AI-Accessibility] Voice module injected');
    script.remove();
  };

  (document.head || document.documentElement).appendChild(script);
})();
// content-script.js

// Ignore Amazon MIX C004 warnings
window.addEventListener('error', e => {
    if (e.message && e.message.includes('MIX C004')) {
        // Just ignore this specific Amazon warning
        return;
    }
    // Optional: log other errors for debugging
    console.warn('Unhandled page error:', e.message || e);
});
