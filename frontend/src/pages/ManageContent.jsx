import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Film, Zap, AlertTriangle, ArrowLeft, Layout, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, deleteVideo, deletePost } from '../api';

const ManageContent = () => {
    const { user, token } = useAuth();
    const [videos, setVideos] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'video'|'post', id: number }
    const [isDeleting, setIsDeleting] = useState(false);
    const [activeTab, setActiveTab] = useState('videos');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const profile = await getUserProfile(user.username, token);

                // Process videos
                const allVideos = [
                    ...(profile.videos || []).map(v => ({ ...v, type: 'home' })),
                    ...(profile.flash_videos || []).map(v => ({ ...v, type: 'flash' }))
                ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                setVideos(allVideos);

                // Process posts
                setPosts(profile.posts || []);
            } catch (err) {
                console.error("Error fetching content:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, token]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'video') {
                await deleteVideo(deleteTarget.id, token);
                setVideos(videos.filter(v => v.id !== deleteTarget.id));
            } else {
                await deletePost(deleteTarget.id, token);
                setPosts(posts.filter(p => p.id !== deleteTarget.id));
            }
            setDeleteTarget(null);
        } catch (err) {
            console.error("Error deleting content:", err);
            alert("Failed to delete content");
        } finally {
            setIsDeleting(false);
        }
    };

    const getTimeRemaining = (failedAt) => {
        if (!failedAt) return null;
        const failDate = new Date(failedAt);
        const expireDate = new Date(failDate.getTime() + 24 * 60 * 60 * 1000);
        const now = new Date();
        const diff = expireDate - now;

        if (diff <= 0) return "Expired";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m left`;
    };

    if (loading) return <div className="loading-screen" style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="loader"></div></div>;

    return (
        <div className="manage-content-page page-container" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="manage-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate(-1)}
                    className="glass"
                    style={{
                        width: '45px', height: '45px', borderRadius: '50%', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Manage Content</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>View and manage your videos and posts</p>
                </div>
            </div>

            <div className="tabs glass" style={{ display: 'flex', gap: '1rem', padding: '0.5rem', borderRadius: '16px', marginBottom: '2rem', width: 'fit-content' }}>
                <button
                    className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('videos')}
                    style={{
                        padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'videos' ? 'var(--accent-primary)' : 'transparent',
                        color: 'white', fontWeight: 600, transition: 'all 0.3s ease'
                    }}
                >
                    Videos ({videos.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('posts')}
                    style={{
                        padding: '0.8rem 1.5rem', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        background: activeTab === 'posts' ? 'var(--accent-primary)' : 'transparent',
                        color: 'white', fontWeight: 600, transition: 'all 0.3s ease'
                    }}
                >
                    Posts ({posts.length})
                </button>
            </div>

            <div className="content-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeTab === 'videos' ? (
                    videos.length === 0 ? (
                        <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '24px' }}>
                            <Film size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <h3>No videos found</h3>
                            <button className="hero-btn" style={{ marginTop: '2rem', marginInline: 'auto' }} onClick={() => navigate('/upload')}>Upload Now</button>
                        </div>
                    ) : (
                        videos.map(video => (
                            <div key={video.id} className="management-card glass hover-scale"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem',
                                    borderRadius: '16px', position: 'relative', border: video.status === 'failed' ? '1px solid rgba(255, 62, 62, 0.3)' : '1px solid transparent'
                                }}
                            >
                                <div className="card-thumb" style={{ width: '120px', height: '68px', borderRadius: '12px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                                    <img src={video.thumbnail_url} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: video.status === 'failed' ? 0.5 : 1 }} />
                                    <div style={{
                                        position: 'absolute', top: '5px', right: '5px',
                                        background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem'
                                    }}>
                                        {video.type === 'flash' ? <Zap size={10} fill="#ff3e3e" /> : video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : 'HD'}
                                    </div>
                                    {video.status === 'failed' && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,62,62,0.2)' }}>
                                            <AlertTriangle size={24} color="#ff3e3e" />
                                        </div>
                                    )}
                                </div>
                                <div className="card-info" style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                                        <h3 style={{ fontSize: '1rem' }}>{video.title}</h3>
                                        {video.status === 'failed' && <span style={{ background: '#ff3e3e', color: 'white', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>FAILED</span>}
                                        {video.status === 'pending' && <span style={{ background: '#f59e0b', color: 'black', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700 }}>PROCESSING</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <span>{video.views} views</span>
                                        <span>•</span>
                                        <span style={{ textTransform: 'capitalize' }}>{video.video_type}</span>
                                        {video.status === 'failed' && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: '#ff3e3e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {getTimeRemaining(video.failed_at)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDeleteTarget({ type: 'video', id: video.id })}
                                    style={{
                                        background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e', border: 'none',
                                        width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )
                ) : (
                    posts.length === 0 ? (
                        <div className="glass" style={{ padding: '4rem', textAlign: 'center', borderRadius: '24px' }}>
                            <Layout size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <h3>No posts found</h3>
                            <button className="hero-btn" style={{ marginTop: '2rem', marginInline: 'auto' }} onClick={() => navigate('/posts')}>View Feed</button>
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} className="management-card glass hover-scale"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1rem',
                                    borderRadius: '16px'
                                }}
                            >
                                {post.image_url && (
                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                                        <img src={post.image_url} alt="Post content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div className="card-info" style={{ flex: 1 }}>
                                    <p style={{ fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {post.content}
                                    </p>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDeleteTarget({ type: 'post', id: post.id })}
                                    style={{
                                        background: 'rgba(255, 62, 62, 0.1)', color: '#ff3e3e', border: 'none',
                                        width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Delete Modal */}
            {deleteTarget && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
                    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }}>
                    <div className="glass" style={{ maxWidth: '400px', width: '100%', padding: '2rem', borderRadius: '24px', textAlign: 'center' }}>
                        <div style={{ width: '60px', height: '60px', background: 'rgba(255, 62, 62, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#ff3e3e' }}>
                            <AlertTriangle size={30} />
                        </div>
                        <h2 style={{ marginBottom: '1rem' }}>Delete {deleteTarget.type === 'video' ? 'Video' : 'Post'}?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                            This action cannot be undone. This {deleteTarget.type} will be permanently removed from Montage.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="glass" style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', cursor: 'pointer' }} onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button
                                className="hero-btn"
                                style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#ff3e3e', boxShadow: '0 8px 20px rgba(255, 62, 62, 0.3)' }}
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageContent;
