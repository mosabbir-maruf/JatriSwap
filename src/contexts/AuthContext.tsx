import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, onIdTokenChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  /** Call after e.g. `reload()` so React sees updated `emailVerified` (onAuthStateChanged does not always fire). */
  refreshFirebaseUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  firebaseUser: null,
  loading: true,
  refreshFirebaseUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFirebaseUser = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    await u.reload();
    setFirebaseUser(auth.currentUser);
  }, []);

  /** Keeps `firebaseUser` in sync after token refresh / profile reload (auth state callback alone misses some updates). */
  useEffect(() => {
    return onIdTokenChanged(auth, (user) => {
      setFirebaseUser(user);
    });
  }, []);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    let unsubscribeAdmin: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // After logout, `loading` is false; avoid a flash of Unauthorized while user/admin docs load.
        setLoading(true);

        if (unsubscribeUser) unsubscribeUser();
        if (unsubscribeAdmin) unsubscribeAdmin();
        
        let userDocExists = false;
        let adminDocExists = false;
        let initialUserLoadDone = false;
        let initialAdminLoadDone = false;

        const maybeSetLoadingFalse = () => {
          if (initialUserLoadDone && initialAdminLoadDone) {
            setLoading(false);
          }
        };

        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          initialUserLoadDone = true;
          if (docSnap.exists()) {
            userDocExists = true;
            setCurrentUser({ ...docSnap.data(), id: docSnap.id } as User);
          } else {
            userDocExists = false;
            if (!adminDocExists && initialAdminLoadDone) {
               setCurrentUser(null);
            }
          }
          maybeSetLoadingFalse();
        }, (error) => {
          console.error("AuthContext user snapshot error:", error);
          initialUserLoadDone = true;
          maybeSetLoadingFalse();
        });

        unsubscribeAdmin = onSnapshot(doc(db, "admins", user.uid), (docSnap) => {
          initialAdminLoadDone = true;
          if (docSnap.exists()) {
            adminDocExists = true;
            setCurrentUser({ ...docSnap.data(), id: docSnap.id } as User);
          } else {
            adminDocExists = false;
            if (!userDocExists && initialUserLoadDone) {
               setCurrentUser(null);
            }
          }
          maybeSetLoadingFalse();
        }, (error) => {
          console.error("AuthContext admin snapshot error:", error);
          initialAdminLoadDone = true;
          maybeSetLoadingFalse();
        });

      } else {
        if (unsubscribeUser) {
            unsubscribeUser();
            unsubscribeUser = undefined;
        }
        if (unsubscribeAdmin) {
            unsubscribeAdmin();
            unsubscribeAdmin = undefined;
        }
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeAdmin) unsubscribeAdmin();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, firebaseUser, loading, refreshFirebaseUser }}>
      {children}
    </AuthContext.Provider>
  );
};
