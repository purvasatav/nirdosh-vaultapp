const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("GEMINI_API_KEY not set."); process.exit(1); }

const MODEL = "gemini-3.5-flash-lite";

const baseStrings = {
  nav_home: "Home",
  nav_dashboard: "Dashboard",
  nav_upload_docs: "Upload Docs",
  nav_report: "Report",
  nav_schemes: "Schemes",
  nav_centres: "Centres",
  nav_settings: "Settings",
  auth_login: "Log In",
  auth_sign_in: "Sign In",
  auth_signup: "Sign Up",
  auth_logout: "Sign Out",
  btn_save: "Save",
  btn_cancel: "Cancel",
  btn_continue: "Continue",
  btn_back: "Back",
  settings_language: "Language",
  settings_dark_mode: "Dark Mode",
  landing_badge: "Pre-Submission Identity Consistency Check",
  landing_hero_title: "Catch document conflicts before they become application problems.",
  landing_hero_desc: "Nirdosh Vault compares identity fields across multiple uploaded documents, explains conflicting evidence, and guides you to an appropriate correction path before official submission.",
  landing_cta: "Check My Documents",
  landing_trust_1: "Zero server retention (In-memory only)",
  landing_trust_2: "DPDP Act Aligned",
  landing_trust_3: "Consensus Engine (No AI guesswork)",
};

const LANGS = [
  { code: "hi", name: "Hindi" }, { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" }, { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" }, { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
];

async function translateBatch(lang) {
  const prompt = `Translate this JSON object's values into natural, everyday ${lang.name} as used in a government-services app UI. Return ONLY valid JSON, same keys, translated values, no markdown fences, no explanation:\n${JSON.stringify(baseStrings, null, 2)}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0,300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text: " + JSON.stringify(data).slice(0,300));
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

(async () => {
  const result = { en: baseStrings };
  for (const lang of LANGS) {
    process.stdout.write(`Translating -> ${lang.name}... `);
    try { result[lang.code] = await translateBatch(lang); console.log("done"); }
    catch (err) { console.log("FAILED: " + err.message); result[lang.code] = baseStrings; }
  }
  const outPath = path.join("src", "i18n", "translations.ts");
  fs.writeFileSync(outPath,
    "// Auto-generated via Gemini API. Regenerate with: node scripts/gen-translations.js\n" +
    "export const translations = " + JSON.stringify(result, null, 2) + " as const;\n", "utf8");
  console.log(`\nWrote ${outPath}`);
})();
