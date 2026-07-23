import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const ROOMS_COLLECTION = 'chatRooms';

export function subscribeToRooms(callback, statusFilter = null) {
  const q = query(collection(db, ROOMS_COLLECTION), orderBy('lastMessageAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      let rooms = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (statusFilter && statusFilter !== 'all') {
        rooms = rooms.filter((r) => r.status === statusFilter);
      }
      callback(rooms);
    },
    (error) => {
      console.error('Lỗi lấy danh sách phòng chat:', error);
      callback([]);
    }
  );
}

export function subscribeToMessages(roomId, callback) {
  const q = query(
    collection(db, ROOMS_COLLECTION, roomId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(messages);
    },
    (error) => {
      console.error('Lỗi lấy tin nhắn:', error);
      callback([]);
    }
  );
}

export async function createChatRoom({ title, userId, userName, userRole }) {
  const roomRef = await addDoc(collection(db, ROOMS_COLLECTION), {
    title: title.trim(),
    createdBy: userId,
    createdByName: userName,
    status: 'open',
    participantIds: [userId],
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessage: '',
  });

  await addDoc(collection(db, ROOMS_COLLECTION, roomRef.id, 'messages'), {
    senderId: 'system',
    senderName: 'Hệ thống',
    senderRole: 'system',
    text: `${userName} đã tạo phòng chat "${title.trim()}"`,
    createdAt: serverTimestamp(),
  });

  return roomRef.id;
}

export async function joinChatRoom(roomId, userId) {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Phòng chat không tồn tại');
  }

  const room = roomSnap.data();
  if (room.status === 'closed') {
    throw new Error('Phòng chat đã được đóng');
  }

  if (!room.participantIds?.includes(userId)) {
    await updateDoc(roomRef, {
      participantIds: arrayUnion(userId),
    });
  }

  return roomId;
}

export async function sendMessage({ roomId, senderId, senderName, senderRole, text }) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Phòng chat không tồn tại');
  }

  if (roomSnap.data().status === 'closed') {
    throw new Error('Phòng chat đã được đóng, không thể gửi tin nhắn');
  }

  await addDoc(collection(db, ROOMS_COLLECTION, roomId, 'messages'), {
    senderId,
    senderName,
    senderRole,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(roomRef, {
    lastMessageAt: serverTimestamp(),
    lastMessage: trimmed,
  });
}

export async function updateChatRoom(roomId, { title, status }) {
  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (status !== undefined) updates.status = status;

  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), updates);
}

export async function closeChatRoom(roomId, closedByName) {
  await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
    status: 'closed',
    closedAt: serverTimestamp(),
  });

  await addDoc(collection(db, ROOMS_COLLECTION, roomId, 'messages'), {
    senderId: 'system',
    senderName: 'Hệ thống',
    senderRole: 'system',
    text: `Phòng chat đã được đóng bởi ${closedByName}`,
    createdAt: serverTimestamp(),
  });
}

export async function deleteChatRoom(roomId) {
  await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
}

export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTimeShort(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}
