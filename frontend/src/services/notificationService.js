import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export const createNotification = async ({
    userId,
    title,
    message,
    type = 'system',
    relatedId = null,
    relatedType = null,
    extraData = {},
}) => {
    if (!userId || !title || !message) return null;

    try {
        const payload = {
            user_id: userId,
            title,
            message,
            type,
            read: false,
            createdAt: serverTimestamp(),
            ...extraData,
        };

        if (relatedId) payload.relatedId = relatedId;
        if (relatedType) payload.relatedType = relatedType;

        const ref = await addDoc(collection(db, 'notifications'), payload);
        return ref.id;
    } catch (error) {
        console.error('Lỗi tạo thông báo:', error);
        return null;
    }
};
