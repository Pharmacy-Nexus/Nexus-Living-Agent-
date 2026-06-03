import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const memoryPath = path.join(__dirname, "nexus-memory.json");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function defaultMemory() {
  return {
    agent_name: "Nexus",
    version: "0.4",
    cases_seen: 0,
    successful_patterns: [],
    danger_patterns: [],
    mistakes: [],
    learned_rules: [],
    user_corrections: [],
    experience_log: []
  };
}

function loadMemory() {
  try {
    if (!fs.existsSync(memoryPath)) {
      fs.writeFileSync(memoryPath, JSON.stringify(defaultMemory(), null, 2));
    }
    return JSON.parse(fs.readFileSync(memoryPath, "utf8"));
  } catch {
    return defaultMemory();
  }
}

function saveMemory(memory) {
  fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

function detectLocalRules(caseText) {
  const t = String(caseText || "").toLowerCase();
  const rules = [];

  if ((t.includes("warfarin") || t.includes("coumadin")) &&
      ["ibuprofen", "nsaid", "nsaids", "naproxen", "diclofenac", "brufen", "advil"].some(x => t.includes(x))) {
    rules.push({
      pattern: "warfarin + NSAID",
      severity: "high",
      risk: "Increased bleeding risk.",
      recommendation: "Avoid NSAIDs unless specifically approved by the prescriber. Consider safer analgesic options if appropriate."
    });
  }

  if (["hypertension", "hypertensive", "high blood pressure", "uncontrolled blood pressure"].some(x => t.includes(x)) &&
      t.includes("pseudoephedrine")) {
    rules.push({
      pattern: "hypertension + pseudoephedrine",
      severity: "moderate",
      risk: "Pseudoephedrine may worsen blood pressure control.",
      recommendation: "Avoid or use caution in uncontrolled hypertension. Ask for current BP and cardiovascular history."
    });
  }

  if (["ramipril", "lisinopril", "enalapril", "captopril", "ace inhibitor"].some(x => t.includes(x)) &&
      ["potassium", "kcl"].some(x => t.includes(x))) {
    rules.push({
      pattern: "ACE inhibitor + potassium",
      severity: "high",
      risk: "Increased hyperkalemia risk, especially with renal impairment.",
      recommendation: "Do not recommend potassium supplementation without checking serum potassium and renal function."
    });
  }

  if (["diabetes", "diabetic"].some(x => t.includes(x)) &&
      ["cough syrup", "syrup", "sugar"].some(x => t.includes(x))) {
    rules.push({
      pattern: "diabetes + sugary syrup",
      severity: "moderate",
      risk: "Sugar-containing liquid preparations may affect glucose control.",
      recommendation: "Check formulation and prefer sugar-free options when suitable."
    });
  }

  if (["child", "children", "pediatric", "paediatric"].some(x => t.includes(x)) &&
      ["fever", "viral", "flu", "chickenpox"].some(x => t.includes(x)) &&
      t.includes("aspirin")) {
    rules.push({
      pattern: "child/viral illness + aspirin",
      severity: "high",
      risk: "Aspirin is generally avoided in children/viral illness due to Reye syndrome risk.",
      recommendation: "Use age/weight-appropriate alternatives according to local guidance and assess red flags."
    });
  }

  return rules;
}

function memoryMatches(memory, caseText) {
  const t = String(caseText || "").toLowerCase();
  const all = [
    ...(memory.danger_patterns || []),
    ...(memory.learned_rules || []),
    ...(memory.successful_patterns || [])
  ];

  return all.filter(item => {
    const words = String(item.pattern || item.lesson || "")
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3);
    return words.some(w => t.includes(w));
  }).slice(0, 5);
}

function systemPrompt() {
  return `
You are Nexus Living Agent v0.4, a digital pharmacy cognitive organism prototype.

You are not a normal chatbot. You are an AI-powered agent with:
- identity
- memory
- local pharmacy rules
- source-based reasoning behavior
- experience learning from user feedback

Your task:
1. Analyze pharmacy cases.
2. Extract drugs, diseases, patient factors, risks, and missing information.
3. Detect interactions, contraindications, precautions, red flags, and counseling points.
4. Use provided local rules and memory if relevant.
5. Never invent medical facts.
6. Separate known knowledge from assumptions.
7. Ask follow-up questions when patient data is incomplete.
8. Provide safe educational pharmacy reasoning, not a replacement for professional clinical judgment.

Return ONLY valid JSON. No markdown. No extra text.

JSON schema:
{
  "detected_drugs": [],
  "patient_factors": [],
  "risk_patterns": [
    {
      "pattern": "",
      "risk": "",
      "severity": "low|moderate|high",
      "reason": ""
    }
  ],
  "missing_information": [],
  "decision": "",
  "safer_alternatives": [],
  "counseling": [],
  "follow_up_questions": [],
  "confidence": 0,
  "memory_lesson": "",
  "safety_note": ""
}

Confidence rules:
- Do not give confidence above 80 if important patient information is missing.
- Do not give confidence above 70 if the answer needs source verification or the case is vague.
- Lower confidence when dose, age, pregnancy/lactation status, renal/hepatic status, allergy history, or key monitoring data are missing.
`;
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    agent: "Nexus Living Agent",
    version: "0.4",
    model: MODEL,
    has_key: Boolean(process.env.GROQ_API_KEY)
  });
});

app.get("/api/memory", (req, res) => {
  res.json(loadMemory());
});

app.post("/api/reset-memory", (req, res) => {
  const memory = defaultMemory();
  saveMemory(memory);
  res.json(memory);
});

app.post("/api/think", async (req, res) => {
  try {
    const { caseText } = req.body;
    if (!caseText || !caseText.trim()) {
      return res.status(400).json({ error: "caseText is required" });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes("put_your")) {
      return res.status(500).json({
        error: "Missing GROQ_API_KEY. Add it in Render Environment Variables or local .env."
      });
    }

    const memory = loadMemory();
    const localRules = detectLocalRules(caseText);
    const matches = memoryMatches(memory, caseText);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_completion_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt() },
        {
          role: "user",
          content: JSON.stringify({
            case_text: caseText,
            local_rules_matched: localRules,
            memory_matches: matches,
            instruction: "Analyze the case safely. Return valid JSON only."
          }, null, 2)
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      analysis = {
        detected_drugs: [],
        patient_factors: [],
        risk_patterns: [],
        missing_information: [],
        decision: "The model response could not be parsed as JSON. Review manually.",
        safer_alternatives: [],
        counseling: [],
        follow_up_questions: [],
        confidence: 0,
        memory_lesson: "",
        safety_note: "Parsing error.",
        raw_response: raw
      };
    }

    memory.cases_seen += 1;
    memory.experience_log.unshift({
      at: new Date().toISOString(),
      type: "thinking",
      case: caseText.slice(0, 280),
      confidence: analysis.confidence ?? null,
      model: MODEL,
      local_rules: localRules.map(r => r.pattern)
    });

    saveMemory(memory);

    res.json({
      analysis,
      localRules,
      memoryMatches: matches,
      memory
    });

  } catch (err) {
    res.status(500).json({
      error: "Nexus/Groq request failed",
      details: err.message
    });
  }
});

app.post("/api/learn", (req, res) => {
  const { caseText, rating, correction, analysis } = req.body;
  if (!caseText || !rating) {
    return res.status(400).json({ error: "caseText and rating are required" });
  }

  const memory = loadMemory();

  const pattern =
    analysis?.risk_patterns?.[0]?.pattern ||
    analysis?.detected_drugs?.join(" + ") ||
    "general pharmacy case";

  const lesson =
    correction ||
    analysis?.memory_lesson ||
    (rating === "safe"
      ? "This reasoning was marked safe/correct."
      : rating === "partial"
        ? "This reasoning was partially correct and needs more complete patient-specific details."
        : "This reasoning was unsafe/wrong and must be corrected before reuse.");

  const record = {
    at: new Date().toISOString(),
    case: caseText,
    rating,
    pattern,
    lesson,
    decision: analysis?.decision || "",
    confidence: analysis?.confidence ?? null
  };

  if (rating === "safe") memory.successful_patterns.push(record);
  if (rating === "partial") memory.learned_rules.push(record);
  if (rating === "unsafe") {
    memory.mistakes.push(record);
    memory.danger_patterns.push(record);
  }

  if (correction) {
    memory.user_corrections.push(record);
    if (rating !== "partial") memory.learned_rules.push(record);
  }

  memory.experience_log.unshift({
    at: new Date().toISOString(),
    type: "learning",
    case: caseText.slice(0, 280),
    rating,
    pattern,
    lesson
  });

  saveMemory(memory);
  res.json({ ok: true, record, memory });
});

app.listen(PORT, () => {
  console.log("");
  console.log("====================================");
  console.log("Nexus Living Agent v0.4 is running");
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log("====================================");
  console.log("");
});
