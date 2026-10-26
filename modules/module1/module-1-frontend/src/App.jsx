import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import './styles/globals.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Module 1 caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0d0f14',
          color: '#e8eaf2',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            background: '#141720',
            border: '1px solid #232840',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f87171', marginBottom: '8px' }}>
              Module 1 Rendering Notice
            </h2>
            <p style={{ fontSize: '13px', color: '#8892a8', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                style={{
                  padding: '8px 16px',
                  background: '#00d4ff',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#0d0f14',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Monitoring
              </button>
              <a
                href="/dashboard"
                style={{
                  padding: '8px 16px',
                  background: '#1c2030',
                  border: '1px solid #2e3555',
                  borderRadius: '4px',
                  color: '#e8eaf2',
                  fontSize: '13px',
                  textDecoration: 'none'
                }}
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/m1">
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
