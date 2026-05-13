import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            fontFamily: "Arial, sans-serif",
            background: "#fee",
            border: "2px solid #f00",
            margin: "20px",
            borderRadius: "8px",
          }}
        >
          <h1 style={{ color: "#d00" }}>🚨 Application Error</h1>
          <h2>Something went wrong in the React application.</h2>

          <details style={{ marginTop: "20px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
              Error Details (Click to expand)
            </summary>
            <div
              style={{
                background: "#f8f8f8",
                padding: "10px",
                marginTop: "10px",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
              }}
            >
              <strong>Error:</strong> {this.state.error?.toString()}
              <br />
              <br />
              <strong>Stack Trace:</strong>
              <br />
              {this.state.error?.stack}
              <br />
              <br />
              <strong>Component Stack:</strong>
              <br />
              {this.state.errorInfo?.componentStack}
            </div>
          </details>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#007cba",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
