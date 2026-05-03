function App() {
  console.log("App component rendering...");

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.1)",
          padding: "40px",
          borderRadius: "10px",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
          🎓 Exam Portal
        </h1>
        <p style={{ fontSize: "1.2rem", marginBottom: "30px" }}>
          ✅ React is working correctly!
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "30px",
          }}
        >
          <h2 style={{ marginBottom: "15px" }}>🔧 Debug Information:</h2>
          <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
            <p>• Environment: {import.meta.env.MODE}</p>
            <p>• Base URL: {import.meta.env.BASE_URL}</p>
            <p>• Timestamp: {new Date().toISOString()}</p>
            <p>• User Agent: {navigator.userAgent.substring(0, 50)}...</p>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,255,0,0.2)",
            padding: "20px",
            borderRadius: "8px",
            marginTop: "20px",
            border: "2px solid rgba(0,255,0,0.5)",
          }}
        >
          <h3>✅ Deployment Status: SUCCESS</h3>
          <p>The React application is loading and rendering correctly.</p>
          <p>Ready to restore full application...</p>
        </div>
      </div>
    </div>
  );
}

export default App;
