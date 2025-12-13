import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                const response = await api.get('/auth/me');
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('token');
                delete api.defaults.headers.common['Authorization'];
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, ...userData } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const loginWithGoogle = async (credential, role = null, teacherCode = null) => {
        const payload = { credential };
        if (role) payload.role = role;
        if (teacherCode) payload.teacherCode = teacherCode;

        const response = await api.post('/auth/google', payload);

        // Check if this is a new user needing role selection
        if (response.data.needsRoleSelection) {
            return response.data; // Return without setting user
        }

        const { token, ...userData } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const register = async (name, email, password, role, teacherCode = '') => {
        const response = await api.post('/auth/register', { name, email, password, role, teacherCode });
        const { token, ...userData } = response.data;
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};
