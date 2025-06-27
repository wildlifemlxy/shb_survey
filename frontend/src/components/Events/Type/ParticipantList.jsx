import React, { Component, createRef } from 'react';
import axios from 'axios';

class ParticipantList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      participants: props.participants || [],
      editingIndexes: [],
      hasEdits: false // track if any edits have been made
    };
    this.listContainerRef = createRef();
    this.newInputRef = createRef();
  }

  handleAddRow = () => {
    this.setState(prevState => ({
      participants: [...prevState.participants, ''],
      editingIndexes: [...prevState.editingIndexes, prevState.participants.length] // add new index to editingIndexes
    }), () => {
      if (this.newInputRef.current) {
        this.newInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.newInputRef.current.focus();
      }
    });
  };

  handleRemoveParticipant = (eventId, idx) => {
    this.setState(
      prevState => {
        const updated = prevState.participants.filter((_, i) => i !== idx);
        return { participants: updated, hasEdits: true };
      }
    );
  };

  handleInputChange = (eventId, idx, e) => {
    const updated = [...this.state.participants];
    updated[idx] = e.target.value;
    this.setState({ participants: updated, hasEdits: true });
  };

  handleInputBlur = (eventId, idx) => {
    // Do nothing on blur to keep the input open
  };

  handleRowClick = (i, p) => {
    if (typeof p === 'string' && p !== '') {
      this.setState(prev => {
        if (prev.editingIndexes.includes(i)) {
          // If already editing, remove from editingIndexes (toggle off)
          return { editingIndexes: prev.editingIndexes.filter(idx => idx !== i) };
        } else {
          // Otherwise, add to editingIndexes (toggle on)
          return { editingIndexes: [...prev.editingIndexes, i] };
        }
      });
    }
  };

  handleUpdate = async () => {
    const { eventId } = this.props;
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
      this.setState({ hasEdits: false, editingIndexes: [] });
      // You can use 'response' for further logic or feedback if needed
    } catch (error) {
     console.log('Failed to update participants:', error);
    }
  };

  componentDidUpdate(prevProps, prevState) {
    // If participants prop changes, update state
    if (prevProps.participants !== this.props.participants) {
      this.setState({ participants: this.props.participants });
    }
    // Check if participants array has changed to set hasEdits
    if (prevState.participants !== this.state.participants) {
      const prev = JSON.stringify(prevProps.participants || []);
      const curr = JSON.stringify(this.state.participants || []);
      if (prev !== curr && !this.state.hasEdits) {
        this.setState({ hasEdits: true });
      }
      if (prev === curr && this.state.hasEdits) {
        this.setState({ hasEdits: false });
      }
    }
  }

  render() {
    const { editing, eventId } = this.props;
    const { participants, editingIndexes, hasEdits } = this.state;
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
          {Array.isArray(participants) && participants.length > 0 && participants.map((p, i) => (
            <li
              key={i}
              className="participant-item-array"
              style={{ display: 'flex', alignItems: 'center', padding: '4px 0', cursor: typeof p === 'string' && p !== '' ? 'pointer' : 'default' }}
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
                    onChange={e => this.handleInputChange(eventId, i, e)}
                    onBlur={() => this.handleInputBlur(eventId, i)}
                    placeholder="Enter name"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button
                    className="participant-remove-btn"
                    onClick={e => { e.stopPropagation(); this.handleRemoveParticipant(eventId, i); }}
                    title="Remove participant"
                    type="button"
                  >
                    &nbsp;-&nbsp;
                  </button>
                </>
              ) : (
                <>
                  {i + 1} | {p}
                  <button
                    className="participant-remove-btn"
                    onClick={e => { e.stopPropagation(); this.handleRemoveParticipant(eventId, i); }}
                    title="Remove participant"
                    type="button"
                  >
                    &nbsp;-&nbsp;
                  </button>
                </>
              )}
            </li>
          ))}
          {!editing && (!participants || participants.length === 0) && (
            <span style={{color: '#888'}}>(0)</span>
          )}
        </ul>
        {hasEdits && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              className="card-update-btn themed-btn themed-btn-accent"
              style={{ padding: '6px 18px', borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, fontSize: '1em', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', transition: 'background 0.2s' }}
              onClick={this.handleUpdate}
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
