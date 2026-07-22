// contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc = null;
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            if (unsubscribeDoc) {
                unsubscribeDoc();
                unsubscribeDoc = null;
            }

            if (firebaseUser) {
                // Listen to user document in real time
                unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: userData?.DisplayName || userData?.displayName || firebaseUser.displayName || 'User',
                            avatarUrl: userData?.avatarUrl || '',
                            role: userData?.role || 'student',
                            isOnline: userData?.is_Online || false,
                            isActive: userData?.is_active || true,
                            isAnonymous: userData?.is_anonymous || false,
                        });
                    } else {
                        // Fallback if firestore document doesn't exist yet
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || 'User',
                            avatarUrl: firebaseUser.photoURL || '',
                            role: 'student',
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error('Lỗi lắng nghe document user:', error);
                    // Fallback on error
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || 'User',
                        avatarUrl: firebaseUser.photoURL || '',
                        role: 'student',
                    });
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) {
                unsubscribeDoc();
            }
        };
    }, []);

    const value = { user, loading };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};