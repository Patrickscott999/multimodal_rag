export default function MediaPreview({ sourceType, mediaUrl }) {
  if (!mediaUrl) return null

  if (sourceType === 'image') {
    return (
      <div style={{ marginTop: '16px', borderRadius: '10px', overflow: 'hidden' }}>
        <img
          src={mediaUrl}
          alt="Match preview"
          style={{
            width: '100%',
            maxHeight: '320px',
            objectFit: 'contain',
            background: 'rgba(0,0,0,0.3)',
            display: 'block',
          }}
        />
      </div>
    )
  }

  if (sourceType === 'video') {
    return (
      <div style={{ marginTop: '16px', borderRadius: '10px', overflow: 'hidden' }}>
        <video
          src={mediaUrl}
          controls
          preload="metadata"
          style={{
            width: '100%',
            maxHeight: '320px',
            background: '#000',
            display: 'block',
          }}
        />
      </div>
    )
  }

  return null
}
