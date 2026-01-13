import React, { useState, useEffect } from 'react';
import { Upload as UploadIcon, Video, Layout, CheckCircle } from 'lucide-react';
import { BASE_URL } from '../api';

import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Upload = () => {
    const { user, token } = useAuth();
    const [quotas, setQuotas] = useState({
        flash: { used: 0, total: 20, icon: <Video /> },
        home: { used: 0, total: 50, icon: <Video /> },
        posts: { used: 0, total: Infinity, icon: <Layout /> }
    });

    useEffect(() => {
        if (user) {
            setQuotas({
                flash: { used: user.flash_uploads || 0, total: 20, icon: <Video /> },
                home: { used: user.home_uploads || 0, total: 50, icon: <Video /> },
                posts: { used: 0, total: Infinity, icon: <Layout /> }
            });
        }
    }, [user]);

    const [showModal, setShowModal] = useState(false);
    const [currentType, setCurrentType] = useState(null);
    const [title, setTitle] = useState('');
    const [file, setFile] = useState(null);
    const [thumbnailFile, setThumbnailFile] = useState(null);

    const { showNotification, updateNotification, removeNotification } = useNotification();

    const handleUpload = async () => {
        if (!file || !title) {
            showNotification('error', "Please select a file and provide a title.");
            return;
        }

        setShowModal(false);
        const notificationId = showNotification('loading', `Uploading "${title}"...`, { progress: 0 });

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('video_type', currentType);
            formData.append('file', file);
            if (thumbnailFile) {
                formData.append('thumbnail', thumbnailFile);
            }

            // Using XMLHttpRequest for real upload progress
            const xhr = new XMLHttpRequest();

            const uploadPromise = new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        updateNotification(notificationId, { progress: percent, status: `Uploading "${title}" (${percent}%)` });
                    }
                });

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve(JSON.parse(xhr.responseText));
                        } else {
                            const errorData = xhr.responseText ? JSON.parse(xhr.responseText) : { detail: 'Upload failed' };
                            reject(new Error(errorData.detail || 'Upload failed'));
                        }
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));

                xhr.open('POST', `${BASE_URL}/videos/upload`);
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                xhr.send(formData);
            });

            const data = await uploadPromise;

            // Switch to Processing
            updateNotification(notificationId, {
                type: 'processing',
                status: 'Processing video...',
                progress: 0,
                message: 'Starting transcoding...'
            });

            const processingKey = data.processing_key;

            // Poll for processing progress
            if (processingKey) {
                const pollInterval = setInterval(async () => {
                    try {
                        const statusResp = await fetch(`${BASE_URL}/videos/status/${encodeURIComponent(processingKey)}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const statusData = await statusResp.json();

                        if (statusData) {
                            if (statusData.status === 'completed') {
                                clearInterval(pollInterval);
                                updateNotification(notificationId, {
                                    type: 'success',
                                    status: 'Upload Complete!',
                                    message: `"${title}" has been processed and is now live.`,
                                    progress: 100
                                });
                                setTimeout(() => removeNotification(notificationId), 3000);

                                setQuotas(prev => ({
                                    ...prev,
                                    [currentType]: { ...prev[currentType], used: prev[currentType].used + 1 }
                                }));
                                setTitle('');
                                setFile(null);
                                setThumbnailFile(null);
                            } else if (statusData.status === 'error') {
                                clearInterval(pollInterval);
                                updateNotification(notificationId, {
                                    type: 'error',
                                    status: 'Processing Failed',
                                    message: statusData.message || 'Unknown error occurred during processing.'
                                });
                            } else {
                                updateNotification(notificationId, {
                                    progress: statusData.progress,
                                    status: 'Processing Video...',
                                    message: statusData.message
                                });
                            }
                        }
                    } catch (err) {
                        console.error("Polling error:", err);
                    }
                }, 2000);
            } else {
                updateNotification(notificationId, { type: 'success', status: 'Upload successful!' });
            }

        } catch (error) {
            updateNotification(notificationId, { type: 'error', status: 'Upload Error', message: error.message });
        }
    };

    return (
        <div className="upload-container page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', marginBottom: '0.5rem' }}>Upload Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Manage your content and track your creator quotas.</p>

            <div className="video-grid" style={{ marginBottom: '4rem' }}>
                {Object.entries(quotas).map(([type, data]) => (
                    <div key={type} className="glass" style={{ padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                                {data.icon}
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{type} Quota</span>
                        </div>

                        <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
                            {data.used} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {data.total === Infinity ? '∞' : data.total}</span>
                        </div>

                        {data.total !== Infinity && (
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(data.used / data.total) * 100}%`,
                                    height: '100%',
                                    background: 'var(--accent-primary)',
                                    boxShadow: '0 0 10px var(--accent-glow)'
                                }} />
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setCurrentType(type);
                                setShowModal(true);
                            }}
                            className="btn-active"
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                padding: '1rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '12px',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            Upload New
                        </button>
                    </div>
                ))}
            </div>

            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div className="glass" style={{
                        width: '500px',
                        padding: '3rem',
                        borderRadius: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem'
                    }}>
                        <h2 style={{ fontSize: '1.8rem' }}>Upload {currentType}</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Video Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter a catchy title..."
                                style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '12px',
                                    color: 'white'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Select Video File</label>
                            <input
                                type="file"
                                onChange={(e) => setFile(e.target.files[0])}
                                accept="video/*"
                                style={{
                                    padding: '1rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '12px',
                                    color: 'white'
                                }}
                            />
                        </div>

                        {currentType === 'home' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Custom Thumbnail (Optional)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setThumbnailFile(e.target.files[0])}
                                    accept="image/*"
                                    style={{
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-glass)',
                                        borderRadius: '12px',
                                        color: 'white'
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn-active"
                                style={{
                                    flex: 1,
                                    padding: '1rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '12px',
                                    color: 'white'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                className="btn-active"
                                style={{
                                    flex: 2,
                                    padding: '1rem',
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: 'white',
                                    fontWeight: 700
                                }}
                            >
                                Start Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Upload;
