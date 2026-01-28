import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, Heart, DollarSign, Share2, Video, Zap, ArrowLeft, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserInsights } from '../api';

const Insights = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const data = await getUserInsights(token);
                setStats(data);
            } catch (err) {
                console.error("Error fetching insights:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, [token]);

    if (loading) return <div className="loading-screen"><div className="loader"></div></div>;

    const statCards = [
        { label: 'Total Views', value: stats?.total_views || 0, icon: TrendingUp, color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' },
        { label: 'Total Likes', value: stats?.total_likes || 0, icon: Heart, color: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
        { label: 'Estimated Earnings', value: `$${(stats?.total_earnings || 0).toFixed(2)}`, icon: DollarSign, color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
        { label: 'Total Shares', value: stats?.total_shares || 0, icon: Share2, color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' },
        { label: 'Followers', value: stats?.followers || 0, icon: Users, color: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
        { label: 'Following', value: stats?.following || 0, icon: Users, color: '#64748b', glow: 'rgba(100, 116, 139, 0.4)' },
    ];

    return (
        <div className="insights-page page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="insights-header" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
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
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Account Insights</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your performance and growth across Montage</p>
                </div>
            </div>

            <div className="stats-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                {statCards.map((stat, idx) => (
                    <div key={idx} className="glass hover-scale" style={{
                        padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '16px',
                            background: `rgba(${parseInt(stat.color.slice(1, 3), 16)}, ${parseInt(stat.color.slice(3, 5), 16)}, ${parseInt(stat.color.slice(5, 7), 16)}, 0.1)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: stat.color, boxShadow: `0 0 20px ${stat.glow}`
                        }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{stat.label}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="content-breakdown" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div className="glass" style={{ padding: '2rem', borderRadius: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <BarChart3 size={24} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '1.5rem' }}>Content Distribution</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="distribution-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Video size={16} /> Home Videos</span>
                                <span>{stats?.home_videos || 0}</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${((stats?.home_videos || 0) / ((stats?.home_videos || 0) + (stats?.flash_videos || 1)) * 100)}%`,
                                    background: 'var(--accent-primary)',
                                    boxShadow: '0 0 10px var(--accent-glow)'
                                }}></div>
                            </div>
                        </div>
                        <div className="distribution-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Zap size={16} /> Flash Clips</span>
                                <span>{stats?.flash_videos || 0}</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${((stats?.flash_videos || 0) / ((stats?.home_videos || 0) + (stats?.flash_videos || 1)) * 100)}%`,
                                    background: '#f59e0b',
                                    boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
                                }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255, 62, 62, 0.05) 0%, rgba(0, 0, 0, 0) 100%)' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Next Milestone</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>You're 240 views away from reaching 1,000 total views! Keep uploading quality content.</p>
                    <button className="hero-btn" onClick={() => navigate('/upload')}>Create New Content</button>
                </div>
            </div>
        </div>
    );
};

export default Insights;
