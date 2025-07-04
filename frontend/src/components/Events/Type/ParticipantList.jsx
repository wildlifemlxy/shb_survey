import React, { Component, createRef } from 'react';
import axios from 'axios';

class ParticipantList extends Component {
  constructor(props) {
    super(props);
    console.log('ParticipantList props:', props); // Debug props
    this.state = {
      participants: props.participants || [],
      editingIndexes: []
    };
    this.listContainerRef = createRef();
    this.newInputRef = createRef();
  }

  handleAddRow = () => {
    // Get the current user's name from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
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
      if (!userName && this.newInputRef.current) {
        this.newInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.newInputRef.current.focus();
      }
      // Auto-update participants after adding
      this.handleUpdate();
    });
  };

  handleRemoveParticipant = (idx) => {
    this.setState(
      prevState => {
        const updated = prevState.participants.filter((_, i) => i !== idx);
        return { participants: updated };
      },
      () => {
        // Auto-update after removing participant
        this.handleUpdate();
      }
    );
  };

  handleInputChange = (idx, e) => {
    const updated = [...this.state.participants];
    updated[idx] = e.target.value;
    this.setState({ participants: updated });
  };

  handleInputBlur = (idx) => {
    // Check for duplicates and remove them when editing is finished
    this.removeDuplicatesAndUpdate(idx);
  };

  handleInputKeyPress = (idx, e) => {
    if (e.key === 'Enter') {
      // Check for duplicates and remove them when Enter is pressed
      this.removeDuplicatesAndUpdate(idx);
      // Remove from editing mode
      this.setState(prev => ({
        editingIndexes: prev.editingIndexes.filter(i => i !== idx)
      }));
    }
  };

  // Helper method to remove duplicates and update
  removeDuplicatesAndUpdate = (currentIdx) => {
    this.setState(prevState => {
      const participants = [...prevState.participants];
      const currentValue = participants[currentIdx];
      
      // Find all occurrences of the current value
      const duplicateIndexes = [];
      participants.forEach((participant, index) => {
        if (participant === currentValue && index !== currentIdx) {
          duplicateIndexes.push(index);
        }
      });
      
      // Remove duplicates (keeping the current one being edited)
      if (duplicateIndexes.length > 0) {
        console.log(`Removing ${duplicateIndexes.length} duplicate(s) of "${currentValue}"`);
        const filtered = participants.filter((_, index) => !duplicateIndexes.includes(index));
        return { participants: filtered };
      }
      
      return prevState;
    }, () => {
      // Auto-save after removing duplicates
      this.handleUpdate();
    });
  };

  // Helper method to check if current user can edit a participant
  canEditParticipant = (participantName) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const userName = user?.name || '';
    return userName === participantName;
  };

  handleRowClick = (i, p) => {
    // Only allow editing if the participant name matches current user's name
    if (typeof p === 'string' && p !== '' && this.canEditParticipant(p)) {
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
        if (wasEditing && !this.state.editingIndexes.includes(i)) {
          this.removeDuplicatesAndUpdate(i);
        }
      });
    }
  };

  handleUpdate = async () => {
    const { eventId } = this.props;
    console.log('Updating participants for event:', eventId);
    
    // Add validation to ensure eventId exists
    if (!eventId) {
      console.error('No eventId provided to ParticipantList component');
      return;
    }
    
    const { participants } = this.state;
    const BASE_URL =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://shb-backend.azurewebsites.net';
    
    try {
      const response = await axios.post(`${BASE_URL}/events`, {
        eventId,
        participants,
        purpose: 'updateParticipants',
      });
      console.log('Participants updated successfully:', response.data);
      
    } catch (error) {
     console.log('Failed to update participants:', error);
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
        this.setState({ participants: propParticipants });
      }
    }
  }

  render() {
    const { editing, eventId } = this.props;
    const { participants, editingIndexes } = this.state;
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
                  cursor: (typeof p === 'string' && p !== '' && canEdit) ? 'pointer' : 'default' 
                }}
                onClick={() => this.handleRowClick(i, p)}
              >
                {(typeof p === 'string' && (p === '' || editingIndexes.includes(i))) ? (
                  <>
                    <input
                      className="participant-new-input"
                      type="text"
                      ref={this.newInputRef && i === participants.length - 1 ? this.newInputRef : null}
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
      </div>
    );
  }
}

export default ParticipantList;
