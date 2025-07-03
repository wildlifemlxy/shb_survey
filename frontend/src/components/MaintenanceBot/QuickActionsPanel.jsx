import React from 'react';

const QuickActionsPanel = ({
  showQuickActions,
  onToggleQuickActions,
  onBackup,
  onChatbot,
  backupDisabled,
  backupTooltip
}) => (
  <div style={{ marginBottom: 16 }}>
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
      <span>⚡ Quick Actions</span>
      <span>{showQuickActions ? '▼' : '▶'}</span>
    </button>
    {showQuickActions && (
      <div style={{ marginTop: 8 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
          flexDirection: 'row'
        }}>
          <button
            onClick={onBackup}
            disabled={backupDisabled}
            style={{
              padding: '8px 16px',
              background: backupDisabled ? '#9ca3af' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: backupDisabled ? 'not-allowed' : 'pointer',
              fontSize: 11,
              fontWeight: 600,
              opacity: backupDisabled ? 0.6 : 1,
              minHeight: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: '1.2',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
              width: '33%'
            }}
            title={backupTooltip}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Backup
            </span>
          </button>
          <button
            onClick={onChatbot}
            style={{
              padding: '8px 16px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              minHeight: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              lineHeight: '1.2',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              whiteSpace: 'nowrap',
              width: '33%'
            }}
            title="Chatbot feature coming soon!"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Chatbot
            </span>
          </button>
          <div style={{ width: '33%', minHeight: 32 }}></div>
        </div>
      </div>
    )}
  </div>
);

export default QuickActionsPanel;
