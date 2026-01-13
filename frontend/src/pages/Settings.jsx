import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';

import { BASE_URL } from '../api';

const API_BASE_URL = BASE_URL;

const Settings = () => {
    const { user, token, updateAuthToken, setUser } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        bio: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || '',
                full_name: user.full_name || '',
                bio: user.bio || ''
            });
            setAvatarPreview(user.profile_pic);
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));

        // Auto upload on selection
        const formData = new FormData();
        formData.append('file', file);

        setUploadingAvatar(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/users/upload-avatar`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Update local user context with new profile pic url immediately
            setUser(prev => ({ ...prev, profile_pic: res.data.profile_pic }));
            showNotification('success', 'Avatar updated successfully');
        } catch (err) {
            console.error(err);
            showNotification('error', 'Failed to upload avatar');
            setAvatarPreview(user.profile_pic); // Revert
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.put(`${API_BASE_URL}/users/me`, {
                username: formData.username,
                full_name: formData.full_name,
                bio: formData.bio
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const { user: updatedUser, access_token } = res.data;

            if (access_token) {
                updateAuthToken(access_token);
            }
            setUser(updatedUser);
            showNotification('success', 'Profile updated successfully');
        } catch (err) {
            console.error(err);
            showNotification('error', err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>Settings</h1>

            <div className="glass" style={{ padding: '3rem', borderRadius: '24px' }}>
                <h2 style={{ marginBottom: '2rem' }}>Profile Information</h2>

                <div style={{ display: 'flex', gap: '3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Avatar Section */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            position: 'relative',
                            margin: '0 auto 1rem',
                            background: '#222',
                            overflow: 'hidden'
                        }}>
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#555' }}>
                                    {formData.username?.[0]?.toUpperCase()}
                                </div>
                            )}

                            <label
                                htmlFor="avatar-upload"
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                className="avatar-overlay"
                            >
                                {uploadingAvatar ? <div className="spinner-small"></div> : <Camera size={20} />}
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Click to change avatar
                        </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} style={{ flex: 1, minWidth: '300px' }}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Full Name</label>
                            <input
                                type="text"
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Username</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className="glass-input"
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Bio</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                rows="4"
                                className="glass-input"
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                className="btn-active"
                                disabled={loading}
                                style={{
                                    padding: '1rem 3rem',
                                    borderRadius: '50px',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    opacity: loading ? 0.7 : 1
                                }}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
