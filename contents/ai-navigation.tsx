import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState, useRef } from "react"
import { runAllDetectors, type DetectedElement } from "./detectors"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const GEMINI_API_KEY = process.env.PLASMO_PUBLIC_GEMINI_API_KEY

// --- 1. STYLES ---
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .wayfinder-bar {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #1a1a1a; color: white; padding: 10px 16px; border-radius: 24px;
      display: flex; flex-direction: column; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      border: 1px solid #333; transition: all 0.3s ease; max-width: 400px; width: max-content;
      animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes popUp { from { transform: translateX(-50%) translateY(100px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
    
    .wf-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    .wayfinder-btn {
      background: #333; color: #eee; border: 1px solid #444; padding: 6px 12px;
      border-radius: 12px; cursor: pointer; font-size: 13px; transition: all 0.2s; white-space: nowrap;
    }
    .wayfinder-btn:hover { background: #444; transform: translateY(-1px); }
    .wayfinder-btn.primary { background: #0b93f6; border: none; color: white; font-weight: 600; }
    
    .wayfinder-input {
      background: #2a2a2a; border: none; color: white; padding: 8px 12px;
      border-radius: 20px; outline: none; flex-grow: 1; font-size: 13px; min-width: 200px;
    }
    .wayfinder-input:focus { background: #333; }
    
    .wf-chat-area {
      max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
      padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 5px;
    }
    .wf-msg { font-size: 13px; padding: 6px 10px; border-radius: 8px; max-width: 90%; line-height: 1.4; }
    .wf-msg.user { align-self: flex-end; background: #0b93f6; color: white; }
    .wf-msg.ai { align-self: flex-start; background: #333; color: #ddd; border: 1px solid #444; }
    
    .wf-spinner { width: 14px; height: 14px; border: 2px solid #555; border-top-color: #0b93f6; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(11, 147, 246, 0.7); }
      70% { box-shadow: 0 0 0 20px rgba(11, 147, 246, 0); }
    }
    .ai-spotlight { animation: pulse-ring 2s infinite; }
  `
  return style
}

// --- 2. HELPERS ---
const createSpotlight = (target: HTMLElement) => {
    document.querySelectorAll(".ai-spotlight").forEach(el => el.remove())
    target.scrollIntoView({ behavior: "smooth", block: "center" })
    
    setTimeout(() => {
        let rect = target.getBoundingClientRect()
        const spotlight = document.createElement("div")
        spotlight.className = "ai-spotlight"
        Object.assign(spotlight.style, {
            position: "absolute",
            top: `${rect.top + window.scrollY - 5}px`,
            left: `${rect.left + window.scrollX - 5}px`,
            width: `${rect.width + 10}px`, height: `${rect.height + 10}px`,
            borderRadius: "8px", boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            border: "3px solid #0b93f6", zIndex: "2147483647", pointerEvents: "none"
        })
        document.body.appendChild(spotlight)
        setTimeout(() => spotlight.remove(), 5000)
    }, 500)
}

// --- 3. MAIN COMPONENT ---
const AiNavigation = () => {
  // NEW: State to control visibility via the Event Listener
  const [isActive, setIsActive] = useState(false)

  const [suggestions, setSuggestions] = useState<DetectedElement[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([])
  const [expandChat, setExpandChat] = useState(false)
  const actionHistory = useRef<string[]>([])

  const scanPage = () => {
    const matches = runAllDetectors()
    const visible = matches.filter(m => m.element.getBoundingClientRect().width > 0)
    setSuggestions(visible.slice(0, 4))
  }

  const inferGoal = (query: string) => {
    const q = query.toLowerCase()
    if (q.includes("return") || q.includes("refund")) return "help"
    if (q.includes("track")) return "help"
    if (q.includes("cart")) return "cart"
    if (q.includes("checkout") || q.includes("pay")) return "checkout"
    if (q.includes("search") || q.includes("find")) return "search"
    if (q.includes("login") || q.includes("sign")) return "login"
    return "help"
  }

  const askGemini = async (userPrompt: string) => {
    if (!GEMINI_API_KEY) { alert("Missing API Key"); return }

    setLoading(true)
    setExpandChat(true)
    setChatHistory(prev => [...prev, { role: "user", text: userPrompt }])

    const targetCategory = inferGoal(userPrompt)
    const target = suggestions.find(s => s.category === targetCategory)

    if (target) createSpotlight(target.element)

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `User wants to: "${userPrompt}". I highlighted the "${target?.label || "Help"}" button. Explain in ONE short sentence why.` }] }]
          })
        }
      )
      const data = await res.json()
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I highlighted the best place to start."
      setChatHistory(prev => [...prev, { role: "ai", text: aiText }])
    } catch (e) {
      setChatHistory(prev => [...prev, { role: "ai", text: "I highlighted the best place to start." }])
    }
    setLoading(false)
  }

  const handleBtnClick = (s: DetectedElement) => {
      createSpotlight(s.element)
      actionHistory.current = [s.label, ...actionHistory.current].slice(0, 3)
  }

  // --- NEW: Event Listener & Activation Logic ---
  useEffect(() => {
    const activationHandler = () => {
      setIsActive(true)
      // Only inject styles and scan once activated to save resources
      if (!document.getElementById('wf-styles')) {
        const styleEl = getStyle()
        styleEl.id = 'wf-styles'
        document.head.appendChild(styleEl)
      }
      // Delay slightly to allow animation
      setTimeout(scanPage, 100)
    }

    window.addEventListener("plasmo-trigger-assist", activationHandler)
    return () => window.removeEventListener("plasmo-trigger-assist", activationHandler)
  }, [])

  // Do not render anything until activated
  if (!isActive) return null

  return (
    <div className="wayfinder-bar">
      {expandChat && (
          <div className="wf-chat-area">
              {chatHistory.map((msg, i) => (
                  <div key={i} className={`wf-msg ${msg.role}`}>{msg.text}</div>
              ))}
              {loading && <div className="wf-msg ai"><div className="wf-spinner"></div></div>}
          </div>
      )}

      <div className="wf-row">
        {!loading && suggestions.map((s, i) => (
            <button key={i} className="wayfinder-btn primary" onClick={() => handleBtnClick(s)}>
            {s.label}
            </button>
        ))}
        {suggestions.length === 0 && !loading && (
             <button className="wayfinder-btn" onClick={() => askGemini("What should I do next?")}>
                 What next? 🤷‍♂️
             </button>
        )}
      </div>

      <div className="wf-row">
        <input 
            className="wayfinder-input" 
            placeholder="Ask AI (e.g. 'How do I return an item?')" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askGemini(query)}
            autoFocus
        />
        <button className="wayfinder-btn" onClick={() => setIsActive(false)}>Close</button>
      </div>
    </div>
  )
}

export default AiNavigation