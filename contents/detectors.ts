export type DetectedElement = {
    element: HTMLElement;
    label: string;
    category: "checkout" | "cart" | "login" | "search" | "help" | "menu";
    score: number;
  };
  
  // --- Helpers ---
  const getVisibleText = (el: HTMLElement) => 
    (el.innerText || el.getAttribute('aria-label') || (el as HTMLInputElement).value || '').trim().toLowerCase();
  
  const matches = (text: string, regex: RegExp) => regex.test(text);
  
  const hasIconHint = (el: HTMLElement, keywords: string[]) => {
    const allElements = [el, ...Array.from(el.querySelectorAll('i, svg, span, img'))];
    for (const child of allElements) {
      const cls = (child.className && typeof child.className === 'string') ? child.className.toLowerCase() : '';
      const aria = (child.getAttribute('aria-label') || '').toLowerCase();
      const alt = (child.getAttribute('alt') || '').toLowerCase();
      if (keywords.some(kw => cls.includes(kw) || aria.includes(kw) || alt.includes(kw))) return true;
    }
    return false;
  };
  
  const findElements = (selector: string) => Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  
  // --- 1. DETECTORS ---
  
  export const detectCart = (): DetectedElement[] => {
    const results = new Map<HTMLElement, DetectedElement>();
    const add = (el: HTMLElement, score: number) => {
      if (!results.has(el)) results.set(el, { element: el, label: "View Cart", category: "cart", score });
    };
    // High Confidence
    findElements('[aria-label*="cart" i], [aria-label*="basket" i], .nav-cart-icon').forEach(el => add(el, 100));
    findElements('a[href*="/cart"], a[href*="/basket"]').forEach(el => add(el, 80));
    // Text
    findElements('a, button').forEach(el => {
      const text = getVisibleText(el);
      if (matches(text, /\b(cart|basket|bag)\b/)) add(el, 90);
    });
    return Array.from(results.values());
  };
  
  export const detectSearch = (): DetectedElement[] => {
    const results = new Map<HTMLElement, DetectedElement>();
    const add = (el: HTMLElement, score: number) => {
      if (!results.has(el)) results.set(el, { element: el, label: "Search", category: "search", score });
    };
    findElements('input[type="search"], [role="searchbox"]').forEach(el => add(el, 100));
    findElements('button, [role="button"]').forEach(el => {
      if (matches(getVisibleText(el), /search|find|搜索|cari/)) add(el, 80);
      if (hasIconHint(el, ['search', 'magnify'])) add(el, 60);
    });
    return Array.from(results.values());
  };
  
  export const detectLogin = (): DetectedElement[] => {
    const results = new Map<HTMLElement, DetectedElement>();
    const add = (el: HTMLElement, score: number) => {
      if (!results.has(el)) results.set(el, { element: el, label: "Sign In", category: "login", score });
    };
    findElements('a[href*="login"], a[href*="signin"], a[href*="account"]').forEach(el => add(el, 80));
    findElements('a, button').forEach(el => {
      if (matches(getVisibleText(el), /\b(sign.?in|log.?in|my.?account)\b/)) add(el, 90);
    });
    return Array.from(results.values());
  };
  
  export const detectCheckout = (): DetectedElement[] => {
    const results = new Map<HTMLElement, DetectedElement>();
    const add = (el: HTMLElement, score: number) => {
      if (!results.has(el)) results.set(el, { element: el, label: "Checkout", category: "checkout", score });
    };
    findElements('a[href*="checkout"], button[name="checkout"]').forEach(el => add(el, 100));
    return Array.from(results.values());
  };
  
  // NEW: Detect Help/Support
  export const detectHelp = (): DetectedElement[] => {
    const results = new Map<HTMLElement, DetectedElement>();
    const add = (el: HTMLElement, score: number) => {
      if (!results.has(el)) results.set(el, { element: el, label: "Help / Support", category: "help", score });
    };
    findElements('a[href*="contact"], a[href*="help"], a[href*="support"], a[href*="faq"]').forEach(el => add(el, 80));
    findElements('button, a').forEach(el => {
      if (matches(getVisibleText(el), /\b(contact|help|support|faq|customer service)\b/)) add(el, 90);
    });
    return Array.from(results.values());
  };
  
  // --- 2. MASTER FUNCTION (With Deduplication) ---
  export const runAllDetectors = () => {
    const allMatches = [
      ...detectCheckout(),
      ...detectCart(),
      ...detectLogin(),
      ...detectSearch(),
      ...detectHelp()
    ];
  
    // DEDUPLICATION & PRIORITIZATION LOGIC
    const uniqueCategories = new Map<string, DetectedElement>();
  
    allMatches.forEach(item => {
      // 1. Check Visibility roughly
      if (item.element.getBoundingClientRect().width === 0) return;
  
      // 2. Keep only the BEST element for each category
      // If we already found a 'search' button, only replace it if this one has a higher score
      if (!uniqueCategories.has(item.category) || item.score > uniqueCategories.get(item.category)!.score) {
        uniqueCategories.set(item.category, item);
      }
    });
  
    // 3. Define Priority Order (What shows up first in the bar)
    const PRIORITY = ['checkout', 'cart', 'login', 'search', 'help'];
  
    return Array.from(uniqueCategories.values())
      .sort((a, b) => PRIORITY.indexOf(a.category) - PRIORITY.indexOf(b.category));
  };