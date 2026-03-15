import { useState } from 'react'
import AuroraBackground from './components/AuroraBackground'
import ChatInterface from './components/ChatInterface'
import UploadPanel from './components/UploadPanel'
import VaporizeText from './components/VaporizeText'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <>
      <AuroraBackground />

      <div className="app-scroll-layer">
        <div className="chat-outer">

          <header className="chat-header reveal">
            <div className="site-title__tag">[ multimodal ]</div>
            <div className="site-title__canvas-wrap">
              <VaporizeText
                texts={['RAG']}
                font={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '128px', fontWeight: 700 }}
                color="rgb(255, 255, 255)"
                spread={4}
                density={7}
                animation={{ vaporizeDuration: 2.4, fadeInDuration: 1.2, waitDuration: 2 }}
                direction="left-to-right"
                alignment="center"
              />
            </div>
            <div className="site-title__rule" />
            <p className="cyber-subtitle" style={{ marginTop: '10px' }}>
              Gemini Embedding 2 &middot; Supabase pgvector &middot; Aurora search
            </p>
          </header>

          <nav className="cyber-tab-nav">
            <button
              className={`cyber-tab-btn ${activeTab === 'chat' ? 'cyber-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`cyber-tab-btn ${activeTab === 'ingest' ? 'cyber-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('ingest')}
            >
              Ingest
            </button>
          </nav>

          {activeTab === 'chat' && <ChatInterface />}
          {activeTab === 'ingest' && (
            <div className="ingest-panel-wrapper">
              <UploadPanel />
            </div>
          )}

        </div>
      </div>
    </>
  )
}
