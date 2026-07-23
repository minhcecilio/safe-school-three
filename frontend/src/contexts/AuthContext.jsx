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
        let unsubscribeSnapshot = null;

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    
                    if (unsubscribeSnapshot) {
                        unsubscribeSnapshot();
                    }

                    unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                displayName: userData?.displayName || userData?.DisplayName || firebaseUser.displayName || 'User',
                                avatarUrl: userData?.avatarUrl || firebaseUser.photoURL || '',
                                role: userData?.role || 'student',
                                isOnline: userData?.is_Online || false,
                                isActive: userData?.is_active || true,
                                emailVerified: firebaseUser.emailVerified || false,
                                isAnonymous: userData?.is_anonymous || false,
                                lastLogin: userData?.lastLogin || null,
                            });
                        } else {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                displayName: firebaseUser.displayName || 'User',
                                avatarUrl: firebaseUser.photoURL || '',
                                role: 'student',
                                isAnonymous: false,
                            });
                        }
                        setLoading(false);
                    }, (error) => {
                        console.error('Lỗi lắng nghe user từ Firestore:', error);
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || 'User',
                            avatarUrl: firebaseUser.photoURL || '',
                            role: 'student',
                            isAnonymous: false,
                        });
                        setLoading(false);
                    });
                } catch (error) {
                    console.error('Lỗi lấy user từ Firestore:', error);
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName || 'User',
                        avatarUrl: firebaseUser.photoURL || '',
                        role: 'student',
                        isAnonymous: false,
                    });
                    setLoading(false);
                }
            } else {
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribe();
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
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