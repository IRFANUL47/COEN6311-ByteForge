import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Modal, Alert, Form } from 'react-bootstrap';
import api from '../api/axios';
import { useAuth } from '../context/auth/useAuth';

// ─── constants ───────────────────────────────────────────────────────────────

const cardStyle = { border: '1.5px solid #e4dcdc', borderRadius: '10px' };
const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ─── helpers ─────────────────────────────────────────────────────────────────

const formatTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString('en-US', {
    timeZone: userTZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatConvTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString('en-US', { timeZone: userTZ, hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { timeZone: userTZ, month: 'short', day: 'numeric' });
};

// ConversationSerializer returns other_participant directly
const getOtherParticipant = (conv) => conv?.other_participant ?? null;

const getDisplayName = (person) => {
  if (!person) return '—';
  const full = `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim();
  return full || person.name || person.concordia_id || '—';
};

// ─── New Conversation Modal (coach only) ─────────────────────────────────────

function NewConversationModal({ onClose, onStart }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/bookings/');
        // Only students with an APPROVED booking satisfy IsAllowedToMessage
        const seen = new Set();
        const unique = [];
        for (const b of res.data) {
          if (b.status === 'APPROVED' && !seen.has(b.student)) {
            seen.add(b.student);
            unique.push({ id: b.student, name: b.student_name });
          }
        }
        setStudents(unique);
      } catch {
        setError('Failed to load students.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton style={{ borderBottom: '1px solid #f0eaea' }}>
        <Modal.Title style={{ fontFamily: 'var(--cu-font-brand)', fontSize: '1.3rem' }}>New Conversation</Modal.Title>
      </Modal.Header>
      <Modal.Body className='p-4'>
        <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem' }}>
          You can message students who have an approved booking with you.
        </p>
        {error && (
          <Alert variant='danger' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Loading...</p>
        ) : students.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: '0.88rem' }}>
            No eligible students. Approve a booking first before messaging a student.
          </p>
        ) : (
          <div className='d-flex flex-column gap-2'>
            {students.map((s) => (
              <div
                key={s.id}
                onClick={() => onStart(s)}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#fdf8f8',
                  borderRadius: '8px',
                  border: '1px solid #f0eaea',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5eeee';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fdf8f8';
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#f5eeee',
                    color: '#912338',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--cu-font-brand)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                  }}
                >
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: 500, fontSize: '0.88rem', color: '#1a1a1a' }}>{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function Messages() {
  const { user } = useAuth();
  const isCoach = user?.role === 'COACH';

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showNewConv, setShowNewConv] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const pollConvRef = useRef(null);
  const pollMsgRef = useRef(null);

  // ── fetch conversations ──────────────────────────────────────────────────

  const fetchConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingConvs(true);
      try {
        const res = await api.get('/conversations/');
        setConversations(res.data);

        // Students: auto-open their only conversation on first load
        if (!isCoach && !silent && res.data.length > 0) {
          openConversation(res.data[0].id);
        }
      } catch {
        if (!silent) setError('Failed to load conversations.');
      } finally {
        if (!silent) setLoadingConvs(false);
      }
    },
    [isCoach],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchConversations();
    pollConvRef.current = setInterval(() => fetchConversations(true), 10000);
    return () => clearInterval(pollConvRef.current);
  }, [fetchConversations]);

  // ── poll messages for open conversation ─────────────────────────────────

  const fetchMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await api.get(`/conversations/${convId}/messages/`);
      setMessages(res.data);
    } catch {
      if (!silent) setError('Failed to load messages.');
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    clearInterval(pollMsgRef.current);
    if (!activeConvId) return;
    pollMsgRef.current = setInterval(() => fetchMessages(activeConvId, true), 5000);
    return () => clearInterval(pollMsgRef.current);
  }, [activeConvId, fetchMessages]);

  // ── open conversation ────────────────────────────────────────────────────

  const openConversation = useCallback(async (convId) => {
    setActiveConvId(convId);
    setMessages([]);
    setLoadingMsgs(true);
    setError('');
    try {
      const res = await api.get(`/conversations/${convId}/messages/`);
      setMessages(res.data);
      await api.patch(`/conversations/${convId}/messages/read/`);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
    } catch {
      setError('Failed to load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // ── scroll to bottom on new messages ────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── send ─────────────────────────────────────────────────────────────────

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;
  const recipient = activeConv ? getOtherParticipant(activeConv) : null;

  const handleSend = async () => {
    if (!input.trim() || sending || !recipient) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        content: text,
        sender: user?.id,
        created_at: new Date().toISOString(),
        read: false,
        _optimistic: true,
      },
    ]);

    try {
      const res = await api.post('/messages/', { recipient_id: recipient.id, content: text });
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? res.data : m)));
      fetchConversations(true);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError(err.response?.data?.detail || 'Failed to send message.');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── start new conversation (coach only) ─────────────────────────────────

  const handleStartConversation = async (student) => {
    setShowNewConv(false);
    setSending(true);
    setError('');
    try {
      await api.post('/messages/', { recipient_id: student.id, content: '👋 Hello!' });
      const res = await api.get('/conversations/');
      setConversations(res.data);
      const found = res.data.find((c) => c.other_participant?.id === student.id);
      if (found) openConversation(found.id);
      setSuccess(`Conversation with ${student.name} started.`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not start conversation.');
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '2rem 2.5rem', fontFamily: 'var(--cu-font-body)' }}>
      <div className='d-flex align-items-center justify-content-between mb-1'>
        <h2 className='cu-auth-title mb-0' style={{ fontSize: '2rem' }}>
          Messages
        </h2>
        {/* New conversation button — coaches only */}
        {isCoach && (
          <Button className='cu-btn-submit' onClick={() => setShowNewConv(true)}>
            + New Conversation
          </Button>
        )}
      </div>
      <p className='cu-auth-subtitle mb-4'>
        {isCoach ? 'Message your students with approved bookings' : 'Message your coach'}
      </p>

      {error && (
        <Alert
          variant='danger'
          className='py-2 mb-3'
          style={{ fontSize: '0.88rem' }}
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant='success' className='py-2 mb-3' style={{ fontSize: '0.88rem' }}>
          {success}
        </Alert>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* ── Left: conversation list ── */}
        <Card className='cu-auth-card' style={{ ...cardStyle, width: 300, minWidth: 300, flexShrink: 0 }}>
          <Card.Body className='p-0'>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid #f0eaea' }}>
              <h5 className='cu-auth-title mb-0' style={{ fontSize: '1.1rem' }}>
                Conversations
              </h5>
            </div>

            {loadingConvs ? (
              <p style={{ padding: '1.25rem', color: '#aaa', fontSize: '0.88rem', margin: 0 }}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p style={{ padding: '1.25rem', color: '#aaa', fontSize: '0.88rem', margin: 0 }}>No conversations yet.</p>
            ) : (
              conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const name = other?.name || getDisplayName(other);
                const preview = conv.last_message_preview ?? '';
                const unread = conv.unread_count ?? 0;
                const isActive = conv.id === activeConvId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: isActive ? '#f5eeee' : 'transparent',
                      borderBottom: '1px solid #f9f5f5',
                      borderLeft: `3px solid ${isActive ? '#912338' : 'transparent'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#fdf8f8';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: isActive ? '#912338' : '#f5eeee',
                        color: isActive ? '#fff' : '#912338',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--cu-font-brand)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        flexShrink: 0,
                        transition: 'background 0.15s, color 0.15s',
                      }}
                    >
                      {(name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span
                          style={{
                            fontWeight: unread > 0 ? 600 : 400,
                            fontSize: '0.88rem',
                            color: '#1a1a1a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '62%',
                          }}
                        >
                          {name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#bbb', flexShrink: 0 }}>
                          {formatConvTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '0.1rem',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.78rem',
                            color: unread > 0 ? '#555' : '#aaa',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '80%',
                          }}
                        >
                          {preview || <em>No messages yet</em>}
                        </span>
                        {unread > 0 && (
                          <span
                            style={{
                              background: '#912338',
                              color: '#fff',
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              fontSize: '0.62rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card.Body>
        </Card>

        {/* ── Right: chat panel ── */}
        <Card
          className='cu-auth-card'
          style={{
            ...cardStyle,
            flex: 1,
            minWidth: 0,
            height: 'calc(100vh - 220px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Card.Body className='p-0' style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {activeConvId && activeConv ? (
              <>
                {/* Chat header */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderBottom: '1px solid #f0eaea',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#912338',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--cu-font-brand)',
                      fontWeight: 700,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}
                  >
                    {(recipient?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#1a1a1a' }}>
                      {recipient?.name || getDisplayName(recipient)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#aaa', textTransform: 'capitalize' }}>
                      {recipient?.role ? recipient.role.charAt(0) + recipient.role.slice(1).toLowerCase() : ''}
                    </p>
                  </div>
                </div>

                {/* Message bubbles */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    background: '#fdfbfb',
                  }}
                >
                  {loadingMsgs ? (
                    <p style={{ color: '#aaa', fontSize: '0.88rem', textAlign: 'center', marginTop: '1rem' }}>
                      Loading messages...
                    </p>
                  ) : messages.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '0.88rem', textAlign: 'center', marginTop: '1rem' }}>
                      No messages yet. Say hello!
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const senderId = msg.sender?.id ?? msg.sender;
                      const isMine = senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMine ? 'flex-end' : 'flex-start',
                            gap: '2px',
                            marginBottom: '0.35rem',
                          }}
                        >
                          <div
                            style={{
                              background: isMine ? '#912338' : '#fff',
                              color: isMine ? '#fff' : '#1a1a1a',
                              padding: '0.55rem 0.9rem',
                              borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              maxWidth: '65%',
                              fontSize: '0.88rem',
                              lineHeight: 1.5,
                              wordBreak: 'break-word',
                              border: isMine ? 'none' : '1px solid #f0eaea',
                              boxShadow: isMine ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                            }}
                          >
                            {msg.content}
                          </div>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#bbb',
                              paddingLeft: isMine ? 0 : '2px',
                              paddingRight: isMine ? '2px' : 0,
                            }}
                          >
                            {formatTime(msg.created_at)}
                            {isMine && (
                              <span style={{ marginLeft: 4, color: msg.read ? '#c9a859' : '#ccc' }}>
                                {msg.read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input row */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid #f0eaea',
                    display: 'flex',
                    gap: '0.6rem',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                    background: '#fff',
                  }}
                >
                  <Form.Control
                    ref={inputRef}
                    as='textarea'
                    rows={1}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                    }}
                    onKeyDown={handleKey}
                    placeholder='Write a message… (Enter to send)'
                    disabled={sending}
                    className='cu-form-input'
                    style={{
                      flex: 1,
                      resize: 'none',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      minHeight: 38,
                    }}
                  />
                  <Button
                    className='cu-btn-submit'
                    size='sm'
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    style={{ flexShrink: 0, height: 38, padding: '0 1.1rem' }}
                  >
                    {sending ? '…' : 'Send'}
                  </Button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '2rem',
                }}
              >
                <p style={{ color: '#ccc', fontSize: '2rem', margin: 0 }}>💬</p>
                <p
                  style={{
                    fontFamily: 'var(--cu-font-brand)',
                    fontSize: '1.1rem',
                    color: '#aaa',
                    margin: 0,
                    fontWeight: 600,
                  }}
                >
                  Select a conversation
                </p>
                <p style={{ fontSize: '0.82rem', color: '#bbb', margin: 0, textAlign: 'center', maxWidth: 220 }}>
                  Choose one from the list{isCoach ? ', or start a new one.' : '.'}
                </p>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {showNewConv && <NewConversationModal onClose={() => setShowNewConv(false)} onStart={handleStartConversation} />}
    </div>
  );
}

export default Messages;
