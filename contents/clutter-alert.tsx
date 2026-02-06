import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

// --- LOGIC & STYLES ---

// 1. Data Structure
interface ClutterStats {
  score: number
  details: { wordCount: number; interactiveCount: number }
}

// 2. Styles
export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    .clutter-alert-box {
      position: fixed; bottom: 30px; right: 30px; background: #ffffff;
      color: #1a1a1a; padding: 24px; border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.15); z-index: 2147483646;
      width: 340px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border: 1px solid #e0e0e0; animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .clutter-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .clutter-icon { font-size: 24px; }
    .clutter-title { font-size: 18px; font-weight: 700; margin: 0; }
    .clutter-desc { font-size: 14px; color: #555; line-height: 1.5; margin: 0 0 16px 0; }
    
    .clutter-stats-row { 
      display: flex; gap: 12px; margin-bottom: 16px; 
      background: #f5f5f5; padding: 10px; border-radius: 8px;
    }
    .stat-item { flex: 1; display: flex; flex-direction: column; }
    .stat-label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; }
    .stat-value { font-size: 16px; font-weight: 600; color: #333; }

    .clutter-btn-primary { 
      background: #2563EB; color: #fff; border: none; 
      padding: 12px; border-radius: 8px; width: 100%; 
      font-weight: 600; cursor: pointer; font-size: 14px;
      transition: background 0.2s;
    }
    .clutter-btn-primary:hover { background: #1d4ed8; }
    
    .clutter-dismiss { 
      margin-top: 12px; font-size: 12px; color: #999; 
      text-align: center; cursor: pointer; text-decoration: underline; 
    }

    @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `
  return style
}

// 3. Analysis Logic
const analyzeClutter = (): ClutterStats => {
  if (typeof document === "undefined") {
    return { score: 0, details: { wordCount: 0, interactiveCount: 0 } }
  }

  const text = document.body.innerText || ""
  const wordCount = text.split(/\s+/).length
  const interactiveCount = document.querySelectorAll("a, button, input").length
  const mediaCount = document.querySelectorAll("img, video, iframe").length

  const score = (wordCount * 0.05) + (interactiveCount * 1.5) + (mediaCount * 2)

  return { score, details: { wordCount, interactiveCount } }
}

const ClutterAlert = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [stats, setStats] = useState<ClutterStats>({ score: 0, details: { wordCount: 0, interactiveCount: 0 } })

  useEffect(() => {
    document.head.appendChild(getStyle())
    
    const timer = setTimeout(() => {
      const result = analyzeClutter()
      setStats(result)
      // Threshold check
      if (result.score > 800) { 
        setIsVisible(true)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  // HANDLER: Triggers the switch
  const handleAssistClick = () => {
    setIsVisible(false) // 1. Close self
    window.dispatchEvent(new CustomEvent("plasmo-trigger-assist")) // 2. Wake up neighbor
  }

  if (!isVisible) return null

  return (
    <div className="clutter-alert-box">
      <div className="clutter-header">
        <span className="clutter-icon">🧠</span>
        <h2 className="clutter-title">Cognitive Load Alert</h2>
      </div>
      
      <p className="clutter-desc">
        This page has high visual noise. Would you like to switch to a focused view?
      </p>

      <div className="clutter-stats-row">
        <div className="stat-item">
          <span className="stat-label">Complexity</span>
          <span className="stat-value">{Math.round(stats.score)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Interactions</span>
          <span className="stat-value">{stats.details.interactiveCount} items</span>
        </div>
      </div>

      <button className="clutter-btn-primary" onClick={handleAssistClick}>
        Assist mode
      </button>
      
      <div className="clutter-dismiss" onClick={() => setIsVisible(false)}>
        Dismiss for this site
      </div>
    </div>
  )
}

export default ClutterAlert