import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Eye, Play, Zap, Grid, Heart, MessageSquare, Share2, Plus } from 'lucide-react';
import { getUserProfile, toggleFollow } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Profile = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const { token, user: currentUser } = useAuth();
    const { showNotification } = useNotification();

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
                padding: '3rem 2rem',
                borderRadius: '24px',
                display: 'flex',
                gap: '3rem',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div className="profile-avatar-wrapper" style={{ position: 'relative' }}>
                    <div style={{
                        width: '180px',
                        height: '180px',
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
                                <img src={profile.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="avatar-placeholder" style={{ width: '100%', height: '100%', fontSize: '4rem' }}>
                                    {profile.username[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="profile-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>{profile.full_name || `@${profile.username}`}</h1>
                        {isOwnProfile ? (
                            <button className="btn-active" onClick={() => navigate('/settings')} style={{ padding: '0.6rem 1.5rem', borderRadius: '50px', background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-glass)', color: 'white' }}>Edit Profile</button>
                        ) : (
                            <button
                                className={`btn-active ${isFollowing ? 'glass' : ''}`}
                                onClick={handleFollow}
                                style={{
                                    padding: '0.6rem 2rem',
                                    borderRadius: '50px',
                                    background: isFollowing ? 'rgba(255,255,255,0.1)' : 'var(--accent-primary)',
                                    border: isFollowing ? '1px solid var(--border-glass)' : 'none',
                                    color: 'white',
                                    fontWeight: 700
                                }}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>

                    <div style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>@{profile.username}</div>

                    {profile.bio && <p style={{ fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '600px' }}>{profile.bio}</p>}

                    <div className="stats-row" style={{ display: 'flex', gap: '3rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile.followers_count}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Followers</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile.following_count}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Following</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{profile.total_views}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Views</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="profile-tabs" style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['videos', 'flash', 'posts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '1rem 2rem',
                            background: 'none',
                            border: 'none',
                            color: activeTab === tab ? 'white' : 'var(--text-muted)',
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '1.5px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s ease'
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
                    <div className="video-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                        {profile.flash_videos.length > 0 ? profile.flash_videos.map(v => (
                            <div key={v.id} className="video-item" onClick={() => navigate(`/flash`)}>
                                <div className="video-card" style={{ aspectRatio: '9/16' }}>
                                    <img src={v.thumbnail_url} alt="" className="video-thumb" />
                                </div>
                                <div style={{ marginTop: '0.8rem', fontWeight: 600 }}>{v.title}</div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No flash videos yet.</div>
                        )}
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
