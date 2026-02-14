import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Check, FastForward, Rewind } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import ShortcutGuide from './ShortcutGuide';

const VideoPlayer = ({ video, autoPlay = false, onTimeUpdate }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const { user } = useAuth();
    const { showNotification } = useNotification();

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [showGuide, setShowGuide] = useState(false);
    const [osd, setOsd] = useState({ visible: false, icon: null, text: '', key: 0 });
    const osdTimeout = useRef(null);

    const showOSD = (icon, text) => {
        if (osdTimeout.current) clearTimeout(osdTimeout.current);
        setOsd({ visible: true, icon, text, key: Date.now() });
        osdTimeout.current = setTimeout(() => {
            setOsd(prev => ({ ...prev, visible: false }));
        }, 1000);
    };

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('montage_shortcuts_seen');
        if (!hasSeenGuide) {
            setShowGuide(true);
        }
    }, []);

    const handleDismissGuide = () => {
        setShowGuide(false);
        localStorage.setItem('montage_shortcuts_seen', 'true');
    };

    // Resolution State
    const [currentResolution, setCurrentResolution] = useState(null); // '720p', '1080p', etc.
    const [currentSrc, setCurrentSrc] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [availableResolutions, setAvailableResolutions] = useState([]);

    // Initialize resolutions
    useEffect(() => {
        if (!video) return;

        const resList = [];
        if (video.url_4k) resList.push({ label: '4K', value: '4k', src: video.url_4k, premium: true });
        if (video.url_2k) resList.push({ label: '2K', value: '2k', src: video.url_2k, premium: true });
        if (video.url_1080p) resList.push({ label: '1080p', value: '1080p', src: video.url_1080p, premium: true });
        if (video.url_720p) resList.push({ label: '720p', value: '720p', src: video.url_720p, premium: false });
        if (video.url_480p) resList.push({ label: '480p', value: '480p', src: video.url_480p, premium: false });

        // Fallback to video_url if specific resolutions missing or as default
        if (resList.length === 0 && video.video_url) {
            resList.push({ label: 'Auto', value: 'auto', src: video.video_url, premium: false });
        }

        setAvailableResolutions(resList);

        // Set default resolution (720p or highest available free)
        const defaultRes = resList.find(r => r.value === '720p') || resList.find(r => !r.premium) || resList[resList.length - 1];
        if (defaultRes) {
            setCurrentResolution(defaultRes.value);
            setCurrentSrc(defaultRes.src);
        }
    }, [video]);

    useEffect(() => {
        if (videoRef.current && currentSrc) {
            videoRef.current.load();
            if (autoPlay) {
                videoRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.warn("Autoplay failed, user interaction required:", err);
                        setIsPlaying(false);
                    });
            }
        }
    }, [autoPlay, currentSrc]);

    const changeResolution = (resObject) => {
        if (resObject.premium && !user?.is_premium) {
            showNotification('info', "Premium Quality", { message: "This quality is available for Premium users only." });
            return;
        }

        if (resObject.value === currentResolution) return;

        const time = videoRef.current.currentTime;
        const wasPlaying = !videoRef.current.paused;

        setCurrentResolution(resObject.value);
        setCurrentSrc(resObject.src);
        setShowSettings(false);

        // React will update src, then we need to restore state after load
        // We use a small timeout or event listener for 'loadedmetadata' mostly handled by react re-render flow
        // But optimally:
        setTimeout(() => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                if (wasPlaying) videoRef.current.play();
            }
        }, 100);
    };

    const togglePlay = async () => {
        try {
            if (videoRef.current.paused) {
                await videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
        } catch (err) {
            console.error("Playback error:", err);
        }
    };

    const handleTimeUpdate = (e) => {
        const current = videoRef.current.currentTime;
        const dur = videoRef.current.duration;
        setCurrentTime(current);
        setDuration(dur);
        setProgress((current / dur) * 100);

        if (onTimeUpdate) {
            onTimeUpdate(e);
        }
    };

    const handleSeek = (e) => {
        const seekTime = (e.target.value / 100) * videoRef.current.duration;
        videoRef.current.currentTime = seekTime;
        setProgress(e.target.value);
    };

    const toggleMute = () => {
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(videoRef.current.muted);
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger shortcuts if user is typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    showOSD(videoRef.current.paused ? <Pause size={40} /> : <Play size={40} fill="white" />, videoRef.current.paused ? 'Paused' : 'Playing');
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    const nextMute = !videoRef.current.muted;
                    toggleMute();
                    showOSD(nextMute ? <VolumeX size={40} /> : <Volume2 size={40} />, nextMute ? 'Muted' : 'Unmuted');
                    break;
                case 'arrowright':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 5);
                    showOSD(<FastForward size={40} />, '+5s');
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                    showOSD(<Rewind size={40} />, '-5s');
                    break;
                case 'l':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
                    showOSD(<FastForward size={40} />, '+10s');
                    break;
                case 'j':
                    e.preventDefault();
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    showOSD(<Rewind size={40} />, '-10s');
                    break;
                case 'arrowup':
                    e.preventDefault();
                    const newVolUp = Math.min(1, videoRef.current.volume + 0.1);
                    videoRef.current.volume = newVolUp;
                    setVolume(newVolUp);
                    setIsMuted(newVolUp === 0);
                    showOSD(<Volume2 size={40} />, `${Math.round(newVolUp * 100)}%`);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    const newVolDown = Math.max(0, videoRef.current.volume - 0.1);
                    videoRef.current.volume = newVolDown;
                    setVolume(newVolDown);
                    setIsMuted(newVolDown === 0);
                    showOSD(<Volume2 size={40} />, `${Math.round(newVolDown * 100)}%`);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, isMuted, volume]); // Dependencies to ensure current state is captured if needed, though mostly using refs/dom directly for some


    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div
            ref={containerRef}
            className="custom-video-player"
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: 'black',
                overflow: 'hidden',
                borderRadius: isFullscreen ? '0' : '1rem'
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={currentSrc}
                poster={video?.thumbnail_url}
                onClick={togglePlay}
                onTimeUpdate={handleTimeUpdate}
                playsInline
                muted={autoPlay && !isPlaying}
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />

            {showGuide && <ShortcutGuide onDismiss={handleDismissGuide} />}

            {/* OSD Overlay */}
            <div key={osd.key} className={`player-osd ${osd.visible ? 'visible' : ''}`}>
                <div className="osd-content">
                    {osd.icon}
                    <span>{osd.text}</span>
                </div>
            </div>

            {/* Controls Overlay */}
            <div
                className={`player-controls glass ${showControls ? 'visible' : 'hidden'}`}
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '1rem',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'none',
                    opacity: showControls ? 1 : 0,
                    zIndex: 20
                }}
            >
                {/* Progress Bar */}
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={handleSeek}
                    style={{
                        width: '100%',
                        height: '4px',
                        accentColor: 'var(--accent-primary)',
                        cursor: 'pointer'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={togglePlay}
                            className="control-btn"
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                            title={isPlaying ? "Pause (k/Space)" : "Play (k/Space)"}
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} fill="white" />}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                                onClick={toggleMute}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                title={isMuted ? "Unmute (m)" : "Mute (m)"}
                            >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                style={{ width: '60px', accentColor: 'white' }}
                            />
                        </div>

                        <span style={{ fontSize: '0.9rem', color: '#ddd' }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Settings Menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                                title="Settings"
                            >
                                <Settings size={20} />
                            </button>

                            {showSettings && (
                                <div className="settings-menu glass" style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    right: 0,
                                    marginBottom: '10px',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    background: 'rgba(0,0,0,0.9)',
                                    minWidth: '150px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <h4 style={{ margin: '0 0.5rem', fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Quality</h4>
                                    {availableResolutions.map(res => (
                                        <button
                                            key={res.value}
                                            onClick={() => changeResolution(res)}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '0.5rem',
                                                background: 'none',
                                                border: 'none',
                                                color: res.premium && !user?.is_premium ? '#666' : 'white',
                                                cursor: res.premium && !user?.is_premium ? 'not-allowed' : 'pointer',
                                                textAlign: 'left',
                                                borderRadius: '4px',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!res.premium || user?.is_premium) e.target.style.background = 'rgba(255,255,255,0.1)'
                                            }}
                                            onMouseLeave={(e) => e.target.style.background = 'none'}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {res.label}
                                                {res.premium && <span style={{ fontSize: '0.7rem', background: 'var(--accent-primary)', padding: '1px 4px', borderRadius: '4px', color: 'black', fontWeight: 'bold' }}>PRO</span>}
                                            </span>
                                            {currentResolution === res.value && <Check size={16} color="var(--accent-primary)" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={toggleFullscreen}
                            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                            title="Fullscreen (f)"
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>

                    </div>
                </div>
            </div>

            <style>{`
                .player-osd {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                    opacity: 0;
                    transition: none;
                    z-index: 30;
                }
                .player-osd.visible {
                    opacity: 1;
                }
                .osd-content {
                    background: transparent;
                    backdrop-filter: none;
                    padding: 2rem;
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1rem;
                    min-width: 140px;
                    min-height: 140px;
                    justify-content: center;
                    border: none;
                }
                .osd-content svg {
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.8));
                }
                .osd-content span {
                    font-size: 1.2rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    text-shadow: 0 0 10px rgba(0,0,0,0.8);
                }
            `}</style>
        </div>
    );
};

export default VideoPlayer;
