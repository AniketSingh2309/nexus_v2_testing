import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, fontFamily: 'system-ui, sans-serif',
          background: '#fff8f8', minHeight: '100vh',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 12 }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginBottom: 20, lineHeight: 1.6 }}>
              The billing tool encountered an error. Try refreshing the page.
            </div>
            <pre style={{
              background: '#f8faff', border: '1px solid #e2e8f5',
              borderRadius: 8, padding: 16, fontSize: 11,
              color: '#ef4444', overflowX: 'auto', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20, padding: '10px 24px', background: '#2563eb',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
