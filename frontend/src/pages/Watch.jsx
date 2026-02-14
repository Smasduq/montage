import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getVideoById, getComments, postComment, likeVideo, shareVideo, viewVideo } from '../api';
import { Heart, Share2, Send, MessageSquare, Download, X, Check } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const DownloadModal = ({ video, onClose, user }) => {
    const { showNotification } = useNotification();
    // ... rest of component
    // Helper to identify resolution availability
    const resolutions = [
        { label: '4K', value: '4k', src: video.url_4k, premium: true },
        { label: '2K', value: '2k', src: video.url_2k, premium: true },
        { label: '1080p', value: '1080p', src: video.url_1080p, premium: true },
        { label: '720p', value: '720p', src: video.url_720p, premium: false },
        { label: '480p', value: '480p', src: video.url_480p, premium: false },
    ].filter(r => r.src); // Only show available

    // fallback if no specific resolutions
    if (resolutions.length === 0 && video.video_url) {
        resolutions.push({ label: 'Original', value: 'original', src: video.video_url, premium: false });
    }

    const handleDownload = (res) => {
        if (res.premium && !user?.is_premium) {
            showNotification('info', 'Premium Required', { message: `Downloading ${res.label} requires a Premium subscription.` });
            return;
        }

        const link = document.createElement('a');
        link.href = res.src;
        link.download = `${video.title}_${res.label}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onClose();
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
        }}>
            <div className="modal-content glass" style={{
                background: '#1a1a1a', padding: '1.5rem', borderRadius: '1.5rem',
                width: '100%', maxWidth: '400px', position: 'relative',
                border: '1px solid var(--border-glass)',
                maxHeight: '80vh', overflowY: 'auto'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}><X size={20} /></button>

                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Download Quality</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {resolutions.map(res => (
                        <button
                            key={res.value}
                            onClick={() => handleDownload(res)}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '1.2rem', borderRadius: '1rem',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{res.label}</span>
                            {res.premium && !user?.is_premium ? (
                                <span style={{
                                    fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', color: '#aaa',
                                    padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 800
                                }}>Premium</span>
                            ) : (
                                <Download size={20} color="var(--accent-primary)" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Watch = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { token, user } = useAuth();
    const { showNotification } = useNotification();
    const [video, setVideo] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    const [viewCounted, setViewCounted] = useState(false);

    useEffect(() => {
        const fetchVideoData = async () => {
            try {
                // Check for share source
                const searchParams = new URLSearchParams(location.search);
                if (searchParams.get('source') === 'share') {
                    shareVideo(id).catch(console.error);
                }

                const [videoData, commentsData] = await Promise.all([
                    getVideoById(id, token),
                    getComments(id)
                ]);
                setVideo(videoData);
                setComments(commentsData);
            } catch (err) {
                console.error("Failed to load video data", err);
                setError("Video not found");
            } finally {
                setLoading(false);
            }
        };
        fetchVideoData();
    }, [id, location.search]);

    const handleTimeUpdate = (e) => {
        if (viewCounted || !video) return;

        const { currentTime, duration } = e.target;
        if (duration > 0) {
            let thresholdMet = false;

            // If video > 10 minutes (600s), count after 1 minute (60s)
            if (duration > 600) {
                if (currentTime >= 60) thresholdMet = true;
            } else {
                // Otherwise count after 15%
                if ((currentTime / duration) > 0.15) thresholdMet = true;
            }

            if (thresholdMet) {
                setViewCounted(true);
                viewVideo(id).catch(console.error);
                // Optimistic update
                setVideo(prev => ({ ...prev, views: (prev.views || 0) + 1 }));
            }
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        if (!token) return showNotification('info', "Please login to comment");

        try {
            const addedComment = await postComment(id, newComment, token);
            setComments([addedComment, ...comments]); // Prepend new comment
            setNewComment("");
        } catch (err) {
            console.error("Failed to post comment", err);
            showNotification('error', "Failed to post comment");
        }
    };

    const handleLike = async () => {
        if (!token) return showNotification('info', "Please login to like");
        try {
            await likeVideo(id, token);
            setVideo(prev => ({
                ...prev,
                liked_by_user: !prev.liked_by_user,
                likes_count: prev.liked_by_user ? prev.likes_count - 1 : prev.likes_count + 1
            }));
        } catch (err) {
            console.error("Failed to like video", err);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/watch/${id}?source=share`;
        await navigator.clipboard.writeText(shareUrl);
        showNotification('success', "Link copied to clipboard!");
        // No API call here anymore
    };

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.key.toLowerCase() === 'n') {
                e.preventDefault();
                // Navigate to a "next" video. 
                // For now, let's fetch videos and navigate to the first one that isn't the current etc.
                // Or if we had a list of recommendations, we'd use that.
                // Simple implementation: fetch home videos and go to one.
                const navigateToNext = async () => {
                    try {
                        const vids = await getVideos('home', token);
                        if (vids && vids.length > 0) {
                            // Filter out current and find next index or just pick a random one
                            const others = vids.filter(v => v.id.toString() !== id.toString());
                            if (others.length > 0) {
                                const next = others[Math.floor(Math.random() * others.length)];
                                navigate(`/watch/${next.id}`);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to find next video:", err);
                    }
                };
                navigateToNext();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [id, token, navigate]);

    if (loading) return <div className="page-loading">Loading...</div>;

    if (error || !video) return <div className="page-error">{error || "Video not found"}</div>;

    const actionBtnStyle = {
        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.8rem 1.5rem',
        borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer',
        transition: 'all 0.3s ease', fontSize: '0.95rem', fontWeight: 500
    };

    return (
        <div className="watch-container">
            <div className="watch-video-wrapper">
                <VideoPlayer video={video} autoPlay={true} onTimeUpdate={handleTimeUpdate} />
            </div>

            <div className="watch-meta" style={{ padding: '1.5rem 1rem' }}>
                <h1 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.3 }}>{video.title}</h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                            onClick={() => navigate(`/profile/${video.owner?.username}`)}
                            className="avatar-placeholder"
                            style={{
                                width: '48px', height: '48px', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            {video.owner?.profile_pic ? (
                                <img src={video.owner.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ fontSize: '1.2rem' }}>
                                    {video.owner?.username?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                onClick={() => navigate(`/profile/${video.owner?.username}`)}
                                style={{ fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                                className="hover-underline"
                            >
                                @{video.owner?.username || 'Unknown'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {video.views?.toLocaleString()} views • {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Recently'}
                            </div>
                        </div>
                    </div>

                    <div className="watch-actions" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', maskImage: 'linear-gradient(to right, black 90%, transparent)' }}>
                        <button
                            className={`watch-btn ${video.liked_by_user ? 'liked' : ''}`}
                            onClick={handleLike}
                            style={{ flexShrink: 0, padding: '0.6rem 1.2rem' }}
                        >
                            <Heart
                                size={18}
                                fill={video.liked_by_user ? 'currentColor' : 'none'}
                                color="currentColor"
                            />
                            {video.likes_count}
                        </button>
                        <button className="watch-btn" onClick={handleShare} style={{ flexShrink: 0, padding: '0.6rem 1.2rem' }}>
                            <Share2 size={18} /> Share
                        </button>
                        <button className="watch-btn" onClick={() => setShowDownloadModal(true)} style={{ flexShrink: 0, padding: '0.6rem 1.2rem' }}>
                            <Download size={18} /> Download
                        </button>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="comments-section" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={20} />
                        {comments.length} Comments
                    </h3>

                    {/* Comment Input */}
                    <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <div className="avatar-placeholder" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333' }} />
                        <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                                className="glass"
                                style={{
                                    flex: 1,
                                    padding: '0.8rem 1rem',
                                    borderRadius: '8px',
                                    color: 'white',
                                    border: '1px solid var(--border-glass)',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                className="btn-active"
                                disabled={!newComment.trim()}
                                style={{
                                    background: 'var(--accent-primary)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0 1rem',
                                    cursor: 'pointer',
                                    opacity: newComment.trim() ? 1 : 0.5
                                }}
                            >
                                <Send size={20} color="white" />
                            </button>
                        </div>
                    </form>

                    {/* Comments List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {comments.map(comment => (
                            <div key={comment.id} className="comment-item" style={{ display: 'flex', gap: '1rem' }}>
                                <div className="avatar-placeholder" style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#444' }} />
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>@{comment.owner?.username || 'User'}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : 'Just now'}
                                        </span>
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.4' }}>{comment.content}</p>
                                </div>
                            </div>
                        ))}
                        {comments.length === 0 && (
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet. Be the first to share your thoughts!</div>
                        )}
                    </div>
                </div>
            </div>

            {showDownloadModal && (
                <DownloadModal
                    video={video}
                    onClose={() => setShowDownloadModal(false)}
                    user={user}
                />
            )}
        </div>
    );
};

export default Watch;
