import React, { useEffect, useState } from 'react';
import { Trophy, Calendar, Lock, Upload, Eye, Zap, UserPlus, Heart, Award, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAchievements } from '../api';

const BADGES = [
    { id: 'FIRST_UPLOAD', name: 'First Upload', description: 'Uploaded your first video', icon: Upload },
    { id: '100_VIEWS', name: '100 Views', description: 'Reached 100 total views', icon: Eye },
    { id: '1000_VIEWS', name: '1k Club', description: 'Reached 1,000 total views', icon: Zap },
    { id: 'FIRST_FOLLOWER', name: 'First Follower', description: 'Gained your first follower', icon: UserPlus },
    { id: '5_LIKES', name: 'High Five', description: 'Received 5 likes on a video', icon: Heart },
    { id: 'TRENDING', name: 'Trending', description: 'Had a video appear in the trending section', icon: Flame },
];

const Achievements = () => {
    const { user, token } = useAuth();
    const [earnedAchievements, setEarnedAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const data = await getAchievements(token);
                setEarnedAchievements(data);
            } catch (error) {
                console.error("Failed to fetch achievements:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchAchievements();
        }
    }, [user, token]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="section-header">
                    <h2>Achievements</h2>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            </div>
        );
    }

    const earnedIds = new Set(earnedAchievements.map(a => a.milestone_name));

    // Merge backend data with static badge info
    const earnedList = earnedAchievements.map(ach => {
        const badgeInfo = BADGES.find(b => b.id === ach.milestone_name) || {
            name: ach.milestone_name.replace(/_/g, ' '),
            description: 'Custom Milestone',
            icon: Trophy
        };
        return { ...ach, ...badgeInfo };
    });

    const lockedList = BADGES.filter(b => !earnedIds.has(b.id));

    return (
        <div className="page-container">
            <div className="section-header">
                <h2><Award size={24} className="accent-icon" /> Achievements</h2>
                <p className="section-subtitle">Track your milestones and unlock new badges.</p>
            </div>

            <div className="achievements-section">
                <h3 className="section-title">Earned Badges</h3>
                {earnedList.length === 0 ? (
                    <div className="empty-state glass">
                        <Trophy size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <h3>No achievements yet</h3>
                        <p>Start uploading and engaging to earn badges!</p>
                    </div>
                ) : (
                    <div className="grid-layout">
                        {earnedList.map((ach) => (
                            <div key={ach.id} className="card glass achievement-card earned">
                                <div className="achievement-icon">
                                    <ach.icon size={32} color="#f59e0b" />
                                </div>
                                <div className="achievement-info">
                                    <h3>{ach.name}</h3>
                                    <p>{ach.description}</p>
                                    <div className="meta-info">
                                        <Calendar size={12} />
                                        <span>{new Date(ach.reached_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="achievements-section" style={{ marginTop: '3rem' }}>
                <h3 className="section-title">Waitlist (Locked)</h3>
                <div className="grid-layout">
                    {lockedList.map((badge) => (
                        <div key={badge.id} className="card glass achievement-card locked">
                            <div className="achievement-icon locked">
                                <Lock size={24} color="var(--text-muted)" />
                            </div>
                            <div className="achievement-info">
                                <h3>{badge.name}</h3>
                                <p>{badge.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .section-title {
                    margin-bottom: 1.5rem;
                    font-size: 1.2rem;
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border-glass);
                    padding-bottom: 0.5rem;
                }
                .achievement-card {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    transition: transform 0.2s;
                }
                .achievement-card.earned:hover {
                    transform: translateY(-2px);
                    border-color: var(--accent-primary);
                }
                .achievement-card.locked {
                    opacity: 0.7;
                    filter: grayscale(1);
                }
                .achievement-icon {
                    background: rgba(245, 158, 11, 0.1);
                    padding: 1rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .achievement-icon.locked {
                    background: rgba(255, 255, 255, 0.05);
                }
                .achievement-info h3 {
                    margin: 0 0 0.3rem 0;
                    text-transform: capitalize;
                    font-size: 1.1rem;
                }
                .achievement-info p {
                    margin: 0 0 0.5rem 0;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }
                .meta-info {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.8rem;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
};

export default Achievements;
