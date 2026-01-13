import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import { getComments, postComment } from '../api';
import { useAuth } from '../context/AuthContext';

const CommentsDrawer = ({ videoId, onClose }) => {
    const { user, token } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const commentsBottomRef = useRef(null);

    useEffect(() => {
        const fetchComments = async () => {
            setLoading(true);
            try {
                const data = await getComments(videoId);
                setComments(data);
            } catch (err) {
                console.error("Failed comments", err);
            } finally {
                setLoading(false);
            }
        };
        if (videoId) fetchComments();
    }, [videoId]);

    useEffect(() => {
        // Auto-scroll to bottom on load/new comment
        if (commentsBottomRef.current) {
            commentsBottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [comments]);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        try {
            await postComment(videoId, newComment, token);
            const mockComment = {
                id: Date.now(),
                content: newComment,
                owner: { username: user.username },
                created_at: new Date().toISOString()
            };
            setComments(prev => [...prev, mockComment]);
            setNewComment('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="comments-drawer-overlay" onClick={onClose}>
            <div className="comments-drawer" onClick={e => e.stopPropagation()}>
                <div className="comments-header">
                    <h3>{comments.length} Comments</h3>
                    <button className="icon-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="comments-list">
                    {loading ? (
                        <div className="loader-spinner" />
                    ) : comments.length === 0 ? (
                        <div className="empty-state">
                            <p>No comments yet. Say something nice!</p>
                        </div>
                    ) : (
                        comments.map(c => (
                            <div key={c.id} className="comment-item">
                                <div className="comment-avatar avatar-placeholder">
                                    {c.owner?.profile_pic ? (
                                        <img src={c.owner.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        <span>{c.owner?.username?.[0].toUpperCase() || '?'}</span>
                                    )}
                                </div>
                                <div className="comment-body">
                                    <div className="comment-meta">
                                        <span className="username">@{c.owner?.username || 'user'}</span>
                                        <span className="date">{new Date(c.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="comment-text">{c.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={commentsBottomRef} />
                </div>

                <div className="comment-input-area">
                    {user ? (
                        <form onSubmit={handlePost} className="input-wrapper">
                            <input
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Add a comment..."
                            />
                            <button type="submit" disabled={!newComment.trim()} className="send-btn">
                                <Send size={18} />
                            </button>
                        </form>
                    ) : (
                        <p className="login-prompt">Log in to comment</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentsDrawer;
