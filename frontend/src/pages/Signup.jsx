import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api';
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
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const { signup, login, googleLogin } = useAuth();
    const navigate = useNavigate();

    const passwordRequirements = [
        { label: '8+ characters', met: password.length >= 8 },
        { label: 'Uppercase', met: /[A-Z]/.test(password) },
        { label: 'Lowercase', met: /[a-z]/.test(password) },
        { label: 'Digit', met: /[0-9]/.test(password) },
        { label: 'Special symbol', met: /[!@#$%^&*()\-_=+[\]{}|;:'",.<>/?`~]/.test(password) },
    ];

    const isPasswordValid = passwordRequirements.every(req => req.met);

    const checkUsernameAvailability = async (val) => {
        if (val.length < 3) {
            setIsAvailable(null);
            return;
        }
        setIsChecking(true);
        try {
            const response = await fetch(`${API_BASE_URL}/auth/check-username?username=${val}`);
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

        if (!isPasswordValid) {
            setError('Please meet all password requirements');
            return;
        }

        try {
            await signup({ username, full_name: fullName, email, password });
            setIsVerifying(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to sign up');
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: verificationCode })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Verification failed');

            // Login after verification
            await login({ username, password });
            navigate('/');
        } catch (err) {
            setError(err.message || 'Verification failed');
        }
    };

    if (isVerifying) {
        return (
            <div className="auth-container">
                <div className="auth-card glass">
                    <div className="auth-header">
                        <div className="logo-section" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
                            <Zap size={40} fill="currentColor" />
                            <span>MONTAGE</span>
                        </div>
                        <h1>Verify Email</h1>
                        <p>We've sent a 6-digit code to {email}</p>
                    </div>

                    {error && <div style={{ color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <form className="auth-form" onSubmit={handleVerifyCode}>
                        <div className="input-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                maxLength="6"
                                placeholder="123456"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 'bold' }}
                                required
                            />
                        </div>
                        <button type="submit" className="auth-button">Verify & Continue</button>
                    </form>

                    <div className="auth-footer">
                        Didn't get a code? <button onClick={() => setIsVerifying(false)} className="auth-link" style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>Go Back</button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <div className="password-requirements" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            marginTop: '0.8rem',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            {passwordRequirements.map((req, idx) => (
                                <div key={idx} style={{
                                    color: req.met ? '#4ade80' : 'rgba(255,255,255,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: req.met ? '600' : '400',
                                    transition: 'all 0.2s ease'
                                }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: req.met ? '#4ade80' : 'rgba(255,255,255,0.2)',
                                        boxShadow: req.met ? '0 0 8px #4ade80' : 'none'
                                    }} />
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={!isPasswordValid || isAvailable === false}
                        style={{
                            marginTop: '1.5rem',
                            opacity: (!isPasswordValid || isAvailable === false) ? 0.5 : 1,
                            transform: (!isPasswordValid || isAvailable === false) ? 'none' : 'scale(1)',
                            boxShadow: isPasswordValid && isAvailable !== false ? '0 4px 15px rgba(255, 60, 60, 0.3)' : 'none'
                        }}
                    >
                        Create Account
                    </button>
                </form>

                <div className="auth-divider">OR</div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                        onSuccess={credentialResponse => {
                            googleLogin(credentialResponse.credential)
                                .then(() => {
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
