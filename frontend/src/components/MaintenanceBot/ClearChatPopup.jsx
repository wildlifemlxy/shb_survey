
import React from 'react';
import '../../css/components/MaintenanceBot/ClearChatPopup.css';

const ClearChatPopup = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="clear-chat-overlay">
      <div className="clear-chat-popup">
        <div className="clear-chat-icon">💬</div>
        <h3 className="clear-chat-title">Clear Chat History?</h3>
        <p className="clear-chat-message">
          Do you want to clear your conversation history?
        </p>
        <div className="clear-chat-buttons">
        <button 
            className="clear-chat-btn-yes"
            onClick={onConfirm}
          >
            Yes
          </button>
          <button 
            className="clear-chat-btn-no"
            onClick={onCancel}
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearChatPopup;
