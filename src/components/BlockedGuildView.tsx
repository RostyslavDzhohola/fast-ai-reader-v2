import React from 'react'

export const BlockedGuildView: React.FC = () => {
  return (
    <div className="blocked-guild-container">
      <div className="blocked-guild-content">
        <h2>Access Restricted</h2>
        <p>This Discord server has been restricted from using the AI Assistant extension.</p>
      </div>
    </div>
  )
}

export default BlockedGuildView
