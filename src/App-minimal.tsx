function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Exam Portal - Test</h1>
      <p>If you can see this, React is working!</p>
      <div
        style={{ background: "#f0f0f0", padding: "10px", marginTop: "20px" }}
      >
        <h2>Debug Info:</h2>
        <p>Environment: {import.meta.env.MODE}</p>
        <p>Base URL: {import.meta.env.BASE_URL}</p>
        <p>Timestamp: {new Date().toISOString()}</p>
      </div>
    </div>
  );
}

export default App;
