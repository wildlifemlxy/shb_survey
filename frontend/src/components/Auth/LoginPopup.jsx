import React, { Component } from 'react';
import './LoginPopupUpdated.css'; // Import the updated styles
import { fetchLoginData } from '../../data/loginData';
// Note: Since we're using a class component, we can't directly use the useAuth hook
// We'll pass the login function as a prop from a parent component that uses the hook

class LoginPopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      isLoading: false,
      error: ''
    };
  }

  componentDidMount() {
    console.log('LoginPopup mounted with props:', this.props);
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: '' });
  };

  clearForm = () => {
    this.setState({
      email: '',
      password: '',
      error: ''
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = this.state;
    
    if (!email || !password) {
      this.setState({ error: 'Please enter both email and password' });
      return;
    }
    
    try {
      this.setState({ isLoading: true, error: '' });
      
      const result = await fetchLoginData(email, password);
      console.log('Login result:', result);
       if (result.success) 
      {
        this.clearForm();
        this.props.onClose();
        // Store user data in localStorage
        //localStorage.setItem('user', JSON.stringify(result.data));
        //localStorage.setItem('isAuthenticated', 'true');
        // Pass the user data to the success callback
        this.props.onLoginSuccess(result.data);
      }else {
        this.setState({ 
          error: result?.message || 'Invalid email or password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setState({ 
        error: 'An error occurred during login. Please try again later.' 
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      this.clearForm();
      this.props.onClose();
    }
  };

  render() {
    const { email, password, isLoading, error } = this.state;
    const { isOpen } = this.props;

    if (!isOpen) return null;

    return (
      <div className="login-popup-overlay" onClick={this.handleOverlayClick}>
        <div className="login-card">
          <button className="login-close-button" onClick={this.props.onClose}>
            x
          </button>
          
          <div className="login-header">
            <img src="/shb.png" alt="SHB Logo" className="login-logo" />
            <h1>SHB Survey System</h1>
            <p>Please sign in to continue</p>
          </div>
          
          <form className="login-form" onSubmit={this.handleSubmit}>
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="text"
                id="email"
                name="email"
                value={email}
                onChange={this.handleInputChange}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container" style={{ position: 'relative' }}>
                <input
                  type={this.state.showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={this.handleInputChange}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  style={{width: '100%'}}
                />
                <button
                  type="button"
                  onClick={() => this.setState(prevState => ({ showPassword: !prevState.showPassword }))}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#555',
                  }}
                >
                  {this.state.showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="login-button-group">
              <button 
                type="button" 
                className="login-button"
                style={{
                  background: '#22c55e', // Green color
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
                }}
                onClick={this.clearForm}
                disabled={isLoading}
              >
                Clear
              </button>
              
              <button 
                type="submit" 
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)', // Blue gradient
                  boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)'
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default LoginPopup;
