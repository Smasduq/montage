import React, { useState, useEffect } from 'react';
import { X, Keyboard, MousePointer2 } from 'lucide-react';

const ShortcutGuide = ({ onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 500);
        const autoDismiss = setTimeout(() => {
            handleDismiss();
        }, 8000);

        return () => {
            clearTimeout(timer);
            clearTimeout(autoDismiss);
        };
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 500);
    };

    const shortcuts = [
        { key: 'Space / K', desc: 'Play / Pause' },
        { key: 'M', desc: 'Mute / Unmute' },
        { key: 'F', desc: 'Fullscreen' },
        { key: 'Arrows', desc: 'Seek & Volume' },
        { key: 'N', desc: 'Next Video' },
    ];

    return (
        <div className={`shortcut-guide-overlay ${isVisible ? 'active' : ''}`} onClick={handleDismiss}>
            <div className="shortcut-guide-content glass" onClick={(e) => e.stopPropagation()}>
                <button className="close-guide" onClick={handleDismiss}>
                    <X size={18} />
                </button>

                <div className="guide-header">
                    <Keyboard className="guide-icon" size={32} />
                    <h3>Viewer Shortcuts</h3>
                </div>

                <div className="shortcuts-list">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="shortcut-row">
                            <span className="key-cap">{s.key}</span>
                            <span className="key-desc">{s.desc}</span>
                        </div>
                    ))}
                </div>

                <div className="guide-footer">
                    <MousePointer2 size={14} />
                    <span>Try hovering thumbnails for previews!</span>
                </div>
            </div>

            <style>{`
                .shortcut-guide-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                    pointer-events: none;
                }
                .shortcut-guide-overlay.active {
                    opacity: 1;
                    pointer-events: auto;
                }
                .shortcut-guide-content {
                    width: 280px;
                    padding: 1.5rem;
                    border-radius: 20px;
                    background: rgba(20, 20, 20, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transform: translateY(20px);
                    transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                }
                .shortcut-guide-overlay.active .shortcut-guide-content {
                    transform: translateY(0);
                }
                .close-guide {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                }
                .guide-header {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    margin-bottom: 1.5rem;
                }
                .guide-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--accent-primary);
                }
                .shortcuts-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                    margin-bottom: 1.5rem;
                }
                .shortcut-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .key-cap {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 800;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    min-width: 60px;
                    text-align: center;
                }
                .key-desc {
                    font-size: 0.85rem;
                    color: #ddd;
                }
                .guide-footer {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
};

export default ShortcutGuide;
