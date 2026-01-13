import React, { useState, useEffect, useRef } from 'react';
import { getVideos, likeVideo, shareVideo } from '../api';
import FlashCard from '../components/FlashCard';
import CommentsDrawer from '../components/CommentsDrawer';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Flash = () => {
    const { showNotification } = useNotification();
    const [clips, setClips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideoId, setActiveVideoId] = useState(null);
    const [showCommentsId, setShowCommentsId] = useState(null);
    const [muted, setMuted] = useState(true);
    const { token } = useAuth();

    const observer = useRef(null);
    const containerRef = useRef(null);

    // Drag state
    const isDragging = useRef(false);
    const startY = useRef(0);
    const scrollTop = useRef(0);

    // Mouse Drag Handlers
    const handleMouseDown = (e) => {
        isDragging.current = true;
        startY.current = e.pageY;
        scrollTop.current = containerRef.current.scrollTop;
        containerRef.current.classList.add('dragging');
    };

    const handleMouseLeave = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        containerRef.current.classList.remove('dragging');
    };

    const handleMouseUp = () => {
        if (!isDragging.current) return;
        isDragging.current = false;
        containerRef.current.classList.remove('dragging');

        // Optional: Manual snap logic if needed, but CSS snap usually takes over once user releases
        // Just let it settle
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const y = e.pageY;
        const walk = (y - startY.current) * 1.5; // Scroll-fast multiplier
        containerRef.current.scrollTop = scrollTop.current - walk;
    };

    useEffect(() => {
        const fetchClips = async () => {
            try {
                // Pass token to get personalized data (liked_by_user)
                const data = await getVideos('flash', token);
                setClips(data.map(video => ({
                    ...video,
                    liked: video.liked_by_user,
                    song: "Original Audio"
                })));
                if (data.length > 0 && !activeVideoId) setActiveVideoId(data[0].id);
            } catch (err) {
                console.error("Failed to load clips", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClips();
    }, [token]);

    useEffect(() => {
        if (loading) return;

        const handleIntersection = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = parseInt(entry.target.getAttribute('data-id'));
                    setActiveVideoId(id);
                }
            });
        };

        observer.current = new IntersectionObserver(handleIntersection, {
            root: null, // viewport
            threshold: 0.6
        });

        const items = document.querySelectorAll('.flash-item-container');
        items.forEach(el => observer.current.observe(el));

        return () => observer.current?.disconnect();
    }, [loading, clips]);

    const scrollToVideo = (direction) => {
        const currentIndex = clips.findIndex(c => c.id === activeVideoId);
        if (currentIndex === -1 && clips.length > 0) return; // Should not happen usually

        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < clips.length) {
            const nextId = clips[nextIndex].id;
            const element = document.querySelector(`[data-id="${nextId}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                scrollToVideo(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                scrollToVideo(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeVideoId, clips]);

    const handleLike = async (id) => {
        if (!token) {
            showNotification('info', "Please login to like videos!");
            return;
        }

        // Optimistic UI update
        setClips(prev => prev.map(c =>
            c.id === id ? { ...c, liked: !c.liked, likes_count: c.liked ? c.likes_count - 1 : c.likes_count + 1 } : c
        ));

        try {
            const response = await likeVideo(id, token);
            // Sync with backend count
            if (response && response.likes_count !== undefined) {
                setClips(prev => prev.map(c =>
                    c.id === id ? { ...c, likes_count: response.likes_count } : c
                ));
            }
        } catch (err) {
            console.error("Failed to like video", err);
            // Revert if failed
            setClips(prev => prev.map(c =>
                c.id === id ? { ...c, liked: !c.liked, likes_count: c.liked ? c.likes_count - 1 : c.likes_count + 1 } : c
            ));
        }
    };

    const handleShare = async (id) => {
        await navigator.clipboard.writeText(`${window.location.origin}/watch/${id}`);
        showNotification('success', "Link copied!");

        try {
            await shareVideo(id);
        } catch (err) {
            console.error("Failed to share video", err);
        }
    };

    if (loading) return <div className="loading-screen">Loading Feed...</div>;

    return (
        <div
            className="flash-container"
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
        >
            <div className="flash-feed">
                {clips.length > 0 ? (
                    clips.map(clip => (
                        <div className="flash-item-container" key={clip.id} data-id={clip.id}>
                            <FlashCard
                                video={clip}
                                isActive={activeVideoId === clip.id}
                                onLike={handleLike}
                                onComment={setShowCommentsId}
                                onShare={handleShare}
                                muted={muted}
                                toggleMute={() => setMuted(!muted)}
                            />
                        </div>
                    ))
                ) : (
                    <div className="empty-feed">
                        <p>No videos found. Check back later!</p>
                    </div>
                )}
            </div>

            <div className="flash-nav-controls">
                <button
                    className="nav-control-btn"
                    onClick={() => scrollToVideo(-1)}
                    aria-label="Previous Video"
                >
                    <ChevronUp size={28} />
                </button>
                <button
                    className="nav-control-btn"
                    onClick={() => scrollToVideo(1)}
                    aria-label="Next Video"
                >
                    <ChevronDown size={28} />
                </button>
            </div>

            {showCommentsId && (
                <CommentsDrawer
                    videoId={showCommentsId}
                    onClose={() => setShowCommentsId(null)}
                />
            )}
        </div>
    );
};

export default Flash;
