import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div style={{
          padding: '20px',
          background: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h3 style={{ color: '#dc3545', marginBottom: '16px' }}>
            Something went wrong
          </h3>
          <p style={{ marginBottom: '16px' }}>
            The data table encountered an error. This might be due to data formatting issues.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null, resetKey: this.state.resetKey + 1 })}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ cursor: 'pointer', color: '#6c757d' }}>
                Error Details (Development)
              </summary>
              <pre style={{
                background: '#f8f8f8',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '8px'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // Use a key to force remount children after error recovery
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;
