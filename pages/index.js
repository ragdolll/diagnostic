import { useState, useRef } from "react";

const C = {
  bg: "#0e0c0a", surface: "#1a1714", border: "#2e2a25",
  gold: "#c9a84c", goldDim: "#8a6f34", text: "#f5f0e8",
  textMuted: "#8a8075", textDim: "#5a5550",
};

const getBucketColor = (bucket) => {
  if (!bucket) return C.gold;
  if (bucket === "Aligned & Clear") return "#4caf7d";
  if (bucket === "Mostly Aligned") return "#c9a84c";
  if (bucket === "Scattered Message") return "#d4834a";
  return "#c0504a";
};

const downloadReport = (result, name) => {
  const bc = getBucketColor(result.bucket);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Clarity & Consistency Diagnostic — ${name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0e0c0a; color:#f5f0e8; font-family:Georgia,serif; padding:60px; max-width:760px; margin:0 auto; }
  .logo { font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:#c9a84c; margin-bottom:48px; }
  .bucket-label { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:${bc}; margin-bottom:12px; }
  h1 { font-size:36px; font-weight:normal; margin-bottom:16px; line-height:1.3; }
  .desc { font-size:15px; color:#8a8075; line-height:1.8; margin-bottom:40px; }
  .scores { display:flex; gap:24px; margin-bottom:40px; padding:24px; border:1px solid #2e2a25; }
  .score-item { flex:1; }
  .score-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#8a6f34; margin-bottom:8px; }
  .score-value { font-size:28px; color:#c9a84c; font-family:monospace; }
  .score-total { font-size:12px; color:#5a5550; }
  .block { margin-bottom:16px; padding:20px; border:1px solid #2e2a25; background:#120f0d; }
  .block-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#8a6f34; margin-bottom:10px; }
  .block-content { font-size:14px; line-height:1.8; }
  .urgency { padding:24px; border:1px solid #c9a84c; margin:32px 0; }
  .urgency-text { font-size:17px; font-style:italic; color:#c9a84c; line-height:1.6; margin-bottom:12px; }
  .urgency-sub { font-size:13px; color:#8a8075; line-height:1.6; }
  .footer { margin-top:48px; padding-top:24px; border-top:1px solid #2e2a25; font-size:11px; color:#5a5550; }
</style>
</head>
<body>
  <div class="logo">Narrative Alignment</div>
  <div class="bucket-label">Diagnostic Report — ${name}</div>
  <h1>${result.bucket}</h1>
  <p class="desc">${result.bucketDescription}</p>
  <div class="scores">
    <div class="score-item"><div class="score-label">Clarity</div><div class="score-value">${result.clarityScore}<span class="score-total">/3</span></div></div>
    <div class="score-item"><div class="score-label">Consistency</div><div class="score-value">${result.consistencyScore}<span class="score-total">/2</span></div></div>
    <div class="score-item"><div class="score-label">Total</div><div class="score-value" style="color:${bc}">${result.totalScore}<span class="score-total">/5</span></div></div>
  </div>
  ${[
    ["A vs B vs C — Alignment", result.abcAnalysis],
    ["Your team vs. you", result.teamGap],
    ["What's working", result.strongestPoint],
    ["Biggest gap", result.biggestGap],
    ["What this costs you", result.businessCost],
  ].map(([label, content]) => `<div class="block"><div class="block-label">${label}</div><div class="block-content">${content}</div></div>`).join('')}
  <div class="urgency">
    <div class="urgency-text">"${result.urgencyStatement}"</div>
    <div class="urgency-sub">A 90-minute Narrative Extraction Session rebuilds this from the ground up. You leave with one coherent message your entire team can deploy.</div>
  </div>
  <div class="footer">Narrative Alignment &nbsp;·&nbsp; narrativealignment.com &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `narrative-alignment-diagnostic-${name.toLowerCase()}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

const submitToNetlify = async (name, email, result) => {
  const formData = new FormData();
  formData.append("form-name", "diagnostic-leads");
  formData.append("name", name);
  formData.append("email", email);
  formData.append("bucket", result.bucket);
  formData.append("clarity_score", result.clarityScore);
  formData.append("consistency_score", result.consistencyScore);
  formData.append("total_score", result.totalScore);
  formData.append("submitted_at", new Date().toISOString());
  await fetch("/", { method: "POST", body: formData });
};

export default function App() {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentText, setCurrentText] = useState("");
  const [multiAnswers, setMultiAnswers] = useState({});

  const STEPS = [
    { id: "intro", type: "intro" },
    { id: "name", type: "name" },
    {
      id: "q1", type: "input", section: "CLARITY", label: "What You Say About Yourself",
      question: (n) => `${n}, paste your website's main headline or value proposition.`,
      hint: "What's the primary thing your homepage says you do? Paste the exact words.",
      placeholder: "e.g. 'We help B2B SaaS companies reduce customer acquisition costs by 30%...'",
    },
    {
      id: "q2", type: "input", section: "CLARITY", label: "What You Tell Others",
      question: (n) => `How do you describe your company in a sales call, ${n}?`,
      hint: "Not the polished version — the real one. What do you actually say in the first 60 seconds?",
      placeholder: "e.g. 'So what we do is we work with founders who are struggling to...'",
    },
    {
      id: "q3", type: "input", section: "CLARITY", label: "What You Actually Do",
      question: (n) => `${n}, describe your actual process. What does a client experience in the first 30 days?`,
      hint: "Be specific. What are the actual steps? What happens, in order?",
      placeholder: "e.g. 'Week 1 we do a 90 minute extraction call, then we build the document...'",
    },
    {
      id: "q4", type: "multi", section: "CONSISTENCY", label: "How You Show Up Across Channels",
      question: (n) => `${n}, give us three touchpoints where people encounter your company.`,
      hint: "For each one, paste a few sentences of what they actually hear.",
      fields: [
        { key: "linkedin", label: "LinkedIn (headline or About section)", placeholder: "Paste your LinkedIn headline or a key section..." },
        { key: "email", label: "Email (signature or outreach email)", placeholder: "Paste your email signature line or a recent outreach opening..." },
        { key: "pitch", label: "Sales call or pitch deck", placeholder: "Paste a line from your pitch or describe your opening..." },
      ],
    },
    {
      id: "q5", type: "input", section: "CONSISTENCY", label: "What Your Team Says",
      question: (n) => `Last one, ${n}. Ask a team member: 'In one sentence, what does our company do?' Paste their answer.`,
      hint: "This is the most revealing question. Write exactly what they said — not what you wish they'd said.",
      placeholder: "e.g. 'We do marketing stuff for companies...'",
    },
    { id: "result", type: "result" },
  ];

  const currentStep = STEPS[step];
  const totalQ = STEPS.filter(s => s.type === "input" || s.type === "multi").length;
  const progress = step / (STEPS.length - 1);

  const canProceed = () => {
    if (currentStep.type === "intro") return true;
    if (currentStep.type === "name") return firstName.trim().length > 1;
    if (currentStep.type === "input") return currentText.trim().length > 20;
    if (currentStep.type === "multi") return currentStep.fields.every(f => (multiAnswers[f.key] || "").trim().length > 10);
    return false;
  };

  const handleNext = async () => {
    if (currentStep.type === "input") setAnswers(p => ({ ...p, [currentStep.id]: currentText }));
    if (currentStep.type === "multi") setAnswers(p => ({ ...p, [currentStep.id]: multiAnswers }));
    if (currentStep.id === "q5") {
      const finalAnswers = { ...answers, q5: currentText };
      await runAnalysis(finalAnswers);
      return;
    }
    const next = step + 1;
    setStep(next);
    const nextStep = STEPS[next];
    if (nextStep?.type === "input") setCurrentText(answers[nextStep.id] || "");
    if (nextStep?.type === "multi") setMultiAnswers(answers[nextStep.id] || {});
  };

  const runAnalysis = async (finalAnswers) => {
    setLoading(true);
    setError(null);
    const prompt = `You are a brand narrative analyst. A founder named ${firstName} has completed a diagnostic about their messaging clarity and consistency. Analyze their inputs and provide a personalized diagnostic report.

WHAT THEY SAY ABOUT THEMSELVES (Website/A):
${finalAnswers.q1 || "Not provided"}

WHAT THEY TELL OTHERS (Pitch/B):
${finalAnswers.q2 || "Not provided"}

WHAT THEY ACTUALLY DO (Process/C):
${finalAnswers.q3 || "Not provided"}

TOUCHPOINTS:
- LinkedIn: ${finalAnswers.q4?.linkedin || "Not provided"}
- Email: ${finalAnswers.q4?.email || "Not provided"}
- Sales/Pitch: ${finalAnswers.q4?.pitch || "Not provided"}

WHAT THEIR TEAM SAYS:
${finalAnswers.q5 || "Not provided"}

Return a JSON object ONLY (no markdown, no preamble):
{
  "clarityScore": <0-3>,
  "consistencyScore": <0-2>,
  "totalScore": <0-5>,
  "bucket": "<Aligned & Clear | Mostly Aligned | Scattered Message | Fragmented>",
  "bucketDescription": "<2 sentences on what this means for ${firstName}'s business>",
  "strongestPoint": "<specific observation referencing their actual words>",
  "biggestGap": "<the single most important contradiction, quoting their actual words>",
  "abcAnalysis": "<2-3 sentences on whether A, B, C align. Quote their words.>",
  "teamGap": "<1-2 sentences on founder vs team alignment. Quote both.>",
  "businessCost": "<1 sentence on what this costs them in real business terms>",
  "urgencyStatement": "<1 punchy sentence creating urgency to fix this>"
}`;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      setStep(STEPS.findIndex(s => s.id === "result"));
    } catch (err) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!email.includes("@")) return;
    if (result) await submitToNetlify(firstName, email, result);
    setEmailSent(true);
  };

  const s = {
    wrap: { minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "Georgia, serif" },
    card: { width: "100%", maxWidth: "640px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "2px" },
    bar: { height: "2px", background: C.border },
    fill: { height: "100%", width: `${progress * 100}%`, background: C.gold, transition: "width 0.4s ease" },
    body: { padding: "48px 40px" },
    sec: { fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: C.goldDim, marginBottom: "12px" },
    q: { fontSize: "22px", color: C.text, lineHeight: "1.4", marginBottom: "12px", fontWeight: "normal" },
    hint: { fontSize: "14px", color: C.textMuted, lineHeight: "1.6", marginBottom: "24px" },
    ta: { width: "100%", minHeight: "120px", background: "#120f0d", border: `1px solid ${C.border}`, borderRadius: "2px", color: C.text, fontSize: "14px", lineHeight: "1.7", padding: "16px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
    btn: (disabled) => ({ display: "inline-flex", alignItems: "center", gap: "8px", background: disabled ? C.border : C.gold, color: disabled ? C.textDim : "#0e0c0a", border: "none", borderRadius: "2px", padding: "14px 28px", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", fontFamily: "Georgia, serif", fontWeight: "bold", marginTop: "24px", transition: "all 0.2s" }),
    inp: { width: "100%", background: "#120f0d", border: `1px solid ${C.border}`, borderRadius: "2px", color: C.text, fontSize: "15px", padding: "14px 16px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "12px" },
  };

  if (loading) return (
    <div style={s.wrap}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "40px", height: "40px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
        <p style={{ color: C.textMuted, fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Analysing your messaging, {firstName}...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // RESULT SCREEN
  if (currentStep.id === "result" && result) {
    const bc = getBucketColor(result.bucket);
    const ScoreBar = ({ score, max, label }) => (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: C.textMuted, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
          <span style={{ color: C.gold, fontSize: "13px", fontFamily: "monospace" }}>{score}/{max}</span>
        </div>
        <div style={{ height: "4px", background: C.border, borderRadius: "2px" }}>
          <div style={{ height: "100%", width: `${(score / max) * 100}%`, background: `linear-gradient(90deg, ${C.gold}, ${bc})`, borderRadius: "2px" }} />
        </div>
      </div>
    );
    return (
      <div style={s.wrap}>
        <div style={{ ...s.card, maxWidth: "680px" }}>
          <div style={{ height: "3px", background: bc }} />
          <div style={s.body}>
            <div style={{ ...s.sec, color: bc }}>Your Diagnostic Report, {firstName}</div>
            <h1 style={{ ...s.q, fontSize: "28px", marginBottom: "8px" }}>{result.bucket}</h1>
            <p style={s.hint}>{result.bucketDescription}</p>

            <div style={{ marginBottom: "32px" }}>
              <ScoreBar score={result.clarityScore} max={3} label="Clarity Score" />
              <ScoreBar score={result.consistencyScore} max={2} label="Consistency Score" />
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.textMuted, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total Score</span>
                <span style={{ color: bc, fontSize: "18px", fontFamily: "monospace" }}>{result.totalScore}/5</span>
              </div>
            </div>

            {[
              ["A vs B vs C — Are they aligned?", result.abcAnalysis],
              ["Your team vs. you", result.teamGap],
              ["What's working", result.strongestPoint],
              ["Biggest gap", result.biggestGap],
              ["What this costs you", result.businessCost],
            ].map(([label, content]) => (
              <div key={label} style={{ padding: "20px", background: "#120f0d", border: `1px solid ${C.border}`, borderRadius: "2px", marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: C.goldDim, marginBottom: "8px" }}>{label}</div>
                <p style={{ color: C.text, fontSize: "14px", lineHeight: "1.7", margin: 0 }}>{content}</p>
              </div>
            ))}

            <div style={{ padding: "24px", border: `1px solid ${C.gold}`, borderRadius: "2px", margin: "24px 0" }}>
              <p style={{ color: C.gold, fontSize: "16px", lineHeight: "1.6", margin: "0 0 12px", fontStyle: "italic" }}>"{result.urgencyStatement}"</p>
              <p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.6", margin: 0 }}>A 90-minute Narrative Extraction Session rebuilds this from the ground up. You leave with one coherent message your entire team can deploy.</p>
            </div>

            <button style={s.btn(false)} onClick={() => window.open("https://calendly.com", "_blank")}>
              Book a Clarity Call →
            </button>

            {/* PDF DOWNLOAD */}
            <div style={{ marginTop: "32px", paddingTop: "32px", borderTop: `1px solid ${C.border}` }}>
              <div style={{ ...s.sec }}>Save Your Report</div>
              <button
                style={{ ...s.btn(false), background: "transparent", color: C.gold, border: `1px solid ${C.gold}`, marginTop: "0" }}
                onClick={() => downloadReport(result, firstName)}
              >
                Download Report →
              </button>
            </div>

            {/* EMAIL CAPTURE */}
            <div style={{ marginTop: "24px", padding: "24px", background: "#120f0d", border: `1px solid ${C.border}`, borderRadius: "2px" }}>
              <div style={{ ...s.sec, marginBottom: "8px" }}>Get This Report by Email</div>
              {emailSent ? (
                <p style={{ color: "#4caf7d", fontSize: "14px" }}>✓ Sent to {email}</p>
              ) : (
                <>
                  <p style={{ color: C.textMuted, fontSize: "13px", lineHeight: "1.6", marginBottom: "16px" }}>Enter your email and we'll send you this report plus a Clarity Call invite.</p>
                  <input
                    style={{ ...s.inp, marginBottom: "8px" }}
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <button
                    style={{ ...s.btn(!email.includes("@")), marginTop: "8px" }}
                    onClick={handleEmailSubmit}
                  >
                    Send Me the Report →
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
        {/* Hidden Netlify form */}
        <form name="diagnostic-leads" data-netlify="true" hidden>
          <input name="name" /><input name="email" /><input name="bucket" />
          <input name="clarity_score" /><input name="consistency_score" /><input name="total_score" />
          <input name="submitted_at" />
        </form>
      </div>
    );
  }

  // INTRO
  if (currentStep.id === "intro") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.bar}><div style={s.fill} /></div>
        <div style={s.body}>
          <div style={s.sec}>Narrative Alignment</div>
          <h1 style={{ ...s.q, fontSize: "26px", marginBottom: "20px" }}>Is your message consistent — or are you telling different stories to different people?</h1>
          <p style={s.hint}>Most founders think they're clear. Most aren't. This diagnostic takes 5 minutes and shows you exactly where your message breaks down — and what it's costing you.</p>
          {["5 questions about your actual messaging", "Instant analysis of A vs B vs C alignment", "Personalised diagnostic report with specific gaps"].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "4px", height: "4px", background: C.gold, borderRadius: "50%", flexShrink: 0 }} />
              <span style={{ color: C.textMuted, fontSize: "14px" }}>{item}</span>
            </div>
          ))}
          <button style={s.btn(false)} onClick={() => setStep(1)}>Start the Diagnostic →</button>
        </div>
      </div>
    </div>
  );

  // NAME CAPTURE
  if (currentStep.id === "name") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.bar}><div style={s.fill} /></div>
        <div style={s.body}>
          <div style={s.sec}>Before we start</div>
          <h2 style={s.q}>What's your first name?</h2>
          <input
            style={{ ...s.inp, fontSize: "18px", padding: "16px" }}
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && canProceed() && handleNext()}
            autoFocus
          />
          <button style={s.btn(!canProceed())} onClick={canProceed() ? handleNext : undefined}>
            Let's Go →
          </button>
        </div>
      </div>
    </div>
  );

  // MULTI INPUT
  if (currentStep.type === "multi") return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.bar}><div style={s.fill} /></div>
        <div style={s.body}>
          <div style={s.sec}>{currentStep.section}</div>
          <h2 style={s.q}>{typeof currentStep.question === "function" ? currentStep.question(firstName) : currentStep.question}</h2>
          <p style={s.hint}>{currentStep.hint}</p>
          {currentStep.fields.map(field => (
            <div key={field.key} style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: C.goldDim, marginBottom: "8px" }}>{field.label}</label>
              <textarea style={s.ta} placeholder={field.placeholder} value={multiAnswers[field.key] || ""} onChange={e => setMultiAnswers(p => ({ ...p, [field.key]: e.target.value }))} />
            </div>
          ))}
          <button style={s.btn(!canProceed())} onClick={canProceed() ? handleNext : undefined}>Continue →</button>
        </div>
      </div>
    </div>
  );

  // TEXT INPUT
  const qIndex = STEPS.filter(s => s.type === "input" || s.type === "multi").findIndex(s => s.id === currentStep.id) + 1;
  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.bar}><div style={s.fill} /></div>
        <div style={s.body}>
          <div style={s.sec}>{currentStep.section}</div>
          <div style={{ fontSize: "11px", color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>{currentStep.label}</div>
          <h2 style={s.q}>{typeof currentStep.question === "function" ? currentStep.question(firstName) : currentStep.question}</h2>
          <p style={s.hint}>{currentStep.hint}</p>
          <textarea
            style={s.ta}
            placeholder={currentStep.placeholder}
            value={currentText}
            onChange={e => setCurrentText(e.target.value)}
            onFocus={e => e.target.style.borderColor = C.gold}
            onBlur={e => e.target.style.borderColor = C.border}
            autoFocus
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <span style={{ color: C.textDim, fontSize: "12px" }}>{currentText.length} chars</span>
            <span style={{ color: C.textDim, fontSize: "12px" }}>{qIndex} of {totalQ}</span>
          </div>
          <button style={s.btn(!canProceed())} onClick={canProceed() ? handleNext : undefined}>
            {currentStep.id === "q5" ? `Analyse My Messaging →` : `Continue →`}
          </button>
          {error && <p style={{ color: "#c0504a", fontSize: "13px", marginTop: "12px" }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
