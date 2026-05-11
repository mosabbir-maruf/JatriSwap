import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, onIdTokenChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase/firebase';
import { User } from '../types';
import {
  accountIsBanned,
  normalizeUserAccountStatus,
  sessionBannedToastMessage,
} from '../lib/userAccountStatus';

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
  /** True after we have seen `users/{uid}` exist at least once this session (avoids sign-out during signup race). */
  const userProfileEverExistedRef = useRef(false);
  /** True after we have seen `admins/{uid}` exist at least once this session. */
  const adminProfileEverExistedRef = useRef(false);
  const remoteSignOutInFlightRef = useRef(false);

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
        userProfileEverExistedRef.current = false;
        adminProfileEverExistedRef.current = false;
        remoteSignOutInFlightRef.current = false;

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

        const maybeSignOutIfProfileRemovedRemotely = () => {
          if (!initialUserLoadDone || !initialAdminLoadDone) return;
          if (remoteSignOutInFlightRef.current) return;
          if (auth.currentUser?.uid !== user.uid) return;
          if (userDocExists || adminDocExists) return;
          if (!userProfileEverExistedRef.current && !adminProfileEverExistedRef.current) return;
          remoteSignOutInFlightRef.current = true;
          void signOut(auth)
            .then(() => {
              toast.info("Your account is no longer available. You have been signed out.");
            })
            .catch((e: unknown) => {
              console.error("AuthContext signOut after remote profile delete:", e);
              remoteSignOutInFlightRef.current = false;
            });
        };

        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          initialUserLoadDone = true;
          if (docSnap.exists()) {
            userProfileEverExistedRef.current = true;
            const data = docSnap.data();
            const st = normalizeUserAccountStatus(data.status);
            if (accountIsBanned(st) && auth.currentUser?.uid === user.uid) {
              void signOut(auth).then(() => {
                toast.error(sessionBannedToastMessage());
              });
              maybeSetLoadingFalse();
              return;
            }
            userDocExists = true;
            setCurrentUser({ ...data, id: docSnap.id } as User);
          } else {
            userDocExists = false;
            if (!adminDocExists && initialAdminLoadDone) {
               setCurrentUser(null);
            }
            maybeSignOutIfProfileRemovedRemotely();
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
            adminProfileEverExistedRef.current = true;
            adminDocExists = true;
            setCurrentUser({ ...docSnap.data(), id: docSnap.id } as User);
          } else {
            adminDocExists = false;
            if (!userDocExists && initialUserLoadDone) {
               setCurrentUser(null);
            }
            maybeSignOutIfProfileRemovedRemotely();
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
