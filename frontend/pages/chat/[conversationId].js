import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import Layout from '../../components/Layout';
import api, { getToken, getUser } from '../../lib/api';

export default function ChatThread() {
  const router = useRouter();
  const { conversationId } = router.query;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [warning, setWarning] = useState('');
  const [me, setMe] = useState(null);
  const socketRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { setMe(getUser()); }, []);

  // Load history
  useEffect(() => {
    if (!conversationId) return;
    api.get(`/chat/conversations/${conversationId}/messages`)
      .then(({ data }) => setMessages(data.items))
      .catch(() => {});
  }, [conversationId]);

  // Connect socket
  useEffect(() => {
    if (!conversationId) return;
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(url, { auth: { token: getToken() }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('join', conversationId);
    socket.on('message', (msg) => setMessages((m) => [...m, msg]));
    socket.on('blocked', (info) => setWarning(`Message blocked: ${info.reasons.join(', ')}`));
    return () => socket.disconnect();
  }, [conversationId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function send(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    socketRef.current?.emit('message', { conversationId, body: draft });
    setDraft(''); setWarning('');
  }

  return (
    <Layout>
      <div className="mx-auto flex max-w-3xl flex-col" style={{ height: 'calc(100vh - 160px)' }}>
        <div className="card border-amber-200 bg-amber-50 text-xs text-amber-800">
          ⚠️ Phone numbers, emails, and external links are automatically blocked. Repeated bypass attempts will suspend your account.
        </div>

        <div className="card mt-3 flex-1 overflow-y-auto">
          {messages.map((m) => {
            const mine = m.sender === me?._id;
            return (
              <div key={m._id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  m.blocked ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  : mine ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}>
                  {m.body}
                  {m.flagged && !m.blocked && (
                    <div className="mt-1 text-[10px] opacity-80">⚠ flagged: {m.flagReasons?.join(', ')}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {warning && <div className="mt-2 text-sm text-red-600">{warning}</div>}

        <form onSubmit={send} className="mt-3 flex gap-2">
          <input className="input flex-1" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button className="btn-primary">Send</button>
        </form>
      </div>
    </Layout>
  );
}
