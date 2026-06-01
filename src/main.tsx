import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h2 style={{ color: '#cf1322' }}>Erreur de rendu</h2>
          <pre style={{ background: '#fff1f0', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
          <pre style={{ background: '#f6f6f6', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {this.state.error.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px' }}>
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
