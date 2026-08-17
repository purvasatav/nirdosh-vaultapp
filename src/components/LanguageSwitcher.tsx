import { useState, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES } from "../store/language";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: "50vh",
        right: "16px",
        zIndex: 9999,
      }}
    >
      {/* Language Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Choose language"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        <span role="img" aria-hidden="true">
          🌐
        </span>

        <span>{current?.label ?? "EN"}</span>
      </button>

      {/* Language Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "44px",
            right: 0,
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "8px",
            overflow: "hidden",
            minWidth: "140px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {LANGUAGES.map((l) => (
            <div
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                color: l.code === lang ? "#4ade80" : "#fff",
                background:
                  l.code === lang
                    ? "rgba(74,222,128,0.1)"
                    : "transparent",
                fontSize: "14px",
              }}
            >
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
