import React, { useRef, useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Music, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { viewVideo } from '../api';

const FlashCard = ({ video, isActive, onLike, onComment, onShare, muted, toggleMute }) => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const [viewCounted, setViewCounted] = useState(false);
    // Double tap logic
    const lastTap = useRef(0);

    useEffect(() => {
        if (isActive) {
            videoRef.current.play().catch(() => { });
            setPlaying(true);
            setViewCounted(false); // Reset for new active video
        } else {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
            setPlaying(false);
        }
    }, [isActive]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.muted = muted;
    }, [muted]);

    const handleTimeUpdate = (e) => {
        if (viewCounted || !video) return;

        const { currentTime, duration } = e.target;
        if (duration > 0) {
            // For short flash videos, count view after 15% or 3 seconds
            if ((currentTime / duration) > 0.15 || currentTime > 3) {
                setViewCounted(true);
                viewVideo(video.id).catch(console.error);
            }
        }
    };

    const handleTap = (e) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        if (now - lastTap.current < DOUBLE_TAP_DELAY) {
            // Double tap
            handleLikeAnimation(e);
            if (!video.liked) onLike(video.id);
        } else {
            // Single tap - toggle play
            togglePlay();
        }
        lastTap.current = now;
    };

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setPlaying(true);
        } else {
            videoRef.current.pause();
            setPlaying(false);
        }
    };

    const handleLikeAnimation = (e) => {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
    };

    return (
        <div className="flash-card">
            <div className="video-wrapper" onClick={handleTap}>
                <video
                    ref={videoRef}
                    src={video.video_url}
                    loop
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    className="flash-video-player"
                />

                {/* Heart Animation Overlay */}
                {showHeart && (
                    <div className="heart-pop">
                        <Heart size={100} fill="var(--accent-primary)" color="var(--accent-primary)" />
                    </div>
                )}

                {/* Play/Pause Indicator (optional, transient) */}
                {!playing && (
                    <div className="play-indicator">
                        <Play size={50} fill="rgba(255,255,255,0.5)" color="white" />
                    </div>
                )}
            </div>

            {/* Sidebar Actions */}
            <div className="flash-sidebar">
                <div className="sidebar-action" onClick={() => onLike(video.id)}>
                    <div className={`icon-circle ${video.liked ? 'liked' : ''}`}>
                        <Heart size={28} fill={video.liked ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)'} color={video.liked ? 'var(--accent-primary)' : 'white'} />
                    </div>
                    <span>{video.likes_count}</span>
                </div>

                <div className="sidebar-action" onClick={() => onComment(video.id)}>
                    <div className="icon-circle">
                        <MessageCircle size={28} fill="rgba(0,0,0,0.3)" color="white" />
                    </div>
                    <span>{video.comment_count}</span>
                </div>

                <div className="sidebar-action" onClick={() => onShare(video.id)}>
                    <div className="icon-circle">
                        <Share2 size={28} fill="rgba(0,0,0,0.3)" color="white" />
                    </div>
                    <span>Share</span>
                </div>
            </div>

            {/* Bottom Metadata */}
            <div className="flash-info">
                <div className="info-user">
                    <div
                        className="avatar-placeholder"
                        style={{ width: '42px', height: '42px', cursor: 'pointer', border: '2px solid white' }}
                        onClick={() => navigate(`/profile/${video.owner?.username}`)}
                    >
                        {video.owner?.profile_pic ? (
                            <img src={video.owner.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '1.2rem' }}>{video.owner?.username?.[0].toUpperCase()}</span>
                        )}
                    </div>
                    <div className="user-text-meta">
                        <h3
                            onClick={() => navigate(`/profile/${video.owner?.username}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            @{video.owner?.username || 'user'}
                        </h3>
                        <button
                            className="follow-btn"
                            onClick={() => navigate(`/profile/${video.owner?.username}`)}
                        >
                            Follow
                        </button>
                    </div>
                </div>
                <p className="info-description">{video.title}</p>
                <div className="info-music">
                    <Music size={14} />
                    <div className="marquee">
                        <span>{video.song || 'Original Sound'}</span>
                    </div>
                </div>
            </div>

            {/* Spinner Disc */}
            <div className={`disc-spinner ${playing ? 'spinning' : ''}`}>
                <div className="disc-art" />
            </div>

            {/* Mute Toggle */}
            <button className="mute-toggle" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
        </div>
    );
};

export default FlashCard;
