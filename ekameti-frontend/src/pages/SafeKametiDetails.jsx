import React, { useEffect, useState } from 'react';
import KametiDetails from './KametiDetails';
import { useParams } from 'react-router-dom';

const SafeKametiDetails = () => {
  const { id } = useParams();
  const [error, setError] = useState(false);

  // directly render KametiDetails without suspense
  return (
    <ErrorBoundary fallback={<p>Something went wrong in KametiDetails.</p>} onError={() => setError(true)}>
      <KametiDetails />
    </ErrorBoundary>
  );
};

// Minimal Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    if (this.props.onError) this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <p>Error occurred.</p>;
    }
    return this.props.children;
  }
}

export default SafeKametiDetails;
