import React, { Component } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { fetchGalleryDataPublic } from '../../data/shbData';
import tokenService from '../../utils/tokenService';
import './Gallery.css';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

class Gallery extends Component {
  constructor(props) {
    super(props);
    this.state = {
      galleryData: [],
      galleryFilter: 'all',
      fullscreenMedia: null,
      isLoading: true,
      approvalMode: false,
      manageMode: false
    };
  }

  componentDidMount() {
    this.loadGalleryData();
    
    // Initialize socket connection
    this.socket = io(BASE_URL);
    this.socket.on('survey-updated', (data) => {
      this.loadGalleryData();
      console.log("Socket event received", data);
    });
  }

  componentWillUnmount() {
    // Clean up socket connection
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  loadGalleryData = async () => {
    try {
      this.setState({ isLoading: true });
      const data = await fetchGalleryDataPublic();
      this.setState({ 
        galleryData: data || [],
        isLoading: false 
      });
    } catch (error) {
      console.error('Error loading gallery data:', error);
      this.setState({ 
        galleryData: [],
        isLoading: false 
      });
    }
  };

  setGalleryFilter = (filter) => {
    this.setState({ galleryFilter: filter });
  };

  openFullscreen = (media) => {
    this.setState({ fullscreenMedia: media });
  };

  closeFullscreen = () => {
    this.setState({ fullscreenMedia: null });
  };

  toggleUploadPopup = () => {
    if (this.props.onToggleUpload) {
      this.props.onToggleUpload();
    }
  };

  toggleApprovalMode = () => {
    this.setState(prevState => ({
      approvalMode: !prevState.approvalMode
    }));
  };

  toggleManageMode = () => {
    this.setState(prevState => ({
      manageMode: !prevState.manageMode
    }));
  };

  approveMedia = async (media, index) => {
    try {
      console.log('Approving media:', media);
      
      // Check if user is authenticated
      if (!tokenService.isTokenValid()) {
        alert('Authentication required for media approval');
        return;
      }
      
      // Encrypt the request data
      const requestData = await tokenService.encryptData({
        mediaId: media.id,
        url: media.url,
        type: media.type,
        location: media.location,
        uploadedBy: media.uploadedBy,
        purpose: 'approve'
      });
      
      // Make authenticated request
      const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/gallery`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        alert(`Media "${media.name || 'Untitled'}" has been approved and is now visible in the gallery!`);
        
        // Update local state to mark as approved
        this.setState(prevState => ({
          galleryData: prevState.galleryData.map((item, i) => 
            i === index ? { ...item, approved: true, approvalStatus: 'approved' } : item
          )
        }));
      } else {
        throw new Error('Failed to approve media');
      }
    } catch (error) {
      console.error('Error approving media:', error);
      alert('Failed to approve media. Please try again.');
    }
  };

  deleteMedia = async (media, index) => {
    try {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${media.name || 'this media'}"?`);
      if (!confirmDelete) return;
      
      console.log('Deleting media:', media);
      
      // Check if user is authenticated
      if (!tokenService.isTokenValid()) {
        alert('Authentication required for media deletion');
        return;
      }
      
      // Encrypt the request data
      const requestData = await tokenService.encryptData({
        mediaId: media.id,
        url: media.url,
        filename: media.filename || media.name,
        type: media.type,
        location: media.location,
        uploadedBy: media.uploadedBy,
        purpose: 'delete'
      });
      
      // Make authenticated request
      const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/gallery`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        alert(`Media "${media.name || 'Untitled'}" has been deleted!`);
        
        // Remove from local state
        this.setState(prevState => ({
          galleryData: prevState.galleryData.filter((_, i) => i !== index)
        }));
      } else {
        throw new Error('Failed to delete media');
      }
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Failed to delete media. Please try again.');
    }
  };

  toggleMediaVisibility = (media, index) => {
    // Toggle show/hide for the media item
    this.setState(prevState => ({
      galleryData: prevState.galleryData.map((item, i) => 
        i === index ? { ...item, isHidden: !item.isHidden } : item
      )
    }));
    
    const action = media.isHidden ? 'shown' : 'hidden';
    alert(`Media "${media.name || 'Untitled'}" is now ${action}!`);
  };

  rejectMedia = async (media, index) => {
    try {
      const reason = prompt('Please provide a reason for rejection (optional):');
      const confirmReject = window.confirm(`Are you sure you want to reject and delete "${media.name || 'this media'}"? This action cannot be undone.`);
      if (!confirmReject) return;
      
      console.log('Rejecting and deleting media:', media, 'Reason:', reason);
      
      // Check if user is authenticated
      if (!tokenService.isTokenValid()) {
        alert('Authentication required for media rejection');
        return;
      }
      
      // Encrypt the request data
      const requestData = await tokenService.encryptData({
        mediaId: media.id,
        url: media.url,
        filename: media.filename || media.name,
        type: media.type,
        location: media.location,
        uploadedBy: media.uploadedBy,
        reason: reason,
        purpose: 'reject'
      });
      
      // Make authenticated request
      const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/gallery`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        alert(`Media "${media.name || 'Untitled'}" has been rejected and deleted.`);
        
        // Remove from local state
        this.setState(prevState => ({
          galleryData: prevState.galleryData.filter((_, i) => i !== index)
        }));
      } else {
        throw new Error('Failed to reject media');
      }
    } catch (error) {
      console.error('Error rejecting media:', error);
      alert('Failed to reject media. Please try again.');
    }
  };

  render() {
    const { galleryData, galleryFilter, fullscreenMedia, isLoading, approvalMode, manageMode } = this.state;
    const { isAuthenticated, isWWFVolunteer } = this.props;

    // Filter gallery data based on current filter
    const filteredGalleryData = galleryFilter === 'all' 
      ? galleryData 
      : galleryData.filter(item => {
          if (galleryFilter === 'pictures') {
            return item.type && item.type.startsWith('image/');
          } else if (galleryFilter === 'videos') {
            return item.type && item.type.startsWith('video/');
          }
          return true;
        });

    // Filter out unapproved WWF volunteer submissions from public view
    // Only show approved content or content from non-WWF users
    const publicGalleryData = filteredGalleryData.filter(item => {
      // If user is in approval mode (non-WWF admin), show all submissions for review
      if (!isWWFVolunteer && approvalMode) {
        return true;
      }
      
      // For public gallery view, only show:
      // 1. Content that is explicitly approved (approved: true)
      // 2. Content from non-WWF volunteers (no approval needed)
      // 3. Hide content that is pending approval or rejected
      if (item.uploadedBy && item.uploadedBy.role === 'WWF-Volunteer') {
        return item.approved === true;
      }
      
      // Show all non-WWF volunteer content
      return true;
    });

    return (
      <div className="gallery-container">
        <section className="studio-gallery-section" style={{
          padding: '80px 0',
          background: 'linear-gradient(to bottom, #e6e6fa 0%, #f5f5ff 100%)',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div className="studio-container" style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 2rem'
          }}>
            <div className="studio-header" style={{
              textAlign: 'center',
              marginBottom: '60px',
              position: 'relative'
            }}>
              {/* Upload Button - Available for all authenticated users */}
              {isAuthenticated && !approvalMode && !manageMode && (
                <button
                  onClick={this.toggleUploadPopup}
                  className="btn btn-primary"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: !isWWFVolunteer ? '120px' : '0px',
                    margin: '0 0 0 0',
                    zIndex: 2,
                    padding: '0.7rem 2.2rem',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.08)',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: '#fff',
                    border: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >{!isWWFVolunteer ? 'Upload' : 'Submit for Approval'}</button>
              )}
              
              {/* Approve Button for Non-WWF Volunteers */}
              {isAuthenticated && !isWWFVolunteer && !manageMode && (
                <button
                  onClick={this.toggleApprovalMode}
                  className="btn btn-approve"
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    margin: '0 0 0 0',
                    zIndex: 2,
                    padding: '0.7rem 2.2rem',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: '24px',
                    boxShadow: '0 2px 8px rgba(34,197,94,0.08)',
                    background: approvalMode 
                      ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                      : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >{approvalMode ? 'Exit Approval' : 'Approve'}</button>
              )}

              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                color: '#ffffff',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                letterSpacing: '0.5px'
              }}>
                CONSERVATION GALLERY
              </div>

              <h2 style={{
                fontSize: '3rem',
                fontWeight: '800',
                color: '#1e293b',
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
              }}>Collection</h2>

              <p style={{
                fontSize: '1.2rem',
                color: '#64748b',
                maxWidth: '600px',
                margin: '0 auto 2rem auto',
                lineHeight: '1.6'
              }}>A curated showcase of wildlife photography and videography. 
              {isWWFVolunteer && isAuthenticated && (
                <span style={{ color: '#f59e0b', fontWeight: '600' }}> WWF submissions require approval and won't be visible until approved.</span>
              )}
              </p>

              {/* Protected Content Notice */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '500',
                marginBottom: '2rem',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,17.4 15.4,18 14.8,18H9.2C8.6,18 8,17.4 8,16V13C8,12.4 8.6,11.5 9.2,11.5V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.5,8.7 10.5,10V11.5H13.5V10C13.5,8.7 12.8,8.2 12,8.2Z"/>
                </svg>
                Protected Content - Screenshots & Downloads Disabled
              </div>

              {/* Approval Mode Notice - Only show for Non-WWF Volunteers in approval mode */}
              {!isWWFVolunteer && approvalMode && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#059669',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '2rem',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                  </svg>
                  Approval Mode Active - Review and approve/reject WWF submissions
                </div>
              )}

              {/* Filter Buttons */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => this.setGalleryFilter('all')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: galleryFilter === 'all' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#f8fafc',
                    color: galleryFilter === 'all' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: galleryFilter === 'all' ? '#3b82f6' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (galleryFilter !== 'all') {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (galleryFilter !== 'all') {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => this.setGalleryFilter('pictures')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: galleryFilter === 'pictures' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                    color: galleryFilter === 'pictures' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: galleryFilter === 'pictures' ? '#10b981' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (galleryFilter !== 'pictures') {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (galleryFilter !== 'pictures') {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                >
                  Pictures
                </button>
                <button
                  onClick={() => this.setGalleryFilter('videos')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: galleryFilter === 'videos' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#f8fafc',
                    color: galleryFilter === 'videos' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: galleryFilter === 'videos' ? '#8b5cf6' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (galleryFilter !== 'videos') {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (galleryFilter !== 'videos') {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                >
                  Videos
                </button>
              </div>

              {/* Gallery Grid */}
              <div className="studio-gallery-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '0.5rem',
                marginBottom: '3rem',
                padding: '0 1rem'
              }}>
                {isLoading ? (
                  // Loading state
                  Array.from({length: 6}).map((_, index) => (
                    <div key={index} style={{
                      background: '#f1f5f9',
                      borderRadius: '12px',
                      height: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b'
                    }}>
                      Loading...
                    </div>
                  ))
                ) : publicGalleryData.length > 0 ? (
                  publicGalleryData.map((item, index) => (
                    <div
                      key={index}
                      className="gallery-card"
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        position: 'relative',
                        height: '280px'
                      }}
                      onClick={() => this.openFullscreen(item)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {item.type && item.type.startsWith('video/') ? (
                        <video
                          src={item.url}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt="Gallery item"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                      
                      {/* Approval Status Indicator - Only show for Non-WWF Volunteers in approval mode and for WWF-Volunteer submissions */}
                      {!isWWFVolunteer && approvalMode && item.uploadedBy && item.uploadedBy.role === 'WWF-Volunteer' && (
                        <div className="approval-status-badge" style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: item.approvalStatus === 'submitted' 
                            ? 'rgba(16, 185, 129, 0.9)' 
                            : item.approved === false 
                            ? 'rgba(239, 68, 68, 0.9)' 
                            : 'rgba(245, 158, 11, 0.9)',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          opacity: '0',
                          transform: 'translateY(-4px)',
                          transition: 'all 0.3s ease'
                        }}>
                          {item.approvalStatus === 'submitted' 
                            ? '✓ Submitted' 
                            : item.approved === false 
                            ? '✗ Rejected' 
                            : '⏳ Pending'}
                        </div>
                      )}

                      {/* Visibility Status - Only show for WWF volunteers in manage mode */}
                      {isWWFVolunteer && manageMode && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: item.isHidden 
                            ? 'rgba(107, 114, 128, 0.9)' 
                            : 'rgba(34, 197, 94, 0.9)',
                          color: '#ffffff',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {item.isHidden ? '👁️‍🗨️ Hidden' : '👁️ Visible'}
                        </div>
                      )}

                      {/* Location badge if available */}
                      {item.location && (
                        <div className="location-badge" style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '8px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          color: '#1e293b',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          backdropFilter: 'blur(4px)'
                        }}>
                          📍 {item.location}
                        </div>
                      )}

                      {/* Approval Controls - Only show for Non-WWF Volunteers in approval mode and for WWF-Volunteer submissions */}
                      {!isWWFVolunteer && approvalMode && item.uploadedBy && item.uploadedBy.role === 'WWF-Volunteer' && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          display: 'flex',
                          gap: '4px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              this.approveMedia(item, index);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              this.rejectMedia(item, index);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                            }}
                          >
                            ✗ Reject
                          </button>
                        </div>
                      )}

                      {/* Delete Button - Show only for authenticated non-WWF Volunteers */}
                      {isAuthenticated && !isWWFVolunteer && !approvalMode && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          display: 'flex',
                          gap: '4px'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              this.deleteMedia(item, index);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '20px',
                              padding: '6px 12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              opacity: '0',
                              transform: 'translateY(4px)',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}


                    </div>
                  ))
                ) : (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '3rem',
                    color: '#64748b'
                  }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style={{marginBottom: '1rem'}}>
                      <path d="M21,17H7V3A1,1 0 0,1 8,2H20A1,1 0 0,1 21,3V17M19,4H9V15H19V4M4,6H2V20A1,1 0 0,0 3,21H17V19H4V6M11.5,11.5L13.5,14L16.5,10.5L20,15H8L11.5,11.5Z"/>
                    </svg>
                    <p style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>No media found</p>
                    <p style={{fontSize: '0.9rem'}}>
                      {galleryFilter === 'all' ? 'No content available in the gallery.' : `No ${galleryFilter} available.`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Popup Modal */}
        {fullscreenMedia && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(30,41,59,0.12)',
            }}
            onClick={this.closeFullscreen}
          >
            <div
              id="gallery-popup-media"
              style={{
                position: 'relative',
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px 0 rgba(30,41,59,0.18)',
                padding: 0,
                maxWidth: fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? 640 : 520,
                width: '90vw',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={this.closeFullscreen}
                style={{
                  position: 'absolute',
                  top: -32,
                  right: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '2.2rem',
                  color: '#222',
                  cursor: 'pointer',
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  lineHeight: '40px',
                  textAlign: 'center',
                  boxShadow: 'none',
                  borderRadius: 0,
                  padding: 0,
                }}
                aria-label="Close"
              >×</button>

              {/* WWF logo */}
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 10px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src="/WWF Logo/WWF Logo Large.jpg"
                  alt="WWF Logo"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 0,
                    background: 'none',
                    boxShadow: 'none',
                  }}
                />
              </div>

              {/* Media area */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? '#000' : '#fff',
                borderRadius: 0,
                boxShadow: 'none',
                padding: 0,
              }}>
                {fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? (
                  <video
                    src={fullscreenMedia.url}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      height: '56vh',
                      objectFit: 'contain',
                      borderRadius: 0,
                      background: '#000',
                      boxShadow: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'block',
                    }}
                    id="gallery-popup-video"
                  />
                ) : (
                  <img
                    src={fullscreenMedia.url}
                    alt="Gallery media"
                    style={{
                      width: '100%',
                      height: '56vh',
                      objectFit: 'contain',
                      borderRadius: 0,
                      background: '#fff',
                      boxShadow: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'block',
                    }}
                    id="gallery-popup-img"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* CSS Styles */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .gallery-card:hover .location-badge {
            transform: translateY(-2px);
          }
          
          .gallery-card:hover .approval-status-badge {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
          
          .gallery-card:hover button[style*="opacity: 0"] {
            opacity: 1 !important;
            transform: translateY(0) !important;
          }
          
          .filter-button {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .filter-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          
          /* Responsive grid adjustments */
          @media (max-width: 768px) {
            .studio-gallery-grid {
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
              gap: 0.5rem !important;
            }
          }
          
          @media (max-width: 480px) {
            .studio-gallery-grid {
              grid-template-columns: 1fr !important;
              gap: 0.5rem !important;
            }
          }
        `}</style>
      </div>
    );
  }
}

export default Gallery;
