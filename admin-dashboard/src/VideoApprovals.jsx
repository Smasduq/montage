import React, { useEffect, useState } from 'react';
import { getPendingVideos, updateVideoStatus } from './api';
import { ShieldCheck, LogOut, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './context/NotificationContext';

const VideoApprovals = ({ token, setToken }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const { showNotification } = useNotification();

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const data = await getPendingVideos(token);
                setVideos(data);
            } catch (err) {
                console.error("Failed to fetch videos", err);
                if (err.response && err.response.status === 401) {
                    handleLogout();
                } else {
                    showNotification('error', 'Failed to fetch pending videos');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, [token]);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('adminToken');
        navigate('/');
    };

    const handleStatusUpdate = async (videoId, status) => {
        try {
            await updateVideoStatus(videoId, status, token);
            setVideos(videos.filter(v => v.id !== videoId));
            showNotification('success', `Video ${status} successfully`);
        } catch (err) {
            console.error("Failed to update video status", err);
            showNotification('error', 'Failed to update video status');
        }
    };

    if (loading) return <div style={{ background: '#0f0f0f', height: '100vh', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e5e5e5', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{
                background: '#1a1a1a', padding: '1rem 2rem', borderBottom: '1px solid #333',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ShieldCheck size={32} color="#ef4444" />
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Video Approvals</span>
                </div>
                <button onClick={handleLogout} style={{
                    background: 'none', border: '1px solid #333', color: '#aaa',
                    padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                }}>
                    <LogOut size={16} /> Logout
                </button>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
                        color: '#aaa', cursor: 'pointer', marginBottom: '2rem', fontSize: '1rem'
                    }}
                >
                    <ChevronLeft size={20} /> Back to Dashboard
                </button>

                {videos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#666', marginTop: '4rem' }}>
                        <h3>No pending videos found</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                        {videos.map(video => (
                            <div key={video.id} style={{
                                background: '#1a1a1a', borderRadius: '1rem', border: '1px solid #333', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{
                                    height: '180px', background: '#000', position: 'relative'
                                }}>
                                    {video.thumbnail_url ? (
                                        <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>No Preview</div>
                                    )}
                                    <span style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        background: 'rgba(0,0,0,0.7)', padding: '0.2rem 0.5rem', borderRadius: '4px',
                                        fontSize: '0.8rem', color: '#fff'
                                    }}>
                                        {video.video_type}
                                    </span>
                                </div>
                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{video.title}</h3>
                                    <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                        By {video.owner ? video.owner.username : 'Unknown'}
                                    </div>

                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={() => handleStatusUpdate(video.id, 'approved')}
                                            style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none',
                                                background: '#22c55e', color: 'black', fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(video.id, 'rejected')}
                                            style={{
                                                flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: 'none',
                                                background: '#ef4444', color: 'black', fontWeight: 600, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                            }}
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VideoApprovals;
