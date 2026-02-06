console.log('[VoiceModule] Loaded');

class VoiceModule {
  constructor() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => console.log('[VoiceModule] 🎤 Listening...');
    
    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      console.log('[VoiceModule] Heard:', transcript);
      this.handleCommand(transcript);
    };

    this.recognition.onerror = (e) => console.error('[VoiceModule] Error:', e.error);
  }

  start() { this.recognition.start(); }
  stop() { this.recognition.stop(); }

  handleCommand(text) {
    if (text.includes('search')) {
      const query = text.replace('search', '').trim();
      const input = document.querySelector('input[type="search"]');
      if (input) {
        input.value = query;
        input.form?.submit();
      }
    }

    if (text.includes('read page')) {
      this.readPage();
    }

    if (text.includes('stop')) {
      this.stop();
    }
  }

  readPage() {
    // Grab main headings or entire page
    const content = [...document.querySelectorAll('h1, h2')].map(h => h.innerText).slice(0, 10);
    const textToRead = content.length ? content.join('. ') : "Nothing to read";

    const utterance = new SpeechSynthesisUtterance(textToRead);
    speechSynthesis.speak(utterance);
  }
}

window.voiceAssistant = new VoiceModule();
window.voiceAssistant.start();

console.log('[VoiceModule] ✅ Ready. Say "search", "read page", or "stop".');
