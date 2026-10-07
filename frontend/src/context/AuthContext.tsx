import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from '../firebase';

export interface ProfileMode {
  id: string;
  name: string;
  role: string;
  type: 'candidate' | 'coworker';
  avatar: string;
  githubUser: string;
}

const DEFAULT_CANDIDATE: ProfileMode = {
  id: '',
  name: 'Candidate',
  role: 'Software Engineer',
  type: 'candidate',
  avatar: '',
  githubUser: ''
};

const COWORKER_BENCHMARK: ProfileMode = {
  id: 'coworker-benchmark-0000-0000-000000000002',
  name: 'Coworker (Benchmark Peer)',
  role: 'Staff ML Engineer',
  type: 'coworker',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  githubUser: 'coworker-benchmark'
};

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  activeProfile: ProfileMode;
  isLoggedIn: boolean;
  authLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchProfile: (profileType: 'candidate' | 'coworker') => void;
  updateActiveProfile: (updates: Partial<ProfileMode>) => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANONYMOUS_PROFILE: ProfileMode = {
  id: '',
  name: 'Candidate',
  role: 'Software Engineer',
  type: 'candidate',
  avatar: '',
  githubUser: ''
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeProfile, setActiveProfile] = useState<ProfileMode>(ANONYMOUS_PROFILE);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          const profile = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Candidate',
            role: 'Software Engineer',
            type: 'candidate',
            avatar: firebaseUser.photoURL || '',
            githubUser: ''
          };
          setActiveProfile(profile);
          try {
            localStorage.setItem('pathprint_user_id', firebaseUser.uid);
            localStorage.setItem('pathprint_user', JSON.stringify({
              uid: firebaseUser.uid,
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL
            }));
          } catch(e) {}
        } catch (err) {
          console.error('Failed to get Firebase ID token:', err);
        }
      } else {
        setUser(null);
        setIdToken(null);
        setActiveProfile(ANONYMOUS_PROFILE);
        try {
          localStorage.removeItem('pathprint_user_id');
          localStorage.removeItem('pathprint_user');
        } catch(e) {}
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setUser(result.user);
      setIdToken(token);
      setActiveProfile({
        id: result.user.uid,
        name: result.user.displayName || 'Candidate',
        role: 'Software Engineer',
        type: 'candidate',
        avatar: result.user.photoURL || '',
        githubUser: ''
      });
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIdToken(null);
    setActiveProfile(ANONYMOUS_PROFILE);
  };

  const switchProfile = (profileType: 'candidate' | 'coworker') => {
    if (profileType === 'candidate') {
      if (user) {
        setActiveProfile({
          id: user.uid,
          name: user.displayName || 'Candidate',
          role: 'Software Engineer',
          type: 'candidate',
          avatar: user.photoURL || '',
          githubUser: ''
        });
      } else {
        setActiveProfile(ANONYMOUS_PROFILE);
      }
    } else {
      setActiveProfile(COWORKER_BENCHMARK);
    }
  };

  const updateActiveProfile = (updates: Partial<ProfileMode>) => {
    setActiveProfile(prev => ({
      ...prev,
      ...updates
    }));
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': activeProfile.id || 'anonymous',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        activeProfile,
        isLoggedIn: !!user,
        authLoading,
        loginWithGoogle,
        logout,
        switchProfile,
        updateActiveProfile,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
