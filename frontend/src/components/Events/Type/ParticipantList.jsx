import React, { Component, createRef } from 'react';
import axios from 'axios';
import tokenService from '../../../utils/tokenService';

class ParticipantList extends Component {
  constructor(props) {
    super(props);
    console.log('ParticipantList props:', props); // Debug props
    this.state = {
      participants: props.participants || [],
      editingIndexes: [],
      hasUnsavedChanges: false
    };
    this.listContainerRef = createRef();
    this.inputRefs = {}; // Store multiple input refs
  }

  handleAddRow = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    // If role is not "WWF-Volunteer", add an empty textbox for manual entry
    if (userRole !== "WWF-Volunteer") {
      this.setState(prevState => {
        const newParticipants = [...prevState.participants, ''];
        return {
          participants: newParticipants,
          editingIndexes: [...prevState.editingIndexes, prevState.participants.length],
          hasUnsavedChanges: true
        };
      }, () => {
        // Focus on the newly added input
        const newIndex = this.state.participants.length - 1;
        setTimeout(() => {
          if (this.inputRefs[newIndex]) {
            this.inputRefs[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.inputRefs[newIndex].focus();
          }
        }, 10);
        // No auto-update for non-WWF-Volunteers
      });
      return;
    }
    
    // Original logic for WWF-Volunteer role
    console.log('Current user:', user);
    const userName = user?.name || '';
    console.log('Adding participant:', userName);
    
    // Check if user is already in the participants list
    if (userName && this.state.participants.includes(userName)) {
      console.log('User already exists in participants list, ignoring add');
      return;
    }
    
    this.setState(prevState => {
      const newParticipants = [...prevState.participants, userName];
      console.log('New participants array:', newParticipants);
      return {
        participants: newParticipants,
        editingIndexes: userName ? [] : [...prevState.editingIndexes, prevState.participants.length]
      };
    }, () => {
      console.log('State after adding:', this.state.participants);
      if (!userName && this.inputRefs[this.state.participants.length - 1]) {
        setTimeout(() => {
          const lastIndex = this.state.participants.length - 1;
          if (this.inputRefs[lastIndex]) {
            this.inputRefs[lastIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.inputRefs[lastIndex].focus();
          }
        }, 10);
      }
      // Auto-update participants after adding for WWF-Volunteers
      this.handleUpdate();
    });
  };

  handleRemoveParticipant = (idx) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    this.setState(
      prevState => {
        const updated = prevState.participants.filter((_, i) => i !== idx);
        return { 
          participants: updated,
          hasUnsavedChanges: userRole !== "WWF-Volunteer" ? true : prevState.hasUnsavedChanges
        };
      },
      () => {
        // Auto-update only for WWF-Volunteers
        if (userRole === "WWF-Volunteer") {
          this.handleUpdate();
        }
      }
    );
  };

  handleInputChange = (idx, e) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    const updated = [...this.state.participants];
    updated[idx] = e.target.value;
    this.setState({ 
      participants: updated,
      hasUnsavedChanges: userRole !== "WWF-Volunteer" ? true : this.state.hasUnsavedChanges
    });
  };

  handleInputBlur = (idx) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    // Only remove duplicates for non-empty values
    const currentValue = this.state.participants[idx];
    if (currentValue && currentValue.trim() !== '') {
      this.removeDuplicatesAndUpdate(idx);
    } else if (userRole !== "WWF-Volunteer") {
      // For non-WWF-Volunteers, don't auto-remove empty rows on blur
      // Just mark as having unsaved changes if needed
      this.setState(prev => ({
        hasUnsavedChanges: true
      }));
    }
  };

  handleInputKeyPress = (idx, e) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    if (e.key === 'Enter') {
      const currentValue = this.state.participants[idx];
      
      // Only check for duplicates if the value is not empty
      if (currentValue && currentValue.trim() !== '') {
        this.removeDuplicatesAndUpdate(idx);
      } else if (userRole !== "WWF-Volunteer") {
        // For non-WWF-Volunteers with empty values, just mark as unsaved
        this.setState(prev => ({
          hasUnsavedChanges: true
        }));
      }
      
      // Remove from editing mode
      this.setState(prev => ({
        editingIndexes: prev.editingIndexes.filter(i => i !== idx)
      }));
    }
  };

  // Helper method to remove duplicates and update
  removeDuplicatesAndUpdate = (currentIdx) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    this.setState(prevState => {
      const participants = [...prevState.participants];
      const currentValue = participants[currentIdx];
      
      // Don't process empty values
      if (!currentValue || currentValue.trim() === '') {
        return prevState;
      }
      
      // Find all occurrences of the current value (excluding empty strings)
      const duplicateIndexes = [];
      participants.forEach((participant, index) => {
        if (participant && participant.trim() !== '' && participant === currentValue && index !== currentIdx) {
          duplicateIndexes.push(index);
        }
      });
      
      // Remove duplicates (keeping the current one being edited)
      if (duplicateIndexes.length > 0) {
        console.log(`Removing ${duplicateIndexes.length} duplicate(s) of "${currentValue}"`);
        const filtered = participants.filter((_, index) => !duplicateIndexes.includes(index));
        return { 
          participants: filtered,
          hasUnsavedChanges: userRole !== "WWF-Volunteer" ? true : prevState.hasUnsavedChanges
        };
      }
      
      return prevState;
    }, () => {
      // Auto-save only for WWF-Volunteers
      if (userRole === "WWF-Volunteer") {
        this.handleUpdate();
      }
    });
  };

  // Helper method to check if current user can edit a participant
  canEditParticipant = (participantName) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userName = user?.name || '';
    const userRole = user?.role || '';
    
    // If role is not "WWF-Volunteer", allow editing any participant
    if (userRole !== "WWF-Volunteer") {
      return true;
    }
    
    // If role is "WWF-Volunteer", only allow editing their own name
    return userName === participantName;
  };

  // Helper method to check if current user can add participants
  canAddParticipants = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    // If role is not "WWF-Volunteer", allow adding participants
    return userRole !== "WWF-Volunteer";
  };

  handleRowClick = (i, p) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    // Allow editing if user can edit this participant (based on role)
    if (typeof p === 'string' && this.canEditParticipant(p)) {
      const wasEditing = this.state.editingIndexes.includes(i);
      
      this.setState(prev => {
        if (prev.editingIndexes.includes(i)) {
          // If already editing, remove from editingIndexes (toggle off)
          return { editingIndexes: prev.editingIndexes.filter(idx => idx !== i) };
        } else {
          // Otherwise, add to editingIndexes (toggle on)
          return { editingIndexes: [...prev.editingIndexes, i] };
        }
      }, () => {
        // If we just finished editing (was editing and now not editing), check for duplicates and save changes
        // But only for non-empty values
        if (wasEditing && !this.state.editingIndexes.includes(i)) {
          const currentValue = this.state.participants[i];
          if (currentValue && currentValue.trim() !== '') {
            this.removeDuplicatesAndUpdate(i);
          } else if (userRole !== "WWF-Volunteer") {
            // For non-WWF-Volunteers with empty values, just mark as unsaved
            this.setState(prev => ({
              hasUnsavedChanges: true
            }));
          }
        }
      });
    }
  };

  handleUpdate = async () => {
    const { eventId, onUpdateParticipants } = this.props;
    console.log('Updating participants for event:', eventId);
    
    // Add validation to ensure eventId exists
    if (!eventId) {
      console.error('No eventId provided to ParticipantList component');
      return;
    }
    
    const { participants } = this.state;
    
    try {
      // Use the new onUpdateParticipants prop if available
      if (typeof onUpdateParticipants === 'function') {
        console.log('Using parent component updateParticipants function');
        const result = await onUpdateParticipants(participants);
        
        if (result && result.success) {
          console.log('Participants updated successfully via parent:', result);
          // Reset unsaved changes after successful update
          this.setState({ hasUnsavedChanges: false });
        } else {
          console.error('Failed to update participants via parent:', result?.message);
        }
        return;
      }
      
      // Fallback to old method if onUpdateParticipants is not available
      const BASE_URL =
        window.location.hostname === 'localhost'
          ? 'http://localhost:3001'
          : 'https://shb-backend.azurewebsites.net';
      
      // Check if user is authenticated
      if (!tokenService.isTokenValid()) {
        console.error('Authentication required for participant updates');
        return;
      }

      // Encrypt the request data
      const requestData = await tokenService.encryptData({
        eventId,
        participants,
        purpose: 'updateParticipants',
      });
      
      // Make authenticated request
      const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/events`, {
        method: 'POST',
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Participants updated successfully:', data);
        
        // Reset unsaved changes after successful update
        this.setState({ hasUnsavedChanges: false });
      } else {
        throw new Error('Failed to update participants');
      }
      
    } catch (error) {
     console.log('Failed to update participants:', error);
    }
  };

  // Explicit update method for non-WWF-Volunteers
  handleExplicitUpdate = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    
    // For non-WWF-Volunteers, clean up empty rows before saving
    if (userRole !== "WWF-Volunteer") {
      this.setState(prevState => {
        const cleanedParticipants = prevState.participants.filter(p => p && p.trim() !== '');
        return {
          participants: cleanedParticipants,
          editingIndexes: [] // Clear all editing states
        };
      }, async () => {
        await this.handleUpdate();
      });
    } else {
      await this.handleUpdate();
    }
  };

  componentDidUpdate(prevProps, prevState) {
    // Only update from props if the prop actually changed with different content
    if (prevProps.participants !== this.props.participants) {
      const propParticipants = this.props.participants || [];
      const stateParticipants = this.state.participants || [];
      
      // Only update if the arrays are actually different in content
      if (JSON.stringify(propParticipants) !== JSON.stringify(stateParticipants)) {
        console.log('Updating participants from props:', propParticipants);
        this.setState({ 
          participants: propParticipants,
          hasUnsavedChanges: false
        });
      }
    }
  }

  render() {
    const { editing, eventId } = this.props;
    const { participants, editingIndexes, hasUnsavedChanges } = this.state;
    const user = JSON.parse(localStorage.getItem('user'));
    const userRole = user?.role || '';
    const isNonWWFVolunteer = userRole !== "WWF-Volunteer";
    
    return (
      <div
        ref={this.listContainerRef}
        style={{
          position: 'relative',
          border: '1px solid #eee',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            padding: '8px 0',
            borderBottom: '1px solid #eee',
            boxShadow: '0 2px 4px -2px #ccc',
          }}
        >
          <span className="upcoming-event-label">Participants</span>
          {!editing && (
            <button
              className="participant-add-btn themed-btn"
              style={{ borderRadius: 6, width: 28, height: 28, fontSize: 20, fontWeight: 700, color: 'green', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
              onClick={this.handleAddRow}
              type="button"
              title="Add participant"
            >
              +
            </button>
          )}
        </div>
        <ul className="participants-array-list" style={{ margin: 0, padding: 0 }}>
          {Array.isArray(participants) && participants.length > 0 && participants.map((p, i) => {
            const canEdit = this.canEditParticipant(p);
            return (
              <li
                key={i}
                className="participant-item-array"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '4px 0', 
                  cursor: (typeof p === 'string' && canEdit) ? 'pointer' : 'default' 
                }}
                onClick={() => this.handleRowClick(i, p)}
              >
                {(typeof p === 'string' && (p === '' || editingIndexes.includes(i))) ? (
                  <>
                    <input
                      className="participant-new-input"
                      type="text"
                      ref={el => this.inputRefs[i] = el}
                      autoFocus={editingIndexes.includes(i)}
                      value={p}
                      onChange={e => this.handleInputChange(i, e)}
                      onBlur={() => this.handleInputBlur(i)}
                      onKeyPress={e => this.handleInputKeyPress(i, e)}
                      placeholder="Enter name"
                      style={{ flex: 1, minWidth: 0 }}
                    />
                    {canEdit && (
                      <button
                        className="participant-remove-btn"
                        onClick={e => { e.stopPropagation(); this.handleRemoveParticipant(i); }}
                        title="Remove participant"
                        type="button"
                      >
                        &nbsp;-&nbsp;
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {i + 1} | {p}
                    {canEdit && (
                      <button
                        className="participant-remove-btn"
                        onClick={e => { e.stopPropagation(); this.handleRemoveParticipant(i); }}
                        title="Remove participant"
                        type="button"
                      >
                        &nbsp;-&nbsp;
                      </button>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {!editing && (!participants || participants.length === 0) && (
            <span style={{color: '#888'}}>(0)</span>
          )}
        </ul>
        {/* Update button at bottom right for non-WWF-Volunteers */}
        {!editing && isNonWWFVolunteer && hasUnsavedChanges && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            padding: '8px 0 4px 0',
            marginTop: '8px',
            borderTop: '1px solid #eee'
          }}>
            <button
              className="participant-update-btn themed-btn"
              style={{ 
                borderRadius: 6, 
                padding: '6px 12px', 
                fontSize: 14, 
                fontWeight: 600, 
                color: '#fff', 
                backgroundColor: '#007bff',
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#0056b3'; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = '#007bff'; }}
              onClick={this.handleExplicitUpdate}
              type="button"
              title="Save changes"
            >
              Update
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default ParticipantList;
