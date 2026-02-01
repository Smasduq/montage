import React, { useState, useEffect } from 'react';
import { Play, Flame, TrendingUp, Heart, Zap } from 'lucide-react';
import { getVideos, likeVideo } from '../api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Home = () => {
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { showNotification } = useNotification();
    const [videos, setVideos] = useState([]);
    const [flashVideos, setFlashVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const featured = {
        title: "Origins of the Peak",
        desc: "A breathtaking journey through the highest summits of the world, captured in stunning 8K detail.",
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80"
    };

    const fetchVideos = async () => {
        try {
            const [homeData, flashData] = await Promise.all([
                getVideos('home', token),
                getVideos('flash', token)
            ]);
            setVideos(Array.isArray(homeData) ? homeData : []);
            setFlashVideos(Array.isArray(flashData) ? flashData : []);

            if (!Array.isArray(homeData) || !Array.isArray(flashData)) {
                console.error("API returned non-array data:", { homeData, flashData });
                setError("Partial loading error. Some content might be missing.");
            }
        } catch (err) {
            console.error("Failed to fetch videos:", err);
            setError("Failed to load videos. Please try again.");
            setVideos([]);
            setFlashVideos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, [token]);

    const handleVideoClick = (id) => {
        navigate(`/watch/${id}`);
    };

    const handleFlashClick = () => {
        navigate('/flash');
    };

    const handleLike = async (e, videoId) => {
        e.stopPropagation();
        if (!token) {
            showNotification('info', 'Login Required', { message: 'Please login to like videos.' });
            navigate('/login');
            return;
        }

        try {
            const result = await likeVideo(videoId, token);
            setVideos(prev => prev.map(v =>
                v.id === videoId ? { ...v, liked_by_user: result.liked, likes_count: result.likes_count } : v
            ));
        } catch (err) {
            console.error("Like error:", err);
        }
    };

    const formatViews = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return "Just now";
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Just now";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="home-container page-container">
            {/* Hero Section */}
            <section className="hero-section">
                <img src={featured.image} alt="Featured" className="hero-image" />
                <div className="hero-content">
                    <div className="hero-badge">
                        <Flame size={14} /> <span>PREMIUM FEATURE</span>
                    </div>
                    <h1 className="hero-title">{featured.title}</h1>
                    <p className="hero-desc">{featured.desc}</p>
                    <button
                        className="btn-active hero-btn"
                        onClick={() => navigate(`/watch/${videos[0]?.id || 1}`)}
                    >
                        <Play fill="white" size={18} /> WATCH NOW
                    </button>
                </div>
            </section>

            {/* Trending Long Form */}
            <div style={{ padding: '2rem 0' }}>
                <div className="section-title">
                    <TrendingUp size={28} color="var(--accent-primary)" />
                    <h2 style={{ margin: 0 }}>Trending Now</h2>
                </div>

                <div className="video-grid">
                    {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>Loading videos...</div>}
                    {error && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--accent-primary)' }}>{error}</div>}

                    {!loading && !error && videos.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No videos found. Upload some to see them here!
                        </div>
                    )}

                    {videos.slice(0, 8).map(video => (
                        <div key={video.id} className="video-item" onClick={() => handleVideoClick(video.id)} style={{ cursor: 'pointer' }}>
                            <div className="video-card">
                                <img
                                    src={video.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60"}
                                    className="video-thumb"
                                    alt={video.title}
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/640x360?text=Error"; }}
                                />

                                <div
                                    className={`like-button-overlay ${video.liked_by_user ? 'liked' : ''}`}
                                    onClick={(e) => handleLike(e, video.id)}
                                >
                                    <Heart size={20} fill={video.liked_by_user ? "var(--accent-primary)" : "none"} />
                                </div>

                                <div style={{
                                    position: 'absolute',
                                    bottom: '10px',
                                    right: '10px',
                                    background: 'rgba(0,0,0,0.8)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    zIndex: 5
                                }}>
                                    {formatDuration(video.duration)}
                                </div>
                            </div>
                            <div className="video-details" style={{ marginTop: '0.8rem' }}>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div
                                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${video.owner?.username}`); }}
                                        className="avatar-placeholder"
                                        style={{
                                            minWidth: '36px',
                                            height: '36px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {video.owner?.profile_pic ? (
                                            <img src={video.owner.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '0.9rem' }}>{video.owner?.username?.[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', lineHeight: '1.2', marginBottom: '0.2rem' }}>{video.title}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            <span
                                                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${video.owner?.username}`); }}
                                                style={{ cursor: 'pointer' }}
                                                className="hover-underline"
                                            >
                                                {video.owner?.username || 'Unknown'}
                                            </span>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {formatViews(video.views)} views • {formatTimeAgo(video.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Flash Section (YouTube Shorts style) */}
            {flashVideos.length > 0 && (
                <div className="flash-shelf-container" style={{ margin: '2rem 0', padding: '2rem 0', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
                    <div className="section-title" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}><Zap size={28} fill="currentColor" /></div>
                            <h2 style={{ margin: 0 }}>Flash</h2>
                        </div>
                        <button
                            onClick={() => navigate('/flash')}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}
                        >
                            VIEW ALL
                        </button>
                    </div>

                    <div className="flash-shelf-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: '1rem',
                        marginTop: '1.5rem'
                    }}>
                        {flashVideos.slice(0, 18).map(flash => (
                            <div key={flash.id} className="flash-shelf-item hover-scale" onClick={handleFlashClick} style={{ cursor: 'pointer', textAlign: 'left' }}>
                                <div style={{
                                    aspectRatio: '9/16',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    background: 'var(--bg-surface)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                }}>
                                    <img src={flash.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        padding: '2rem 0.8rem 0.8rem',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)'
                                    }}>
                                        <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {flash.title}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>
                                            {formatViews(flash.views)} views
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* More Long Form */}
            {videos.length > 8 && (
                <div style={{ padding: '2rem 0', paddingBottom: '4rem' }}>
                    <div className="section-title">
                        <TrendingUp size={28} color="var(--accent-primary)" />
                        <h2 style={{ margin: 0 }}>More for you</h2>
                    </div>
                    <div className="video-grid">
                        {videos.slice(8).map(video => (
                            <div key={video.id} className="video-item" onClick={() => handleVideoClick(video.id)} style={{ cursor: 'pointer' }}>
                                <div className="video-card">
                                    <img src={video.thumbnail_url} className="video-thumb" alt={video.title} />
                                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                                        {formatDuration(video.duration)}
                                    </div>
                                </div>
                                <div className="video-details" style={{ marginTop: '0.8rem' }}>
                                    <div style={{ fontWeight: 600 }}>{video.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {video.owner?.username} • {formatViews(video.views)} views
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
