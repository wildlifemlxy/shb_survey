import React, { Component } from 'react';

class QuickActionsPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isWwfVolunteer: false,
      isUploading: false,
      uploadFileName: '',
      isDragOver: false
    };
    this.dropZoneRef = React.createRef();
  }

  componentDidMount() {
    var {currentUser} = this.props;
    console.log('QuickActionsPanel mounted with props:', this.props);
  }

  componentDidUpdate(prevProps) {
    // Check if userRole prop changed
    if (prevProps.userRole !== this.props.userRole) {
      this.checkUserRole();
    }
  }

  checkUserRole = () => {
    // Check if user is WWF-Volunteer through props or localStorage
    try {
      const { userRole } = this.props;
      let role = userRole;
      
      // If no role in props, try localStorage
      if (!role) {
        role = localStorage.getItem('userRole');
      }
      
      // Set state based on role check
      const isWwfVolunteer = role === 'WWF-Volunteer';
      this.setState({ isWwfVolunteer });
      
      console.log('User role check in QuickActionsPanel:', { 
        role, 
        isWwfVolunteer,
        propsUserRole: this.props.userRole
      });
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: true });
  }

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });
  }

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Open upload modal with dropped files
      if (this.props.onOpenUploadModal) {
        this.props.onOpenUploadModal(files);
      }
    }
  }

  render() {
    const {
      showQuickActions,
      onToggleQuickActions,
      onBackup,
      onChatbot,
      onNewSurvey,
      onNewEvent,
      backupDisabled,
      backupTooltip,
      currentUser,
      currentPage,
      activeDashboardTab,
      activeEventsTab
    } = this.props;
    console.log('Rendering QuickActionsPanel with props:', currentUser.role);
    // Add this debug log to see exact role values
    console.log('Current user role type and value:', typeof currentUser.role, JSON.stringify(currentUser.role));
    return (
      <div style={{ 
        marginBottom: 16,
        position: 'relative',
        zIndex: 1,
        width: '100%'
      }}>
        <button
          onClick={onToggleQuickActions}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}
        >
          <span>🔧 Tools</span>
          <span>{showQuickActions ? '▼' : '▶'}</span>
        </button>
        {showQuickActions && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginBottom: 8,
              position: 'relative',
              width: '100%',
              maxWidth: '100%'
            }}>
              {/* Chatbot button - show on all pages (FIRST POSITION) */}
              <button
                onClick={() => {
                  // Call parent's chat toggle function
                  if (onChatbot && typeof onChatbot === 'function') {
                    onChatbot();
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0
                }}
                title="Click to chat with the SHB Survey Assistant!"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  Chatbot
                </span>
              </button>
              {/* Upload Image/Video button - show only on home page */}
              {currentPage === 'home' && (
                <button
                  onClick={() => {
                    // Open upload modal
                    if (this.props.onOpenUploadModal) {
                      this.props.onOpenUploadModal();
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    minHeight: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0
                  }}
                  title="Click to upload images or videos"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    Upload Media
                  </span>
                </button>
              )}
              {/* New Survey button - only show on dashboard data table tab */}
              {currentPage === 'dashboard' && activeDashboardTab === 'dataTable' && (
                <button
                onClick={() => {
                  // Call parent's new survey function
                  if (onNewSurvey && typeof onNewSurvey === 'function') {
                    onNewSurvey();
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0
                }}
                title="Create a new survey observation"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  New Survey
                </span>
              </button>
              )}
              {/* New Event button - only show on surveyEvents page and only on Upcoming tab (not Past) */}
              {currentPage === 'surveyEvents' && activeEventsTab === 'Upcoming' && (
                <button
                onClick={() => {
                  console.log('QuickActionsPanel: New Event button clicked');
                  // Call parent's new event function
                  if (onNewEvent && typeof onNewEvent === 'function') {
                    console.log('QuickActionsPanel: Calling onNewEvent function');
                    onNewEvent();
                  } else {
                    console.error('QuickActionsPanel: onNewEvent is not a function or is undefined', onNewEvent);
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  minHeight: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  lineHeight: '1.2',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0
                }}
                title="Create a new event"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  New Event
                </span>
              </button>
              )}
              {/* Backup button - only show on dashboard data table tab and for non-WWF-Volunteer users (LAST POSITION) */}
              {currentUser.role !== "WWF-Volunteer" && currentPage === 'dashboard' && activeDashboardTab === 'dataTable' && (
                <button
                  onClick={onBackup}
                  disabled={backupDisabled}
                  style={{
                    padding: '10px 16px',
                    background: backupDisabled ? '#9ca3af' : '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: backupDisabled ? 'not-allowed' : 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: backupDisabled ? 0.6 : 1,
                    minHeight: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    whiteSpace: 'nowrap',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0
                  }}
                  title={backupTooltip}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Backup
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default QuickActionsPanel;
