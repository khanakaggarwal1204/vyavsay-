import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Camera,
  ChevronDown,
  Mic,
  Minus,
  Plus,
  Send,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import "./assistant.css";
import "./assistant-scroll.css";
import "./avatar.css";
import Guide3D from "./Guide3D.jsx";
import { api } from "./api.js";
import LifecycleWalkthrough from "./LifecycleWalkthrough.jsx";
import { keepAvatarVisible } from "./guideAsset.js";

const suggestions = {
  templates: [
    "Explain this template",
    "What should I do next?",
    "How does review work?",
  ],
  challenges: [
    "How do I publish a challenge?",
    "Find a suitable startup",
    "Explain eligibility",
  ],
  default: [
    "How does Vyavsay work?",
    "What happens after a pilot?",
    "Explain procurement pathways",
  ],
};
function replyFor(message, view) {
  const text = message.toLowerCase();
  if (text.includes("template"))
    return "Vyavsay has seven standard libraries: Problem Statement, Evaluation Criteria, Pilot Agreement, Data and IP Clauses, Cybersecurity, Risk Management, and Procurement Pathways. Choose a library, create a draft, save it, then submit it for independent review.";
  if (text.includes("next") || text.includes("workflow"))
    return "The workflow is challenge, startup discovery, eligibility, evaluation, pilot design, milestone contracting, performance measurement, payment, independent validation, and finally a human-authorised scale-up decision.";
  if (text.includes("publish"))
    return "Complete the Problem Statement fields, save the draft, submit it, and have a separate department reviewer approve it. Only then can the author publish a new challenge.";
  if (text.includes("security") || text.includes("cyber"))
    return "Before field or live access, the startup must provide evidence for encryption, hosting and data handling, and required certifications. Every control needs independent review, and expired or changed evidence blocks progression.";
  if (text.includes("procurement"))
    return "Procurement Pathways checks contract value, jurisdiction, urgency, vendor relationship, and the validity dates of configured rules. When no reviewed rule matches, it sends the case to an authorised procurement officer.";
  if (text.includes("payment"))
    return "A payment record is created after the startup submits milestone evidence and the department confirms completion. Finance then reviews it, with overdue alerts if the deadline passes.";
  if (text.includes("startup") || text.includes("find"))
    return "Startup Discovery compares challenge sector and requirements with registered startup information. Shortlisting is a recommendation; eligibility and expert review remain separate controls.";
  if (text.includes("hello") || text.includes("hi"))
    return "Hello. I am your Vyavsay guide. Ask me about a challenge, template, pilot, payment, security review, or scale-up decision.";
  return `I can help with ${view === "templates" ? "the template libraries and review workflow" : "challenges, startups, pilots, payments, validation and scale-up"}. Try asking: “What should I do next?”`;
}

export default function VyavsayAssistant({
  view,
  avatarSrc,
  role = "Guest",
  contextRef = null,
}) {
  const [open, setOpen] = useState(false),
    [muted, setMuted] = useState(false),
    [listening, setListening] = useState(false),
    [speaking, setSpeaking] = useState(false),
    [input, setInput] = useState(""),
    [messages, setMessages] = useState([]),
    [zoom, setZoom] = useState(1.55),
    [sessionId, setSessionId] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [mode, setMode] = useState("ask");
  const avatarState = listening ? "listening" : speaking ? "talking" : "idle";
  const recognition = useRef(null), endRef = useRef(null), audio = useRef(null), audioUrl = useRef(null);
  const chips = useMemo(() => suggestions[view] || suggestions.default, [view]);
  const stopVoice = () => {
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setSpeaking(false);
  };
  const say = async (text) => {
    if (muted) return;
    stopVoice();
    try {
      const response = await fetch("/api/assistant/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!response.ok) throw new Error("Natural voice unavailable");
      audioUrl.current = URL.createObjectURL(await response.blob());
      const player = new Audio(audioUrl.current);
      audio.current = player;
      player.onplay = () => setSpeaking(true);
      player.onended = stopVoice;
      player.onerror = () => {
        stopVoice();
        setError("The guide voice is temporarily unavailable. Please try again.");
      };
      await player.play();
    } catch {
      setError("The guide voice is temporarily unavailable. Please try again.");
    }
  };
  const send = async (value = input) => {
    const clean = value.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    setMessages((items) => [...items, { from: "user", text: clean }]);
    setInput("");
    setOpen(true);
    try {
      const result = await api.queryAssistant({
        message: clean,
        sessionId,
        role,
        contextRef,
        audioUsed: Boolean(listening),
      });
      setSessionId(result.sessionId);
      setMessages((items) => [
        ...items,
        { from: "assistant", text: result.answer, grounded: result.grounded },
      ]);
      say(result.answer);
    } catch (err) {
      setError(err.message || "The guide is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  };
  const toggleListening = () => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setInput("Voice input is not available in this browser.");
      return;
    }
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const next = new Recognition();
    next.lang = "en-IN";
    next.interimResults = true;
    next.continuous = false;
    next.onstart = () => setListening(true);
    next.onend = () => setListening(false);
    next.onerror = () => setListening(false);
    next.onresult = (e) =>
      setInput([...e.results].map((r) => r[0].transcript).join(""));
    recognition.current = next;
    next.start();
  };
  useEffect(() => () => { stopVoice(); recognition.current?.stop(); }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);
  return (
    <>
      {open && (
        <aside
          className={`assistant-panel ${mode === "walkthrough" ? "walkthrough-open" : ""}`}
          aria-label="Vyavsay assistant"
        >
          <section className="assistant-scene" aria-label="Virtual guide stage">
            <div className="assistant-scene-top">
              <span className="assistant-live">
                <i /> LIVE GUIDE
              </span>
              <span>
                {mode === "walkthrough"
                  ? "9-stage walkthrough"
                  : "Virtual guidance"}
              </span>
            </div>
            {mode === "walkthrough" ? (
              <LifecycleWalkthrough
                avatarSrc={avatarSrc}
                avatarState={avatarState}
                onNarrate={say}
              />
            ) : (
              <>
                <div className={`assistant-character avatar-${avatarState}`}>
                  <div className="assistant-halo" />
                  <Guide3D state={avatarState} fallback={avatarSrc} zoom={zoom} />
                </div>
                <div className="assistant-scene-bottom">
                  <span>
                    {speaking
                      ? "Speaking"
                      : listening
                        ? "Listening"
                        : "Ready to help"}
                  </span>
                  <div>
                    <button
                      title="Zoom out"
                      aria-label="Zoom out"
                      disabled={zoom <= 0.9}
                      onClick={() => setZoom((v) => Math.max(0.9, Number((v - 0.2).toFixed(2))))}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      title="Zoom in"
                      aria-label="Zoom in"
                      disabled={zoom >= 2.35}
                      onClick={() => setZoom((v) => Math.min(2.35, Number((v + 0.2).toFixed(2))))}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      title="Focus guide"
                      aria-label="Focus guide"
                      onClick={() => setZoom(1.55)}
                    >
                      <Camera size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
          <section className="assistant-chat">
            <header>
              <div className="assistant-title">
                <span className="assistant-avatar small">
                  <img src={avatarSrc} onError={keepAvatarVisible} alt="" />
                </span>
                <div>
                  <strong>Vyavsay Guide</strong>
                  <small>
                    {mode === "walkthrough"
                      ? "Explore the procurement lifecycle"
                      : "Grounded platform guidance"}
                  </small>
                </div>
              </div>
              <div className="assistant-actions">
                <button
                  onClick={() =>
                    setMode(mode === "ask" ? "walkthrough" : "ask")
                  }
                  title={
                    mode === "ask"
                      ? "Open lifecycle walkthrough"
                      : "Return to guide chat"
                  }
                  aria-label={
                    mode === "ask"
                      ? "Open lifecycle walkthrough"
                      : "Return to guide chat"
                  }
                >
                  <Camera size={16} />
                </button>
                <button
                  title="Close assistant"
                  aria-label="Close assistant"
                  onClick={() => setOpen(false)}
                >
                  <X size={17} />
                </button>
              </div>
            </header>
            {mode === "ask" ? (
              <>
                <div className="assistant-messages">
                  <div className="assistant-welcome">
                    <strong>Namaste, I’m your Vyavsay guide.</strong>
                    <p>
                      Ask me anything about challenges, templates, pilots,
                      payments or approvals.
                    </p>
                  </div>
                  {messages.map((message, i) => (
                    <div
                      key={i}
                      className={`assistant-message ${message.from}`}
                    >
                      <span>
                        {message.text}
                        {message.grounded && (
                          <small className="assistant-grounded">
                            Live Vyavsay record
                          </small>
                        )}
                      </span>
                      {message.from === "assistant" && (
                        <button
                          title="Read aloud"
                          aria-label="Read aloud"
                          onClick={() => say(message.text)}
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {busy && (
                    <div className="assistant-typing">
                      Checking your Vyavsay records…
                    </div>
                  )}
                  {error && <div className="assistant-error">{error}</div>}
                  <div ref={endRef} />
                </div>
                <div className="assistant-chips">
                  {chips.map((chip) => (
                    <button key={chip} onClick={() => send(chip)}>
                      {chip}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="assistant-composer"
                >
                  <input
                    aria-label="Ask Vyavsay Guide"
                    placeholder="Ask your guide…"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <button
                    type="button"
                    title={listening ? "Stop listening" : "Use voice input"}
                    aria-label={
                      listening ? "Stop listening" : "Use voice input"
                    }
                    className={listening ? "listening" : ""}
                    onClick={toggleListening}
                  >
                    <Mic size={17} />
                  </button>
                  <button
                    type="submit"
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send size={17} />
                  </button>
                </form>
                <footer>
                  <span>
                    <Bot size={13} /> Grounded assistant
                  </span>
                  <span className="assistant-voice-label">Natural female voice</span>
                  <button
                    onClick={() => {
                      setMuted((value) => !value);
                      stopVoice();
                    }}
                    title={muted ? "Turn voice on" : "Mute voice"}
                    aria-label={muted ? "Turn voice on" : "Mute voice"}
                  >
                    {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  </button>
                </footer>
              </>
            ) : (
              <div className="walkthrough-copy">
                <strong>Walk through all nine stages</strong>
                <p>
                  Select a stage in the scene to hear its reviewed explanation.
                  The walkthrough is for onboarding and demos; approvals still
                  happen in the normal workspaces.
                </p>
              </div>
            )}
          </section>
        </aside>
      )}
      <button
        className={`assistant-launcher ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close Vyavsay Guide" : "Open Vyavsay Guide"}
        title="Ask Vyavsay Guide"
      >
        <span className="assistant-avatar">
          <img src={avatarSrc} onError={keepAvatarVisible} alt="" />
        </span>
        {!open && <span className="assistant-pulse" />}
        <span className="assistant-launcher-label">Ask Guide</span>
        <ChevronDown size={15} />
      </button>
    </>
  );
}
