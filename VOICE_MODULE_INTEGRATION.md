# Voice Module Integration Guide

## Files Created

```
src/hooks/useVoiceRecorder.ts      ← Core hook (recording + transcription)
src/components/VoiceRecorderButton.tsx  ← Drop-in UI component
supabase/functions/transcribe/index.ts  ← Edge function (Whisper API)
```

---

## Step 1: Deploy Edge Function

```bash
# Add OpenAI API key to Supabase secrets
supabase secrets set OPENAI_API_KEY=sk-your-key-here

# Deploy the transcribe function
supabase functions deploy transcribe
```

---

## Step 2: Integration in MealInput.tsx

### BEFORE (Current - Web Speech API, 50+ lines of types)

```tsx
// Lines 15-65: Type declarations for SpeechRecognition
interface SpeechRecognition extends EventTarget { ... }
interface SpeechRecognitionEvent { ... }
// ... more types ...

// Lines 148-150: State variables
const [isListening, setIsListening] = useState(false);
const [voiceContext, setVoiceContext] = useState('');
const recognitionRef = useRef<SpeechRecognition | null>(null);

// Lines 510-542: Complex mic button with inline Web Speech API logic
<button onClick={() => {
  if (isListening) {
    recognitionRef.current?.stop();
    setIsListening(false);
  } else {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => { ... };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
      setIsListening(true);
      setTimeout(() => { try { recognition.stop(); } catch {} }, 15000);
    }
  }
}}>
  <Mic />
</button>
```

---

### AFTER (New - Clean modular approach)

```tsx
// REMOVE: Lines 15-65 (all SpeechRecognition type declarations)
// REMOVE: Lines 148-150 (isListening, voiceContext, recognitionRef)

// ADD: Import at top
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';

// ADD: In component (replaces isListening, voiceContext state)
const [voiceContext, setVoiceContext] = useState('');

// REPLACE: Mic button section with:
<VoiceRecorderButton
  size="md"
  onTranscript={(text) => setVoiceContext(text)}
  onError={(err) => setToast(err)}
/>

// voiceContext is now populated automatically
// It's already being passed to handleAnalyze → edge function
```

---

## Step 3: Quick Integration (Minimal Changes)

If you want the **fastest integration** with minimal code changes:

### In MealInput.tsx, just replace the mic button (lines ~510-542):

**Find this block:**
```tsx
{typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) && (
  <button
    type="button"
    onClick={() => { /* 30 lines of Web Speech API code */ }}
    className={`w-10 h-10 rounded-full...`}
  >
    <Mic className="w-4 h-4 text-white" />
  </button>
)}
```

**Replace with:**
```tsx
<VoiceRecorderButton
  size="md"
  onTranscript={(text) => setVoiceContext((prev) => prev ? `${prev} ${text}` : text)}
  onError={(err) => setToast(err)}
/>
```

**Add import at top:**
```tsx
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';
```

That's it. Everything else stays the same.

---

## Usage on Other Screens

### Option A: Drop-in Button
```tsx
import { VoiceRecorderButton } from '../components/VoiceRecorderButton';

<VoiceRecorderButton
  onTranscript={(text) => {
    // Do anything with the text:
    setInputValue(text);           // Put in text field
    sendToLLM({ prompt: text });   // Send to Claude
    console.log(text);             // Debug
  }}
/>
```

### Option B: Custom UI with Hook
```tsx
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

function MyCustomVoiceUI() {
  const { 
    startRecording, 
    stopRecording, 
    transcript, 
    isRecording, 
    isTranscribing 
  } = useVoiceRecorder();

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? '🛑 Stop' : '🎤 Record'}
      </button>
      {isTranscribing && <span>Processing...</span>}
      {transcript && <p>You said: {transcript}</p>}
    </div>
  );
}
```

---

## API Reference

### useVoiceRecorder Hook

```tsx
const {
  startRecording,    // () => Promise<void> - Start recording
  stopRecording,     // () => Promise<string | null> - Stop and get transcript
  cancelRecording,   // () => void - Cancel without transcribing
  transcript,        // string - Latest transcript
  clearTranscript,   // () => void - Clear transcript
  isRecording,       // boolean - Recording in progress
  isTranscribing,    // boolean - Whisper processing
  error,             // string | null - Error message
  duration,          // number - Recording duration in seconds
} = useVoiceRecorder({
  maxDuration: 60,          // Auto-stop after N seconds
  onTranscript: (text) => {},  // Called when transcript ready
  onError: (err) => {},        // Called on error
});
```

### VoiceRecorderButton Props

```tsx
<VoiceRecorderButton
  size="sm" | "md" | "lg"     // Button size (default: "md")
  showDuration={true}          // Show recording time (default: true)
  disabled={false}             // Disable button
  maxDuration={60}             // Max recording seconds
  onTranscript={(text) => {}}  // Called with transcript
  onError={(err) => {}}        // Called on error
  className=""                 // Additional CSS classes
/>
```

---

## Testing

1. Run: `npm run dev`
2. Open MealInput screen
3. Click mic button → Speak → Click stop
4. Watch: Button turns red (recording) → amber (transcribing) → green (done)
5. Transcript appears in voiceContext
6. Click "Log Meal" → voiceContext sent to Claude

---

## Cost

- Whisper API: ~$0.006 per minute of audio
- 10 recordings of 30 seconds each = $0.03
- Budget of $20 = ~3,300 recordings
