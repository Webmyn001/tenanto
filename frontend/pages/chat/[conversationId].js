import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Layout from '../../components/Layout';
import api, { getToken, getUser } from '../../lib/api';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const roleColors = { student: 'bg-blue-500', corper: 'bg-green-500', landlord: 'bg-violet-500', admin: 'bg-red-500' };

function Avatar({ name, role, size }) {
  const s = size || 9;
  const bg = roleColors[role] || 'bg-gray-400';
  return (
    <div className={`${bg} text-white rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ width: s * 4, height: s * 4, fontSize: s * 1.3 }}>
      {initials(name)}
    </div>
  );
}

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sameDay(a, b) {
  return a && b && new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ChatThread() {
  const router = useRouter();
  const { conversationId } = router.query;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [me, setMe] = useState(null);
  const [other, setOther] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => { setMe(getUser()); }, []);

  // Load conversation details + messages
  useEffect(() => {
    if (!conversationId) return;
    setLoading(true);
    Promise.all([
      api.get(`/chat/conversations/${conversationId}/messages`),
      api.get('/chat/conversations'),
    ]).then(([msgRes, convRes]) => {
      setMessages(msgRes.data.items);
      const conv = convRes.data.items.find(c => c._id === conversationId);
      setConversation(conv);
      if (conv) {
        const o = conv.participants?.find(p => p._id !== getUser()?._id);
        setOther(o);
      }
      api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
    }).catch(() => router.push('/chat')).finally(() => setLoading(false));
  }, [conversationId]);

  // Socket connection
  useEffect(() => {
    if (!conversationId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(url, { auth: { token: getToken() }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join', conversationId);

    socket.on('message', (msg) => {
      setMessages(m => [...m, msg]);
      api.post(`/chat/conversations/${conversationId}/read`).catch(() => {});
    });

    socket.on('typing', () => { setTyping(true); });
    socket.on('stop-typing', () => { setTyping(false); });

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket.disconnect();
    };
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    socketRef.current?.emit('message', { conversationId, body: draft });
    setDraft('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
  }

  const emitTyping = useCallback(() => {
    socketRef.current?.emit('typing', { conversationId });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('stop-typing', { conversationId });
    }, 1500);
  }, [conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [draft]);

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl py-12 text-center text-sm text-gray-500">Loading...</div>
      </Layout>
    );
  }

  const readByOther = (msg) => {
    if (!other || msg.sender?._id !== me?._id) return '';
    const read = msg.readBy?.some(r => (r._id || r) === other._id);
    return read ? 'Read' : 'Sent';
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-2xl flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* ─── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1 py-3 border-b border-gray-100">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar name={other?.fullName} role={other?.role} size={9} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{other?.fullName || 'Unknown'}</p>
            <p className="text-xs text-gray-500 capitalize">{other?.role || ''}{conversation?.property?.title ? ` · ${conversation.property.title}` : ''}</p>
          </div>
        </div>

        {/* ─── Messages ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-1 py-4 space-y-1 scroll-smooth">
          {messages.map((m, i) => {
            const mine = m.sender?._id === me?._id || m.sender === me?._id;
            const prev = messages[i - 1];
            const showDate = !prev || !sameDay(prev.createdAt, m.createdAt);
            const showSender = !mine && (!prev || prev.sender?._id !== m.sender?._id);
            const status = readByOther(m);

            return (
              <div key={m._id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{formatDate(m.createdAt)}</span>
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    {showSender && (
                      <p className="text-[11px] font-medium text-gray-500 mb-0.5 ml-1">{m.sender?.fullName || 'Unknown'}</p>
                    )}
                    <div className={`relative px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.blocked
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200 rounded-2xl'
                        : mine
                          ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                          : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    }`}>
                      {m.body}
                      {m.flagged && !m.blocked && (
                        <div className="mt-1 text-[10px] opacity-70">⚠ flagged: {m.flagReasons?.join(', ')}</div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">{formatTime(m.createdAt)}</span>
                      {mine && (
                        <span className="text-[10px] text-gray-400">
                          {status === 'Read' ? (
                            <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 16 11" fill="none">
                              <path d="M11.5 1.5L6 9L2.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M15 1.5L9.5 9L8.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 16 11" fill="none">
                              <path d="M11.5 1.5L6 9L2.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="flex justify-start mb-1">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ─── Warning banner ──────────────────────────────────────── */}
        <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-700 leading-relaxed">
          ⚠️ Phone numbers, emails, and external links are blocked. Repeated attempts will suspend your account.
        </div>

        {/* ─── Input ───────────────────────────────────────────────── */}
        <form onSubmit={send} className="mt-2 flex gap-2 items-end pb-2">
          <div className="flex-1 relative">
            <textarea ref={inputRef} placeholder="Type a message…" value={draft}
              onChange={e => { setDraft(e.target.value); emitTyping(); }}
              onKeyDown={handleKeyDown}
              rows={1}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 px-4 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 resize-none"
              style={{ minHeight: 42, maxHeight: 120 }} />
          </div>
          <button disabled={!draft.trim()}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition shrink-0 ${
              draft.trim()
                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </form>
      </div>
    </Layout>
  );
}
