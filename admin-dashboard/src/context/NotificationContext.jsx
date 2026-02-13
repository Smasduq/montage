import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, Loader2, Bell } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((type, message, options = {}) => {
        const id = Math.random().toString(36).substr(2, 9);
        const { duration = 5000, progress = null, status = null } = options;

        const newNotification = { id, type, message, duration, progress, status };
        setNotifications(prev => [...prev, newNotification]);

        if (duration !== Infinity && type !== 'loading' && type !== 'processing') {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    }, []);

    const updateNotification = useCallback((id, updates) => {
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, ...updates } : n
        ));
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification, updateNotification, removeNotification, notifications, clearAll }}>
            {children}
            <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
        </NotificationContext.Provider>
    );
};

const NotificationContainer = ({ notifications, removeNotification }) => {
    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            {notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
            ))}
        </div>
    );
};

const NotificationItem = ({ notification, onClose }) => {
    const { type, message, progress, status } = notification;

    const getIcon = () => {
        const iconSize = 20;
        switch (type) {
            case 'success': return <CheckCircle size={iconSize} color="#4caf50" />;
            case 'error': return <AlertCircle size={iconSize} color="var(--accent-primary)" />;
            case 'info': return <Info size={iconSize} color="#2196f3" />;
            case 'loading':
            case 'processing': return <Loader2 size={iconSize} className="animate-spin" color="var(--accent-primary)" />;
            default: return <Bell size={iconSize} />;
        }
    };

    const isPersistent = type === 'loading' || type === 'processing' || progress !== null;

    return (
        <div className="glass notification-toast" style={{
            minWidth: '320px',
            padding: '1.2rem',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease-out forwards',
            border: `1px solid ${type === 'error' ? 'rgba(255, 62, 62, 0.3)' : 'var(--border-glass)'}`,
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    {getIcon()}
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {status || (type === 'processing' ? 'Processing...' : type === 'loading' ? 'Loading...' : message)}
                    </span>
                </div>
                {!isPersistent && (
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}>×</button>
                )}
            </div>

            {(type === 'processing' || type === 'loading' || progress !== null) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {type === 'processing' && message && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{message}</span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                        <span>{progress !== null ? `${progress}%` : ''}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${progress || 0}%`,
                            height: '100%',
                            background: 'var(--accent-primary)',
                            transition: 'width 0.3s ease-out',
                            boxShadow: '0 0 10px var(--accent-glow)'
                        }} />
                    </div>
                </div>
            )}

            {!isPersistent && type !== 'loading' && type !== 'processing' && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification-toast {
                    backdrop-filter: blur(20px);
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
