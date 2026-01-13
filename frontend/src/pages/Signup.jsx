import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BASE_URL } from '../api';
import { Mail, Lock, User, Zap } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isAvailable, setIsAvailable] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState('');
    const { signup, login, googleLogin } = useAuth();
    const navigate = useNavigate();

    const checkUsernameAvailability = async (val) => {
        if (val.length < 3) {
            setIsAvailable(null);
            return;
        }
        setIsChecking(true);
        try {
            const response = await fetch(`${BASE_URL}/auth/check-username?username=${val}`);
            const data = await response.json();
            setIsAvailable(data.available);
        } catch (err) {
            console.error("Availability check failed", err);
        } finally {
            setIsChecking(false);
        }
    };

    const handleUsernameChange = (e) => {
        const val = e.target.value.toLowerCase().replace(/\s/g, '');
        setUsername(val);
        checkUsernameAvailability(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isAvailable === false) {
            setError('Username is already taken');
            return;
        }
        try {
            await signup({ username, full_name: fullName, email, password });
            // After signup, log them in
            const user = await login({ username, password });
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to sign up');
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
                    <h1>Create Account</h1>
                    <p>Start your journey with Montage</p>
                </div>

                {error && <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <label>Username</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="choose_username"
                                value={username}
                                onChange={handleUsernameChange}
                                style={{
                                    paddingRight: '2.5rem',
                                    borderColor: isAvailable === false ? 'var(--accent-primary)' : isAvailable === true ? '#4ade80' : ''
                                }}
                                required
                            />
                            {isAvailable !== null && (
                                <div style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: isAvailable ? '#4ade80' : 'var(--accent-primary)'
                                }}>
                                    {isChecking ? '...' : isAvailable ? '✓' : '✗'}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                    <button type="submit" className="auth-button">Create Account</button>
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
                        text="signup_with"
                    />
                </div>

                <div className="auth-footer">
                    Already have an account? <Link to="/login" className="auth-link">Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
