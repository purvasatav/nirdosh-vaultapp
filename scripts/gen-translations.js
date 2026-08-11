const fs = require("fs");
const path = require("path");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY not set. Run setx GEMINI_API_KEY \"your-key\" and reopen PowerShell.");
  process.exit(1);
}

// Base English strings — the source of truth for every key your app uses.
const baseStrings = {
  nav_home: "Home",
  nav_settings: "Settings",
  auth_login: "Log In",
  auth_signup: "Sign Up",
  // add every UI string your app actually needs here
};

const LANGS = [
  { code: "hi", name: "Hindi" },
  { code: "mr", name: "Marathi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
];

async function translateBatch(lang) {
  const prompt = `Translate this JSON object's values into ${lang.name}. Return ONLY valid JSON, same keys, translated values, no markdown fences, no explanation:\n${JSON.stringify(baseStrings, null, 2)}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

(async () => {
  const result = { en: baseStrings };

  for (const lang of LANGS) {
    console.log(`Translating -> ${lang.name}...`);
    try {
      result[lang.code] = await translateBatch(lang);
    } catch (err) {
      console.error(`Failed for ${lang.code}:`, err.message);
      result[lang.code] = baseStrings; // fallback so build doesn't break
    }
  }

  const outPath = path.join("src", "i18n", "translations.ts");
  const fileContent =
    "// Auto-generated via Gemini API. Regenerate with: node scripts/gen-translations.js\n" +
    "export const translations = " +
    JSON.stringify(result, null, 2) +
    " as const;\n";

  fs.writeFileSync(outPath, fileContent, "utf8");
  console.log(`Wrote ${outPath}`);
})();
