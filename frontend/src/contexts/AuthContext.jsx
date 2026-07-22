// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    const userData = userDoc.data();

                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: userData?.displayName || firebaseUser.displayName || 'User',
                        avatarUrl: userData?.avatarUrl || firebaseUser.photoURL || '',
                        role: userData?.role || 'student',
                        isOnline: userData?.is_Online || false,
                        isActive: userData?.is_active || true,
                        emailVerified: firebaseUser.emailVerified || false,
                        isAnonymous: userData?.is_anonymous || false,
                        lastLogin: userData?.lastLogin || null,
                    });
                } catch (error) {
                    console.error('Lỗi lấy user từ Firestore:', error);
                    // Set default user data
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || 'User',
                        avatarUrl: firebaseUser.photoURL || '',
                        role: 'student',
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = { user, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};