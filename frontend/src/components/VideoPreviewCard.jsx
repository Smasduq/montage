import React, { useState, useRef, useEffect } from 'react';
import { Play } from 'lucide-react';

const VideoPreviewCard = ({ video, onClick, onLike }) => {
    const [isHovered, setIsHovered] = useState(false);
    const videoRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isHovered && videoRef.current) {
            videoRef.current.play().catch(err => {
                console.warn("Preview autoplay failed:", err);
            });
        }
    }, [isHovered]);

    const formatDuration = (seconds) => {
        if (!seconds) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="video-preview-card"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div className="preview-container">
                {/* Static Thumbnail */}
                <img
                    src={video.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=60"}
                    alt={video.title}
                    className={`thumbnail ${isHovered && isLoaded ? 'hidden' : ''}`}
                />

                {/* Video Preview */}
                {isHovered && (
                    <video
                        ref={videoRef}
                        src={video.video_url}
                        muted
                        loop
                        playsInline
                        onLoadedData={() => setIsLoaded(true)}
                        className={`preview-video ${isLoaded ? 'visible' : ''}`}
                    />
                )}

                {/* Duration Badge */}
                <div className="duration-badge">
                    {formatDuration(video.duration)}
                </div>

                {/* Hover Play Icon */}
                {isHovered && !isLoaded && (
                    <div className="preview-loading">
                        <div className="mini-loader"></div>
                    </div>
                )}

                {isHovered && isLoaded && (
                    <div className="preview-indicator">
                        <Play size={12} fill="white" />
                    </div>
                )}
            </div>

            <style>{`
                .video-preview-card {
                    cursor: pointer;
                    width: 100%;
                }
                .preview-container {
                    position: relative;
                    aspect-ratio: 16/9;
                    background: #000;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    transition: transform 0.3s ease;
                }
                .video-preview-card:hover .preview-container {
                    transform: scale(1.02);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                }
                .thumbnail {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: opacity 0.3s ease;
                }
                .thumbnail.hidden {
                    opacity: 0;
                }
                .preview-video {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
                .preview-video.visible {
                    opacity: 1;
                }
                .duration-badge {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    z-index: 10;
                }
                .preview-indicator {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: rgba(245, 158, 11, 0.9);
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.6rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    z-index: 10;
                    animation: fadeIn 0.3s ease;
                }
                .preview-loading {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.2);
                }
                .mini-loader {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255,255,255,0.1);
                    border-top-color: var(--accent-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default VideoPreviewCard;
