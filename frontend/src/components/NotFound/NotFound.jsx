import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import '../../css/components/NotFound/NotFound.css';

class NotFound extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countdown: 5,
      shouldRedirect: false
    };
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState(prevState => {
        if (prevState.countdown <= 1) {
          clearInterval(this.timer);
          return { countdown: 0, shouldRedirect: true };
        }
        return { countdown: prevState.countdown - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  render() {
    const { countdown, shouldRedirect } = this.state;

    if (shouldRedirect) {
      return <Navigate to="/" replace />;
    }

    return (
      <div className="not-found-container">
        <div className="not-found-content">
          <h1 className="not-found-title">404</h1>
          <h2 className="not-found-subtitle">Page Not Found</h2>
          <p className="not-found-description">
            You will be redirected back to the home page in {countdown} seconds.
          </p>
        </div>
      </div>
    );
  }
}

export default NotFound;
