export default function InternalPage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Internal Tools</h1>
      <p>This area is for developer-only utilities.</p>

      <ul style={{ marginTop: 16 }}>
        <li>
          <a href="/internal/analysis-engine">
            Analysis Engine (Internal)
          </a>
        </li>
      </ul>

      <hr style={{ margin: "16px 0" }} />

      <a href="/">← Back to Home</a>
    </main>
  );
}