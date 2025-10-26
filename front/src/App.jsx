import { useEffect, useMemo, useState } from "react";

/**
 * Minimal React UI for Aeza health checker
 * - Lets user choose individual checks (5 total)
 * - Adds check "templates" (presets) like Full Status, Quick, Network Only, DNS Only, HTTP Only
 * - Calls FastAPI POST /check and then polls GET /result/{id}
 *
 * Env:
 *   VITE_API_URL (defaults to http://localhost:8000)
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const ALL_CHECKS = ["ping", "http", "tcp", "traceroute", "dns"];

const TEMPLATES = {
  custom: [],
  "Full SVAGA": ["ping", "http", "tcp", "traceroute", "dns"],
  "Quick check": ["ping", "http"],
  "Network only": ["ping", "tcp", "traceroute"],
  "DNS only": ["dns"],
  "HTTP only": ["http"],
};

export default function App() {
  const [target, setTarget] = useState("");
  const [selectedChecks, setSelectedChecks] = useState(["ping", "http"]);
  const [template, setTemplate] = useState("custom");

  const [submitting, setSubmitting] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const isTemplateExact = useMemo(() => {
    // Detect if current selection matches a template exactly
    const sel = [...selectedChecks].sort().join(",");
    for (const [name, checks] of Object.entries(TEMPLATES)) {
      if (name === "custom") continue;
      if (sel === [...checks].sort().join(",")) return name;
    }
    return "custom";
  }, [selectedChecks]);

  useEffect(() => {
    // Keep template dropdown in sync when user toggles checkboxes manually
    if (template !== isTemplateExact) setTemplate(isTemplateExact);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTemplateExact]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const resp = await fetch(`${API_URL}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, checks: selectedChecks }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setTaskId(data.id);
      // Start polling for the result (server stores for ~60s)
      await pollResult(data.id);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function pollResult(id) {
    const started = Date.now();
    while (Date.now() - started < 60000) {
      try {
        const r = await fetch(`${API_URL}/result/${id}`);
        const json = await r.json();
        // When result is ready, backend returns an object with actual check keys
        if (json && json.results && json.results.status !== "pending") {
          setResult(json);
          return;
        }
      } catch (_) {
        /* ignore transient errors */
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
    setError("Timeout: no result within 60s. Try again.");
  }

  function toggleCheck(name) {
    setSelectedChecks((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  function onTemplateChange(e) {
    const name = e.target.value;
    setTemplate(name);
    if (name === "custom") return; // keep current manual selection
    setSelectedChecks(TEMPLATES[name]);
  }

  function resetForm() {
    setTarget("");
    setSelectedChecks(["ping", "http"]);
    setTemplate("custom");
    setTaskId(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Aeza Health Checker</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Выберите цели и проверки. Шаблоны помогут быстро выставить нужный набор.
        </p>

        <form onSubmit={submit} className="space-y-4 bg-white p-4 rounded-2xl shadow">
          <div>
            <label className="block text-sm font-medium mb-1">Target (хост / URL)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="example.com или https://example.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Шаблон</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={template}
                onChange={onTemplateChange}
              >
                {Object.keys(TEMPLATES).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                Текущий набор: {selectedChecks.join(", ") || "—"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Проверки</label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {ALL_CHECKS.map((name) => (
                  <label key={name} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedChecks.includes(name)}
                      onChange={() => toggleCheck(name)}
                    />
                    <span className="capitalize">{name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
            >
              {submitting ? "Запуск…" : "Запустить проверку"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 rounded-lg border"
            >
              Сбросить
            </button>
            {taskId && (
              <span className="text-xs text-neutral-500">Task ID: {taskId}</span>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            Ошибка: {error}
          </div>
        )}

        {result && (
          <div className="mt-6 bg-white p-4 rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">Результат</h2>
            <ResultView result={result} />
          </div>
        )}

        {!result && submitting && (
          <div className="mt-6 text-sm text-neutral-600">Ожидание результата…</div>
        )}
      </div>
    </div>
  );
}

function ResultView({ result }) {
  const { results } = result;
  if (!results) return null;

  return (
    <div className="space-y-3">
      {Object.entries(results).map(([check, data]) => (
        <div key={check} className="border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-neutral-50 border-b font-medium capitalize">
            {check}
          </div>
          <div className="p-3 text-sm">
            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      ))}
    </div>
  );
}
