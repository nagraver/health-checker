import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  const [target, setTarget] = useState("");
  const [checks, setChecks] = useState(["ping"]);
  const [taskId, setTaskId] = useState("");
  const [result, setResult] = useState(null);

  const toggleCheck = (check) => {
    setChecks((prev) =>
      prev.includes(check) ? prev.filter((c) => c !== check) : [...prev, check]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    const res = await fetch(`${API_URL}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, checks }),
    });
    const data = await res.json();
    setTaskId(data.id);

    // polling
    const interval = setInterval(async () => {
      const r = await fetch(`${API_URL}/result/${data.id}`);
      const d = await r.json();
      if (d.results && Object.keys(d.results).length > 0) {
        setResult(d);
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Health Checker</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="example.com"
          style={{ marginRight: "1rem" }}
        />
        <label>
          <input
            type="checkbox"
            checked={checks.includes("ping")}
            onChange={() => toggleCheck("ping")}
          />
          Ping
        </label>
        <label>
          <input
            type="checkbox"
            checked={checks.includes("http")}
            onChange={() => toggleCheck("http")}
          />
          HTTP
        </label>
        <label>
          <input
            type="checkbox"
            checked={checks.includes("dns")}
            onChange={() => toggleCheck("dns")}
          />
          DNS
        </label>
        <button type="submit">Проверить</button>
      </form>

      {taskId && <p>Задача: {taskId}</p>}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Результаты для {result.target}</h2>
          <pre>{JSON.stringify(result.results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
