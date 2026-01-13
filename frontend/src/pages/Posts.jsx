import React from 'react';
import { Heart, MessageSquare, Repeat2, Send, MoreHorizontal } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Posts = () => {
    const { showNotification } = useNotification();
    const [posts, setPosts] = React.useState([
        {
            id: 1,
            user: "HorizonViews",
            time: "2h ago",
            content: "Just finished the mountain edit. The 8K export looks absolutely insane on the big screen! #cinematic #mountains #montage",
            image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80",
            likes: 245,
            comments: 18,
            liked: false
        },
        {
            id: 2,
            user: "UrbanExplorer",
            time: "5h ago",
            content: "Anyone know the best LUT for Sony S-Log3 in low light city environments? Looking for that moody blue vibe.",
            image: null,
            likes: 89,
            comments: 42,
            liked: false
        },
    ]);

    const handleLike = (id) => {
        setPosts(posts.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    };

    return (
        <div className="page-container" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '2.5rem' }}>Community Feed</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {posts.map(post => (
                    <div key={post.id} className="glass hover-scale" style={{ padding: '2rem', borderRadius: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--accent-primary), #ff8e8e)' }} />
                                <div>
                                    <div style={{ fontWeight: 700 }}>{post.user}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{post.time}</div>
                                </div>
                            </div>
                            <button
                                className="btn-active"
                                onClick={() => showNotification('info', 'Post options coming soon')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <MoreHorizontal size={20} />
                            </button>
                        </div>

                        <div style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                            {post.content}
                        </div>

                        {post.image && (
                            <div style={{ borderRadius: '16px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--border-glass)' }}>
                                <img src={post.image} alt="post content" style={{ width: '100%', display: 'block' }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => handleLike(post.id)}
                                className="btn-active"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: post.liked ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <Heart size={18} fill={post.liked ? 'var(--accent-primary)' : 'none'} /> {post.likes}
                            </button>
                            <button
                                onClick={() => showNotification('info', 'Comments Coming Soon')}
                                className="btn-active"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <MessageSquare size={18} /> {post.comments}
                            </button>
                            <button
                                onClick={() => showNotification('success', 'Reposted to your profile!')}
                                className="btn-active"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <Repeat2 size={18} />
                            </button>
                            <button
                                onClick={() => showNotification('success', 'Post link copied!')}
                                className="btn-active"
                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Posts;
