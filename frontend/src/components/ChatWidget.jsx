import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

const bounceStyle = `
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
`;

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getRoleLabel(role) {
  if (!role) return 'member';
  const map = { STUDENT: 'student', COACH: 'coach', ADMIN: 'admin' };
  return map[role] ?? 'member';
}

function buildGreeting(user) {
  const name = user?.first_name || user?.username || 'there';
  const role = getRoleLabel(user?.role);
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const byRole = {
    student: 'I can answer questions about gym policies, your nutrition plans, dietary restrictions, and more.',
    coach:
      'I can help you with info about your assigned students, their dietary restrictions, and workout plans you created.',
    admin: 'I can help you with pending coach approvals, equipment management, and platform questions.',
  };

  const hint = byRole[role] ?? 'I can answer questions about the gym and the CUFitness platform.';
  return (
    timeOfDay +
    ', **' +
    name +
    '**! 👋 Welcome to CUFitness Assistant.\n\nYou are logged in as a **' +
    role +
    '**. ' +
    hint +
    '\n\nHow can I help you today?'
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy response'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '4px',
        fontSize: '12px',
        color: copied ? '#508212' : '#aaa',
        transition: 'color 0.2s',
        marginTop: '4px',
        alignSelf: 'flex-end',
      }}
    >
      {copied ? '✓ Copied' : '⧉ Copy'}
    </button>
  );
}

function RatingButtons({ userMessage, botResponse }) {
  const [rated, setRated] = useState(null);

  const handleRate = async (rating) => {
    if (rated) return;
    setRated(rating);
    try {
      await api.post('/chat/rate/', {
        message: userMessage,
        response: botResponse,
        rating: rating,
      });
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <button
        onClick={() => handleRate('up')}
        title='Helpful'
        style={{
          background: 'none',
          border: 'none',
          cursor: rated ? 'default' : 'pointer',
          fontSize: '13px',
          opacity: rated && rated !== 'up' ? 0.3 : 1,
          color: rated === 'up' ? '#508212' : '#aaa',
          padding: '2px 4px',
        }}
      >
        👍
      </button>
      <button
        onClick={() => handleRate('down')}
        title='Not helpful'
        style={{
          background: 'none',
          border: 'none',
          cursor: rated ? 'default' : 'pointer',
          fontSize: '13px',
          opacity: rated && rated !== 'down' ? 0.3 : 1,
          color: rated === 'down' ? '#912338' : '#aaa',
          padding: '2px 4px',
        }}
      >
        👎
      </button>
      {rated && (
        <span style={{ fontSize: '10px', color: '#aaa' }}>
          {rated === 'up' ? 'Thanks for the feedback!' : 'Sorry to hear that!'}
        </span>
      )}
    </div>
  );
}

function SimpleMarkdown({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </span>
        ),
      )}
    </span>
  );
}

function MessageBubble({ msg, prevUserMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: '2px' }}
    >
      <div
        style={{
          background: isUser ? '#912338' : '#f1f1f1',
          color: isUser ? '#fff' : '#333',
          padding: '9px 13px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          maxWidth: '82%',
          fontSize: '13.5px',
          lineHeight: '1.5',
          wordBreak: 'break-word',
        }}
      >
        <SimpleMarkdown text={msg.text} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isUser ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize: '10px', color: '#bbb' }}>{msg.timestamp}</span>
        {!isUser && <CopyButton text={msg.text} />}
        {!isUser && prevUserMessage && <RatingButtons userMessage={prevUserMessage} botResponse={msg.text} />}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    { role: 'bot', text: buildGreeting(user), timestamp: formatTime(new Date()) },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const prevUserRef = useRef(user);
  useEffect(() => {
    if (user && user !== prevUserRef.current) {
      prevUserRef.current = user;
      setMessages([{ role: 'bot', text: buildGreeting(user), timestamp: formatTime(new Date()) }]);
    }
  }, [user]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    const timestamp = formatTime(new Date());
    setMessages((prev) => [...prev, { role: 'user', text: userMsg, timestamp }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/chat/', { message: userMsg });
      setMessages((prev) => [...prev, { role: 'bot', text: response.data.reply, timestamp: formatTime(new Date()) }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      setMessages((prev) => [...prev, { role: 'bot', text: '⚠️ ' + errorMsg, timestamp: formatTime(new Date()) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getPrevUserMessage = (messages, index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].text;
    }
    return null;
  };

  const quickQuestions = {
    STUDENT: [
      'What time does the gym close today?',
      'Who is my assigned coach?',
      'Where is the gym located?',
      'What are the membership rates?',
    ],
    COACH: [
      'Who are my assigned students?',
      'Do any of my students have dietary restrictions?',
      'What workout plans have I created?',
    ],
    ADMIN: ['Which coaches are pending approval?', 'What equipment do we have?', 'How do I approve a coach?'],
  };

  const userQuickQuestions = quickQuestions[user?.role] || [];

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      <style>{bounceStyle}</style>
      {open && (
        <div
          style={{
            width: '350px',
            height: '490px',
            background: '#fff',
            borderRadius: '14px',
            boxShadow: '0 6px 28px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#912338',
              color: '#fff',
              padding: '14px 16px',
              fontWeight: 'bold',
              fontSize: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>🏋️ CUFitness Assistant</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() =>
                  setMessages([{ role: 'bot', text: buildGreeting(user), timestamp: formatTime(new Date()) }])
                }
                title='Clear chat'
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontWeight: '500',
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} prevUserMessage={getPrevUserMessage(messages, i)} />
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#912338',
                      display: 'inline-block',
                      animation: 'bounce 1s infinite',
                      animationDelay: '0s',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#912338',
                      display: 'inline-block',
                      animation: 'bounce 1s infinite',
                      animationDelay: '0.2s',
                    }}
                  ></span>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: '#912338',
                      display: 'inline-block',
                      animation: 'bounce 1s infinite',
                      animationDelay: '0.4s',
                    }}
                  ></span>
                </div>
                <span style={{ color: '#bbb', fontSize: '12px', fontStyle: 'italic' }}>Assistant is typing</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {userQuickQuestions.length > 0 && messages.length <= 2 && (
            <div
              style={{
                padding: '8px 12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                borderTop: '1px solid #eee',
              }}
            >
              {userQuickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => sendMessage(), 0);
                  }}
                  style={{
                    background: '#f5eeee',
                    color: '#912338',
                    border: '1px solid #e4dcdc',
                    borderRadius: '20px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div
            style={{ display: 'flex', padding: '10px', borderTop: '1px solid #eee', gap: '8px', alignItems: 'center' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder='Ask a question…'
              disabled={loading}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #ddd',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#ccc' : '#912338',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 14px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '13.5px',
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
          width: '58px',
          height: '58px',
          fontSize: '26px',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 'auto',
        }}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
