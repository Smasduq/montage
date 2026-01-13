import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

import { BASE_URL } from '../api';

const API_BASE_URL = BASE_URL;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const fetchUser = async (authToken) => {
        const currentToken = authToken || token;
        if (currentToken) {
            try {
                const response = await axios.get(`${API_BASE_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${currentToken}` }
                });
                setUser(response.data);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch user:", error);
                if (!authToken) logout();
            }
        }
    };

    useEffect(() => {
        fetchUser().finally(() => setLoading(false));
    }, [token]);

    const login = async (credentials) => {
        const params = new URLSearchParams();
        params.append('username', credentials.username);
        params.append('password', credentials.password);

        const response = await axios.post(`${API_BASE_URL}/auth/token`, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        return await fetchUser(access_token);
    };

    const signup = async (userData) => {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
        return response.data;
    };

    const googleLogin = async (credential) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/google`, { credential });
            const { access_token } = response.data;
            localStorage.setItem('token', access_token);
            setToken(access_token);
            return await fetchUser(access_token);
        } catch (error) {
            console.error("Google Login Error:", error.response?.data || error.message);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
    };

    const updateAuthToken = (newToken) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout, updateAuthToken, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
