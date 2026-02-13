import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getUnreadNotifications, markNotificationRead } from '../api';

const NotificationManager = () => {
    const { token, user } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (!user || !token) return;

        const pollNotifications = async () => {
            try {
                const notifications = await getUnreadNotifications(token);
                if (notifications && notifications.length > 0) {
                    for (const note of notifications) {
                        // Show toast
                        showNotification(note.type || 'info', note.message);

                        // Mark as read immediately after showing
                        try {
                            await markNotificationRead(token, note.id);
                        } catch (err) {
                            console.error("Failed to mark notification read:", err);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to poll notifications:", error);
            }
        };

        // Poll every 30 seconds
        const intervalId = setInterval(pollNotifications, 30000);

        // Initial check
        pollNotifications();

        return () => clearInterval(intervalId);
    }, [user, token, showNotification]);

    return null; // Invisible component
};

export default NotificationManager;
