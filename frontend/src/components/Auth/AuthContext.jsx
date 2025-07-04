import React, { Component, createContext } from 'react';

// Create a context for authentication
const AuthContext = createContext();

// Provider component as a class component
export class AuthProvider extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      currentUser: null,
      loading: true,
      isAuthenticated: false
    };
    
    // Bind methods
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
  }
  
  componentDidMount() {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        this.setState({ 
          currentUser: parsedUser,
          isAuthenticated: true
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user');
      }
    }
    this.setState({ loading: false });
  }
  
  // Sign in function that updates state and localStorage
  login(userData) {
    this.setState({ 
      currentUser: userData,
      isAuthenticated: true
    });
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    
    // If userData contains role information, store it separately
    if (userData && userData.role) {
      localStorage.setItem('userRole', userData.role);
    }
  }
  
  // Sign out function that clears state and localStorage
  logout() {
    this.setState({ 
      currentUser: null,
      isAuthenticated: false
    });
    localStorage.clear(); // Clear all auth-related data
  }
  
  render() {
    const { loading } = this.state;
    
    // Context value with state and methods
    const value = {
      currentUser: this.state.currentUser,
      isAuthenticated: this.state.isAuthenticated,
      login: this.login,
      logout: this.logout,
      loading: this.state.loading
    };
    
    return (
      <AuthContext.Provider value={value}>
        {!loading && this.props.children}
      </AuthContext.Provider>
    );
  }
}

// Context consumer as a HOC (Higher Order Component)
export function withAuth(Component) {
  return function WrappedComponent(props) {
    return (
      <AuthContext.Consumer>
        {authContext => <Component {...props} auth={authContext} />}
      </AuthContext.Consumer>
    );
  };
}

// For direct context usage
export { AuthContext };
