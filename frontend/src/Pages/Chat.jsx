import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Common/Modal';
import Toast from '../components/Common/Toast';
import {
  subscribeToRooms,
  subscribeToMessages,
  createChatRoom,
  joinChatRoom,
  sendMessage,
  closeChatRoom,
  formatTimestamp,
} from '../services/chatService';
import './Chat.css';

export default function Chat() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const messagesEndRef = useRef(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const isParticipant = selectedRoom?.participantIds?.includes(user?.uid);
  const isClosed = selectedRoom?.status === 'closed';
  const isOwner = selectedRoom?.createdBy === user?.uid;

  useEffect(() => {
    const unsub = subscribeToRooms((data) => {
      setRooms(data);
    }, 'open');
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return undefined;
    }

    const unsub = subscribeToMessages(selectedRoomId, setMessages);
    return unsub;
  }, [selectedRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectRoom = async (room) => {
    try {
      await joinChatRoom(room.id, user.uid);
      setSelectedRoomId(room.id);
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleCreateRoom = async (title) => {
    if (!title?.trim()) return;

    try {
      const roomId = await createChatRoom({
        title: title.trim(),
        userId: user.uid,
        userName: user.displayName,
        userRole: user.role || 'student',
      });
      setShowCreateModal(false);
      setSelectedRoomId(roomId);
      setToast({ message: 'Đã tạo phòng chat mới!', type: 'success' });
    } catch (err) {
      setToast({ message: 'Không thể tạo phòng chat: ' + err.message, type: 'error' });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoomId || isClosed) return;

    try {
      setSending(true);
      await sendMessage({
        roomId: selectedRoomId,
        senderId: user.uid,
        senderName: user.displayName,
        senderRole: user.role || 'student',
        text: messageText,
      });
      setMessageText('');
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseRoom = async () => {
    if (!selectedRoomId) return;

    try {
      await closeChatRoom(selectedRoomId, user.displayName);
      setShowCloseModal(false);
      setSelectedRoomId(null);
      setToast({ message: 'Đã đóng phòng chat.', type: 'success' });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  return (
    <div className="chat-page">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      <Modal
        isOpen={showCreateModal}
        title="Tạo phòng chat mới"
        message="Nhập tên phòng để bắt đầu trao đổi với tham vấn viên."
        inputPlaceholder="Ví dụ: Tư vấn tâm lý - Buổi 1"
        requireInput
        confirmText="Tạo phòng"
        cancelText="Hủy"
        onConfirm={handleCreateRoom}
        onCancel={() => setShowCreateModal(false)}
      />

      <Modal
        isOpen={showCloseModal}
        title="Đóng phòng chat"
        message={`Bạn có chắc muốn đóng phòng "${selectedRoom?.title}"? Sau khi đóng, không ai có thể gửi tin nhắn mới.`}
        variant="danger"
        confirmText="Đóng phòng"
        cancelText="Hủy"
        onConfirm={handleCloseRoom}
        onCancel={() => setShowCloseModal(false)}
      />

      <div className="chat-container">
        <div className="chat-header">
          <h1>Chat tư vấn trực tuyến</h1>
          <p>Tham gia hoặc tạo phòng chat để trao đổi bảo mật với tham vấn viên tâm lý học đường.</p>
        </div>

        <div className="chat-layout">
          {/* Xem danh sách phòng chat */}
          <aside className="chat-sidebar">
            <div className="chat-sidebar-header">
              <h2>Danh sách phòng</h2>
              <button className="btn-create-room" onClick={() => setShowCreateModal(true)}>
                <span>+</span> Tạo phòng
              </button>
            </div>

            <div className="room-list">
              {rooms.length === 0 ? (
                <div className="room-empty">
                  <p>Chưa có phòng chat nào.</p>
                  <p>Nhấn &quot;Tạo phòng&quot; để bắt đầu!</p>
                </div>
              ) : (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`room-item ${selectedRoomId === room.id ? 'active' : ''}`}
                    onClick={() => handleSelectRoom(room)}
                  >
                    <div className="room-item-title">{room.title}</div>
                    <div className="room-item-meta">
                      <span>{room.createdByName}</span>
                      <span className="room-status open">● Mở</span>
                    </div>
                    {room.lastMessage && (
                      <div className="room-item-preview">{room.lastMessage}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Khu vực trao đổi */}
          <section className="chat-main">
            {!selectedRoom ? (
              <div className="chat-main-empty">
                <div className="chat-main-empty-icon">💬</div>
                <h3>Chọn hoặc tạo phòng chat</h3>
                <p>Chọn phòng từ danh sách bên trái hoặc tạo phòng mới để bắt đầu trao đổi.</p>
              </div>
            ) : (
              <>
                <div className="chat-room-header">
                  <div>
                    <h3>{selectedRoom.title}</h3>
                    <div className="chat-room-header-meta">
                      Tạo bởi {selectedRoom.createdByName} · {selectedRoom.participantIds?.length || 0} thành viên
                    </div>
                  </div>
                  {isOwner && !isClosed && (
                    <button className="btn-close-room" onClick={() => setShowCloseModal(true)}>
                      Đóng phòng
                    </button>
                  )}
                </div>

                <div className="messages-area">
                  {messages.map((msg) => {
                    const isOwn = msg.senderId === user.uid;
                    const isSystem = msg.senderRole === 'system';

                    return (
                      <div
                        key={msg.id}
                        className={`message ${isSystem ? 'system' : isOwn ? 'own' : 'other'}`}
                      >
                        {!isSystem && !isOwn && (
                          <span className="message-sender">{msg.senderName}</span>
                        )}
                        <div className="message-bubble">{msg.text}</div>
                        {!isSystem && (
                          <span className="message-time">{formatTimestamp(msg.createdAt)}</span>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {isClosed ? (
                  <div className="chat-closed-notice">
                    Phòng chat này đã được đóng. Không thể gửi tin nhắn mới.
                  </div>
                ) : (
                  <div className={`chat-input-area ${!isParticipant ? 'disabled' : ''}`}>
                    <textarea
                      className="chat-input"
                      rows={1}
                      placeholder="Nhập tin nhắn... (Enter để gửi)"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!isParticipant || sending}
                    />
                    <button
                      className="btn-send"
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sending || !isParticipant}
                    >
                      Gửi
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
