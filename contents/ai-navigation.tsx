import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState, useRef } from "react"
import { runAllDetectors, type DetectedElement } from "./detectors"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const GEMINI_API_KEY = process.env.PLASMO_PUBLIC_GEMINI_API_KEY

// --- 1. STYLES (Updated for Chat UI) ---
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .wayfinder-bar {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #1a1a1a; color: white; padding: 10px 16px; border-radius: 24px;
      display: flex; flex-direction: column; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
      border: 1px solid #333; transition: all 0.3s ease; max-width: 400px; width: max-content;
    }
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
    
    /* Chat Bubble Styles */
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

// --- 2. HELPERS (Spotlight + Screenshot) ---

const captureScreen = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, (response) => {
        if (response && response.dataUrl) {
          // Remove the "data:image/jpeg;base64," prefix for the API
          resolve(response.dataUrl.split(",")[1])
        } else {
          resolve(null)
        }
      })
    } catch (e) {
      console.error("Screenshot failed", e)
      resolve(null)
    }
  })
}

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
  const [suggestions, setSuggestions] = useState<DetectedElement[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([])
  const [expandChat, setExpandChat] = useState(false)

  // Session History (Last 3 actions)
  const actionHistory = useRef<string[]>([])

  // --- LOGIC: Static Scanner ---
  const scanPage = () => {
    const matches = runAllDetectors()
    const visible = matches.filter(m => m.element.getBoundingClientRect().width > 0)
    setSuggestions(visible.slice(0, 4))
  }

  const addToHistory = (action: string) => {
      actionHistory.current = [action, ...actionHistory.current].slice(0, 3)
  }

  // --- LOGIC: The Smart Multimodal AI ---
  const askGemini = async (userPrompt: string) => {
    if (!GEMINI_API_KEY) return alert("Missing API Key")
    
    setLoading(true)
    setExpandChat(true)
    setChatHistory(prev => [...prev, { role: 'user', text: userPrompt }])

    try {
      // 1. Capture Context
      const screenshotBase64 = await captureScreen()
      const domSummary = suggestions.map(s => `${s.label} (${s.category})`).join(", ")
      const userHistoryStr = actionHistory.current.join(" -> ")

      // 2. Build Request
      const requestBody: any = {
        contents: [{
          parts: [
            { text: `
              You are a web navigation assistant. 
              User History (Last actions): ${userHistoryStr || "None"}.
              Buttons detected on screen: ${domSummary}.
              
              User asks: "${userPrompt}"
              
              Task:
              1. Look at the screenshot to understand the page state (e.g., is the cart empty? is there a login error?).
              2. Based on the User History, suggest the logical NEXT step.
              3. If you mention a specific button, wrap it in brackets like [Button Name].
              4. Keep it short (max 2 sentences).
            `},
            // Add Image if available
            screenshotBase64 ? { inlineData: { mimeType: "image/jpeg", data: screenshotBase64 } } : { text: "(Screenshot unavailable)" }
          ]
        }]
      }

      // 3. Call API
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      })

      const data = await res.json()
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure."

      // 4. Process Response (Find mentions of buttons to highlight)
      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse }])
      
      // If AI mentions [Cart], try to highlight it
      const match = aiResponse.match(/\[(.*?)\]/)
      if (match) {
          const btnName = match[1].toLowerCase()
          const target = suggestions.find(s => s.label.toLowerCase().includes(btnName))
          if (target) createSpotlight(target.element)
      }

    } catch (e) {
      console.error(e)
      setChatHistory(prev => [...prev, { role: 'ai', text: "Error connecting to AI." }])
    }
    setLoading(false)
  }

  // Handle clicking a suggestion button
  const handleBtnClick = (s: DetectedElement) => {
      createSpotlight(s.element)
      addToHistory(s.label) // Remember this action
  }

  useEffect(() => {
    document.head.appendChild(getStyle())
    setTimeout(scanPage, 500)
  }, [])

  return (
    <div className="wayfinder-bar">
      
      {/* 1. Chat Area (Expands when talking) */}
      {expandChat && (
          <div className="wf-chat-area">
              {chatHistory.map((msg, i) => (
                  <div key={i} className={`wf-msg ${msg.role}`}>{msg.text}</div>
              ))}
              {loading && <div className="wf-msg ai"><div className="wf-spinner"></div></div>}
          </div>
      )}

      {/* 2. Quick Actions Row */}
      <div className="wf-row">
        {!loading && suggestions.map((s, i) => (
            <button key={i} className="wayfinder-btn primary" onClick={() => handleBtnClick(s)}>
            {s.label}
            </button>
        ))}
        
        {/* The "What now?" Magic Button */}
        {suggestions.length === 0 && !loading && (
             <button className="wayfinder-btn" onClick={() => askGemini("What should I do next?")}>
                 What next? 🤷‍♂️
             </button>
        )}
      </div>

      {/* 3. In`put Row */}
      <div className="wf-row">
        <input 
            className="wayfinder-input" 
            placeholder="Ask AI (e.g. 'How do I return an item?')" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askGemini(query)}
        />
        {expandChat && (
            <button className="wayfinder-btn" onClick={() => setExpandChat(false)}>Close</button>
        )}
      </div>
    </div>
  )
}

export default AiNavigation