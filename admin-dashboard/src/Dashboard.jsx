import React, { useEffect, useState } from 'react';
import { getStats, getUsers, promoteUser } from './api';
import { Users, Video, ShieldCheck, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './context/NotificationContext';

const Dashboard = ({ token, setToken }) => {
    const [stats, setStats] = useState({ users: 0, videos: 0, premium_users: 0, total_views: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsData, usersData] = await Promise.all([
                    getStats(token),
                    getUsers(token)
                ]);
                setStats(statsData);
                setUsers(usersData);
            } catch (err) {
                console.error("Failed to fetch data", err);
                if (err.response && err.response.status === 401) {
                    handleLogout();
                }
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('adminToken');
        navigate('/');
    };

    const { showNotification } = useNotification();

    const handlePromote = async (userId, currentStatus) => {
        try {
            await promoteUser(userId, !currentStatus, token);
            setUsers(users.map(u => u.id === userId ? { ...u, is_premium: !currentStatus } : u));
            setStats(prev => ({
                ...prev,
                premium_users: !currentStatus ? prev.premium_users + 1 : prev.premium_users - 1
            }));
            showNotification('success', `User ${!currentStatus ? 'promoted to Premium' : 'demoted to Free'} successfully`);
        } catch (err) {
            console.error("Failed to update user", err);
            showNotification('error', "Failed to update user status");
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Montage Admin</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => navigate('/approvals')} style={{
                        background: '#333', border: 'none', color: '#e5e5e5',
                        padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600
                    }}>
                        <Video size={16} /> Approvals
                    </button>
                    <button onClick={handleLogout} style={{
                        background: 'none', border: '1px solid #333', color: '#aaa',
                        padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <StatCard icon={<Users size={24} color="#3b82f6" />} label="Total Users" value={stats.users} />
                    <StatCard icon={<Video size={24} color="#a855f7" />} label="Total Videos" value={stats.videos} />
                    <StatCard icon={<ShieldCheck size={24} color="#eab308" />} label="Premium Users" value={stats.premium_users} />
                    <StatCard icon={<Video size={24} color="#22c55e" />} label="Total Views" value={stats.total_views.toLocaleString()} />
                </div>

                {/* Users Table Section */}
                <div style={{ background: '#1a1a1a', borderRadius: '1rem', border: '1px solid #333', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>User Management</h2>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '0.5rem',
                                    border: '1px solid #333', background: '#252525', color: 'white', outline: 'none'
                                }}
                            />
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#222', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '1rem' }}>ID</th>
                                <th style={{ padding: '1rem' }}>Username</th>
                                <th style={{ padding: '1rem' }}>Email</th>
                                <th style={{ padding: '1rem' }}>Role</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                    <td style={{ padding: '1rem', color: '#666' }}>#{user.id}</td>
                                    <td style={{ padding: '1rem', fontWeight: 600 }}>{user.username}</td>
                                    <td style={{ padding: '1rem', color: '#aaa' }}>{user.email || '-'}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem',
                                            background: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                            color: user.role === 'admin' ? '#ef4444' : '#3b82f6'
                                        }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {user.is_premium ? (
                                            <span style={{ color: '#eab308', fontWeight: 600, fontSize: '0.9rem' }}>PREMIUM</span>
                                        ) : (
                                            <span style={{ color: '#666', fontSize: '0.9rem' }}>Free</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        {user.role !== 'admin' && (
                                            <button
                                                onClick={() => handlePromote(user.id, user.is_premium)}
                                                style={{
                                                    padding: '0.4rem 0.8rem', borderRadius: '0.4rem', border: 'none',
                                                    background: user.is_premium ? '#333' : '#eab308',
                                                    color: user.is_premium ? '#aaa' : 'black',
                                                    fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem'
                                                }}
                                            >
                                                {user.is_premium ? 'Revoke Premium' : 'Gift Premium'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

const StatCard = ({ icon, label, value }) => (
    <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #333', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ padding: '0.8rem', background: '#252525', borderRadius: '0.8rem' }}>{icon}</div>
        <div>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
        </div>
    </div>
);

export default Dashboard;
