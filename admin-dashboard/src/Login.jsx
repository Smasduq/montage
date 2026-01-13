import React, { useState } from 'react';
import { login, getMe } from './api';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Login = ({ setToken }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const data = await login(username, password);
            const user = await getMe(data.access_token);

            if (user.role !== 'admin') {
                setError('Access Denied: Admins only.');
                return;
            }

            setToken(data.access_token);
            localStorage.setItem('adminToken', data.access_token);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Invalid credentials or server error');
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0f0f0f', color: '#fff', fontFamily: 'Inter, sans-serif'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: '#1a1a1a', padding: '3rem', borderRadius: '1rem',
                width: '100%', maxWidth: '400px', border: '1px solid #333',
                display: 'flex', flexDirection: 'column', gap: '1.5rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Admin Access</h1>
                    <p style={{ color: '#888' }}>Restricted Area</p>
                </div>

                {error && <div style={{ color: '#ef4444', background: '#451a1a', padding: '0.8rem', borderRadius: '0.5rem', textAlign: 'center' }}>{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#aaa' }}>Username</label>
                    <input
                        type="text"
                        value={username} onChange={e => setUsername(e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #333', background: '#252525', color: 'white', outline: 'none' }}
                        required
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: '#aaa' }}>Password</label>
                    <input
                        type="password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        style={{ padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid #333', background: '#252525', color: 'white', outline: 'none' }}
                        required
                    />
                </div>

                <button type="submit" style={{
                    padding: '1rem', borderRadius: '0.5rem', border: 'none',
                    background: '#ef4444', color: 'white', fontWeight: 600,
                    cursor: 'pointer', marginTop: '1rem', fontSize: '1rem'
                }}>
                    Login to Console
                </button>
            </form>
        </div>
    );
};

export default Login;
