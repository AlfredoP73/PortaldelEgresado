import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, User, Search, RefreshCw, 
  Briefcase, GraduationCap, Clock, CheckCheck, Users 
} from 'lucide-react';
import { getConversations, getConversation, sendConversationMessage } from '../../../api';
import toast from 'react-hot-toast';

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_email: string;
  body: string;
  created_at: string;
}

interface Conversation {
  id: number;
  context_type: string;
  context_id: number | null;
  created_at: string;
  participants: number[];
  unread_count: number;
  last_message: Message | null;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  
  const rawUser = localStorage.getItem('user');
  const currentUser = rawUser ? JSON.parse(rawUser) : null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await getConversations();
      setConversations(res.data || []);
      if (!activeConvId && res.data && res.data.length > 0) {
        setActiveConvId(res.data[0].id);
      }
    } catch (e) {
      if (!silent) toast.error('Error al cargar conversaciones');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchActiveConversation = async (convId: number, silent = false) => {
    try {
      const res = await getConversation(convId);
      setActiveConv(res.data);
      setMessages(res.data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      if (!silent) toast.error('Error al cargar los mensajes');
    }
  };

  useEffect(() => {
    fetchConversations();
    // Polling cada 5 segundos para actualización en tiempo real
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeConvId) {
        fetchActiveConversation(activeConvId, true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  useEffect(() => {
    if (activeConvId) {
      fetchActiveConversation(activeConvId);
    }
  }, [activeConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvId || sending) return;

    try {
      setSending(true);
      const text = newMessage.trim();
      setNewMessage('');
      const res = await sendConversationMessage(activeConvId, text);
      setMessages((prev) => [...prev, res.data]);
      setTimeout(scrollToBottom, 50);
      fetchConversations(true);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const preview = c.last_message?.body?.toLowerCase() || '';
    const ctx = c.context_type?.toLowerCase() || '';
    return preview.includes(search.toLowerCase()) || ctx.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-brand-600" />
          Bandeja de Mensajes
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Comunícate directamente sobre vacantes, procesos de selección o mentorías.
        </p>
      </div>

      {/* Main Container */}
      <div 
        className="rounded-2xl border shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div 
          className="w-full md:w-80 lg:w-96 border-r flex flex-col flex-shrink-0"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Barra de búsqueda */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="relative">
              <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                style={{ borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>

          {/* Lista de chats */}
          <div className="flex-1 overflow-y-auto divide-y custom-scrollbar" style={{ borderColor: 'var(--border-color)' }}>
            {loading && conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-tertiary">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                Cargando conversaciones...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-tertiary">
                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="font-semibold">Sin conversaciones activas</p>
                <p className="text-xs mt-1">Los mensajes iniciados por empresas o solicitudes de mentoría aparecerán aquí.</p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConvId;
                const isMentorship = c.context_type === 'MENTORSHIP';
                const isNetworking = c.context_type === 'NETWORKING';
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 relative hover-bg-muted ${
                      isActive ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
                    )}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-xs ${
                        isMentorship ? 'bg-purple-100 text-purple-700' : isNetworking ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isMentorship ? <GraduationCap className="w-5 h-5" /> : isNetworking ? <Users className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[10px]"
                          style={{
                            backgroundColor: isMentorship ? 'rgba(147, 51, 234, 0.1)' : isNetworking ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isMentorship ? '#9333ea' : isNetworking ? '#2563eb' : '#10b981'
                          }}
                        >
                          {isMentorship ? 'Mentoría' : isNetworking ? 'Red / Contacto' : 'Postulación'} #{c.context_id || c.id}
                        </span>
                        {c.unread_count > 0 && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary truncate">
                        {c.last_message ? (
                          <span>
                            <strong className="text-ink">{c.last_message.sender_email.split('@')[0]}:</strong>{' '}
                            {c.last_message.body}
                          </span>
                        ) : (
                          <span className="italic">Conversación iniciada</span>
                        )}
                      </p>
                      {c.last_message && (
                        <span className="text-[10px] text-ink-tertiary flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Flujo de Mensajes */}
        <div className="flex-1 flex flex-col bg-transparent">
          {activeConvId ? (
            <>
              {/* Header de conversación activa */}
              <div 
                className="px-6 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-muted)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                    {activeConv?.context_type === 'MENTORSHIP' ? <GraduationCap className="w-5 h-5" /> : activeConv?.context_type === 'NETWORKING' ? <Users className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">
                      {activeConv?.context_type === 'MENTORSHIP' ? 'Mentoría Universitaria' : activeConv?.context_type === 'NETWORKING' ? 'Red de Contactos Egresados' : 'Proceso de Selección Empresa'}
                    </h3>
                    <p className="text-xs text-ink-secondary">
                      Contexto #{activeConv?.context_id || activeConvId} • Canal Oficial UPC
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-ink-tertiary">
                    <MessageSquare className="w-12 h-12 opacity-20 mb-2" />
                    <p className="text-sm font-semibold">No hay mensajes todavía</p>
                    <p className="text-xs">Escribe el primer mensaje para coordinar la entrevista o mentoría.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === currentUser?.id;
                    return (
                      <div 
                        key={m.id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[11px] font-medium text-ink-tertiary">
                            {isMe ? 'Tú' : m.sender_email.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-ink-tertiary">
                            • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div 
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-xs ${
                            isMe 
                              ? 'bg-brand-600 text-white rounded-br-xs' 
                              : 'rounded-bl-xs'
                          }`}
                          style={{
                            backgroundColor: isMe ? '#087443' : 'var(--bg-muted)',
                            color: isMe ? '#ffffff' : 'var(--text-primary)',
                            border: isMe ? 'none' : '1px solid var(--border-color)'
                          }}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input envío */}
              <form 
                onSubmit={handleSendMessage}
                className="p-4 border-t flex items-center gap-3"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface)' }}
              >
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-500"
                  style={{ borderColor: 'var(--border-color)' }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs"
                  style={{ backgroundColor: '#087443' }}
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-tertiary p-8">
              <MessageSquare className="w-16 h-16 opacity-20 mb-3" />
              <h3 className="text-base font-bold text-ink">Selecciona una conversación</h3>
              <p className="text-sm mt-1 text-center max-w-sm">
                Haz clic en cualquiera de las conversaciones de la izquierda para ver el historial y enviar mensajes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

