import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, tokenStore } from '../lib/api';

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const requestOtp = async (phoneNumber) => authApi.requestOtp(phoneNumber);

  const verifyOtp = async (phoneNumber, otp) => {
    const result = await authApi.verifyOtp(phoneNumber, otp);
    tokenStore.set(result.token);
    setUser(result.user);
    return result.user;
  };

  const updateProfile = async (payload) => {
    const updated = await authApi.updateProfile(payload);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  const isProfileComplete = !!user?.name && !!user?.businessName;

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isProfileComplete,
    requestOtp,
    verifyOtp,
    updateProfile,
    logout,
    refreshUser: loadCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
