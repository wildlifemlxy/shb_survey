import React, { Component } from 'react';
import LoginPopup from './LoginPopup';
import { withAuth } from './AuthContext.jsx';

class LoginContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoginOpen: false
    };
  }

  handleOpenLogin = () => {
    this.setState({ isLoginOpen: true });
  };

  handleCloseLogin = () => {
    this.setState({ isLoginOpen: false });
  };

  handleLogin = (userData) => {
    console.log('Login successful, user data:', userData);
    this.props.auth.login(userData);
    this.handleCloseLogin();
  };

  render() {
    const { isLoginOpen } = this.state;
    const { isAuthenticated, logout } = this.props.auth;

    return (
      <>
        {isAuthenticated ? (
          <button 
            onClick={logout}
            className="auth-button logout-button"
          >
            Sign Out
          </button>
        ) : (
          <button 
            onClick={this.handleOpenLogin}
            className="auth-button login-button"
          >
            Sign In
          </button>
        )}
        
        <LoginPopup 
          isOpen={isLoginOpen} 
          onClose={this.handleCloseLogin}
          onLoginSuccess={this.handleLogin}
        />
      </>
    );
  }
}

export default withAuth(LoginContainer);
