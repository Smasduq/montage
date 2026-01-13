import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = await login({ username, password });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to login');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card glass">
                <div className="auth-header">
                    <div className="logo-section" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                        <Zap size={40} fill="currentColor" />
                        <span>MONTAGE</span>
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Login to your cinematic experience</p>
                </div>

                {error && <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-button">Sign In</button>
                </form>

                <div className="auth-divider">OR</div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={credentialResponse => {
                            googleLogin(credentialResponse.credential)
                                .then((user) => {
                                    navigate('/');
                                })
                                .catch(err => setError(err.response?.data?.detail || 'Google Login Failed'));
                        }}
                        onError={() => {
                            setError('Google Login Failed');
                        }}
                        theme="filled_black"
                        shape="pill"
                    />
                </div>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
