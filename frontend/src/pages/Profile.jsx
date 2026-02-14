import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Eye, Play, Zap, Grid, Heart, MessageSquare, Share2, Plus, Bell } from 'lucide-react';
import { getUserProfile, toggleFollow } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();
    const { showNotification, requestPushPermission } = useNotification();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('videos');
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const data = await getUserProfile(username, token);
                setProfile(data);
                setIsFollowing(data.is_following);
            } catch (err) {
                console.error("Profile error:", err);
                showNotification('error', 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [username, token]);

    const handleFollow = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const res = await toggleFollow(profile.id, token);
            setIsFollowing(res.is_following);
            setProfile(prev => ({
                ...prev,
                followers_count: res.is_following ? prev.followers_count + 1 : prev.followers_count - 1
            }));
        } catch (err) {
            console.error("Follow error:", err);
        }
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

    if (loading) return <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Profile...</div>;
    if (!profile) return <div className="page-container" style={{ textAlign: 'center', padding: '5rem' }}>User not found</div>;

    const isOwnProfile = currentUser?.username === profile.username;

    return (
        <div className="profile-page page-container">
            <div className="profile-header glass" style={{
                marginTop: '1rem',
                padding: '2.5rem 1.5rem',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2rem',
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center'
            }}>
                <div className="profile-avatar-wrapper" style={{ position: 'relative' }}>
                    <div style={{
                        width: '140px',
                        height: '140px',
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, var(--accent-primary), #a00000)',
                        padding: '4px'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            background: '#111',
                            overflow: 'hidden'
                        }}>
                            {profile.profile_pic ? (
                                <img src={profile.profile_pic} alt="" className="avatar-img" />
                            ) : (
                                <div className="avatar-placeholder" style={{ width: '100%', height: '100%', fontSize: '4rem' }}>
                                    {profile.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="profile-info" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <h1 style={{ fontSize: '2rem', margin: 0 }}>{profile.full_name || `@${profile.username}`}</h1>
                        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>@{profile.username}</div>

                        {isOwnProfile ? (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button className="btn-active" onClick={() => navigate('/settings')} style={{ padding: '0.6rem 2rem', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>Edit Profile</button>
                                {Notification.permission !== 'granted' && (
                                    <button
                                        className="btn-active glass"
                                        onClick={requestPushPermission}
                                        style={{
                                            padding: '0.6rem 1.5rem',
                                            borderRadius: '50px',
                                            background: 'rgba(var(--accent-rgb), 0.1)',
                                            border: '1px solid var(--accent-primary)',
                                            color: 'white',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <Bell size={16} />
                                        Enable Notifications
                                    </button>
                                )}
                            </div>
                        ) : (
                            <button
                                className={`btn-active ${isFollowing ? 'glass' : ''}`}
                                onClick={handleFollow}
                                style={{
                                    padding: '0.6rem 2.5rem',
                                    borderRadius: '50px',
                                    background: isFollowing ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)',
                                    border: isFollowing ? '1px solid var(--border-glass)' : 'none',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.95rem'
                                }}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>

                    {profile.bio && <p style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem', opacity: 0.8 }}>{profile.bio}</p>}

                    <div className="stats-row" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{profile.followers_count}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Followers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{profile.following_count}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Following</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{profile.total_views}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Views</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', padding: '0 1rem' }}>
                {['videos', 'flash', 'posts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '1rem',
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab ? 'white' : 'var(--text-muted)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s ease',
                            flexShrink: 0
                        }}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-glow)' }} />
                        )}
                    </button>
                ))}
            </div>

            <div className="tab-content" style={{ marginTop: '2rem', paddingBottom: '5rem' }}>
                {activeTab === 'videos' && (
                    <div className="video-grid">
                        {profile.videos.length > 0 ? profile.videos.map(v => (
                            <div key={v.id} className="video-item" onClick={() => navigate(`/watch/${v.id}`)}>
                                <div className="video-card">
                                    <img src={v.thumbnail_url} alt="" className="video-thumb" />
                                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{formatDuration(v.duration)}</div>
                                </div>
                                <div style={{ marginTop: '0.8rem', fontWeight: 600 }}>{v.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.views} views</div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No videos posted yet.</div>
                        )}
                    </div>
                )}
                {activeTab === 'flash' && (
                    <div className="flash-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '4px',
                        padding: '2px'
                    }}>
                        {profile.flash_videos.length > 0 ? profile.flash_videos.map(v => (
                            <div key={v.id} className="flash-item" onClick={() => navigate(`/flash`)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                                <div className="video-card flash-card" style={{
                                    aspectRatio: '1/1.3',
                                    borderRadius: '8px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <img src={v.thumbnail_url} alt="" className="video-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />

                                    {/* View Count Overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        fontWeight: 600,
                                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                                        zIndex: 2
                                    }}>
                                        <Eye size={14} />
                                        <span>{v.views || 0}</span>
                                    </div>

                                    {/* Gradient Overlay for visibility */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '40%',
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
                                        zIndex: 1
                                    }} />
                                </div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No flash videos yet.</div>
                        )}
                        <style>{`
                            .flash-item:hover .video-thumb {
                                transform: scale(1.05);
                            }
                        `}</style>
                    </div>
                )}
                {activeTab === 'posts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '700px', margin: '0 auto' }}>
                        {profile.posts.length > 0 ? profile.posts.map(p => (
                            <div key={p.id} className="glass" style={{ padding: '2rem', borderRadius: '16px' }}>
                                <div style={{ marginBottom: '1rem' }}>{p.content}</div>
                                {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', borderRadius: '12px' }} />}
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No posts yet.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
