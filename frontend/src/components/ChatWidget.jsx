import { useState } from 'react';
import api from '../api/axios';

export default function ChatWidget({ tokens }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I am the CUFitness Assistant. Ask me anything about the gym!' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(
        '/chat/',
        { message: userMsg },
        { headers: { Authorization: `Bearer ${tokens?.access}` } },
      );
      setMessages((prev) => [...prev, { role: 'bot', text: response.data.reply }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      setMessages((prev) => [...prev, { role: 'bot', text: `Error: ${errorMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {open && (
        <div
          style={{
            width: '340px',
            height: '460px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              background: '#912338',
              color: '#fff',
              padding: '14px 16px',
              borderRadius: '12px 12px 0 0',
              fontWeight: 'bold',
              fontSize: '15px',
            }}
          >
            CUFitness Assistant
          </div>
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? '#912338' : '#f1f1f1',
                  color: m.role === 'user' ? '#fff' : '#333',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  maxWidth: '80%',
                  fontSize: '14px',
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && <div style={{ color: '#999', fontSize: '13px' }}>Typing...</div>}
          </div>
          <div style={{ display: 'flex', padding: '10px', borderTop: '1px solid #eee', gap: '8px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Ask a question...'
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                background: '#912338',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: '#912338',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          float: 'right',
        }}
      >
        💬
      </button>
    </div>
  );
}
