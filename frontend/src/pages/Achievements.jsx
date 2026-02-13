import React, { useEffect, useState } from 'react';
import { Trophy, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAchievements } from '../api';

const Achievements = () => {
    const { user, token } = useAuth();
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAchievements = async () => {
            try {
                const data = await getAchievements(token);
                setAchievements(data);
            } catch (error) {
                console.error("Failed to fetch achievements:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchAchievements();
        }
    }, [user]);

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

    return (
        <div className="page-container">
            <div className="section-header">
                <h2><Trophy size={24} className="accent-icon" /> Your Achievements</h2>
                <p className="section-subtitle">Milestones you've reached on your journey.</p>
            </div>

            {achievements.length === 0 ? (
                <div className="empty-state glass">
                    <Trophy size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3>No achievements yet</h3>
                    <p>Start uploading and engaging to earn badges!</p>
                </div>
            ) : (
                <div className="grid-layout">
                    {achievements.map((ach) => (
                        <div key={ach.id} className="card glass achievement-card">
                            <div className="achievement-icon">
                                <Trophy size={32} color="#f59e0b" />
                            </div>
                            <div className="achievement-info">
                                <h3>{ach.milestone_name.replace(/_/g, ' ')}</h3>
                                <div className="meta-info">
                                    <Calendar size={14} />
                                    <span>{new Date(ach.reached_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .achievement-card {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    padding: 1.5rem;
                }
                .achievement-icon {
                    background: rgba(245, 158, 11, 0.1);
                    padding: 1rem;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .achievement-info h3 {
                    margin: 0 0 0.5rem 0;
                    text-transform: capitalize;
                }
                .meta-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    opacity: 0.7;
                }
            `}</style>
        </div>
    );
};

export default Achievements;
