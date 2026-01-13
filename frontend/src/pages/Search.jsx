import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Users, Play, Zap, Sparkles, AlertCircle } from 'lucide-react';
import { searchUnified } from '../api';

const Search = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search).get('q') || '';

    const [results, setResults] = useState({ videos: [], users: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const data = await searchUnified(query);
                setResults(data);
            } catch (err) {
                console.error("Search failed:", err);
                setError("Something went wrong with the search.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query]);

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

    const hasResults = results.users.length > 0 || results.videos.length > 0;

    return (
        <div className="search-page page-container" style={{ padding: '2rem' }}>
            <div className="search-header" style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <SearchIcon size={20} />
                    <span>Search results for</span>
                </div>
                <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>"{query}"</h1>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem' }}>
                    <div className="loader" style={{ margin: 'auto' }}></div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Gathering results...</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'rgba(255,0,0,0.05)', borderRadius: '1rem' }}>
                    <AlertCircle size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                    <h3>Oops! {error}</h3>
                    <button onClick={() => window.location.reload()} className="btn-active" style={{ marginTop: '1rem', padding: '0.5rem 2rem' }}>Try Again</button>
                </div>
            ) : !hasResults ? (
                <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--bg-surface)', borderRadius: '1rem' }}>
                    <Sparkles size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                    <h3>No users or videos matched your search.</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Try broadening your keywords.</p>
                </div>
            ) : (
                <div className="search-results-content">
                    {/* Users Section */}
                    {results.users.length > 0 && (
                        <div className="results-section" style={{ marginBottom: '4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem' }}>
                                <Users size={24} color="var(--accent-primary)" />
                                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Creators</h2>
                            </div>
                            <div style={{ display: 'flex', gap: '2rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                                {results.users.map(u => (
                                    <div
                                        key={u.id}
                                        className="user-card glass hover-scale"
                                        onClick={() => navigate(`/profile/${u.username}`)}
                                        style={{
                                            minWidth: '200px',
                                            padding: '1.5rem',
                                            borderRadius: '20px',
                                            textAlign: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-primary)', margin: '0 auto 1rem', overflow: 'hidden' }}>
                                            {u.profile_pic ? <img src={u.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>{u.username[0].toUpperCase()}</div>}
                                        </div>
                                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u.full_name || u.username}</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Videos Section */}
                    {results.videos.length > 0 && (
                        <div className="results-section">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem' }}>
                                <Play size={24} color="var(--accent-primary)" />
                                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Videos & Flash</h2>
                            </div>
                            <div className="search-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {results.videos.map(video => (
                                    <div
                                        key={video.id}
                                        className="search-result-item glass hover-scale"
                                        onClick={() => navigate(video.video_type === 'flash' ? '/flash' : `/watch/${video.id}`)}
                                        style={{
                                            display: 'flex',
                                            gap: '1.5rem',
                                            padding: '1rem',
                                            borderRadius: '20px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div className="result-thumb" style={{ position: 'relative', width: video.video_type === 'flash' ? '180px' : '300px', minWidth: video.video_type === 'flash' ? '180px' : '300px', aspectRatio: video.video_type === 'flash' ? '9/16' : '16/9', borderRadius: '15px', overflow: 'hidden' }}>
                                            <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            {video.video_type === 'flash' ? (
                                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255, 62, 62, 0.9)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>FLASH</div>
                                            ) : (
                                                <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{formatDuration(video.duration)}</div>
                                            )}
                                        </div>
                                        <div className="result-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'white' }}>{video.title}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.8rem' }}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(var(--accent-primary), #a00000)', overflow: 'hidden' }}>
                                                    {video.owner?.profile_pic && <img src={video.owner.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                </div>
                                                <span>{video.owner?.username} • {formatViews(video.views)} views</span>
                                            </div>
                                            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                                                Professional {video.video_type} content by {video.owner?.full_name || video.owner?.username}. Watch now on Montage.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;
