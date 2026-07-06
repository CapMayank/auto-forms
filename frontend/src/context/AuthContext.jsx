import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('bfms_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:8000/api/login', { username, password });
      const userData = { username: res.data.username, role: res.data.role, token: res.data.token };
      setUser(userData);
      localStorage.setItem('bfms_user', JSON.stringify(userData));
      return { success: true };
    } catch (err) {
      return { success: false, message: "Invalid username or password" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('bfms_user');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
