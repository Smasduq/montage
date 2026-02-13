export const BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = import.meta.env.VITE_API_URL;
export const API_BASE_URL = `${API_URL}/api/v1`;

export const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
};

export const getVideos = async (type, token = null) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/videos/?video_type=${type}`, { headers });
    return response.json();
};

export const getVideoById = async (id, token = null) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/videos/${id}`, { headers });
    if (!response.ok) throw new Error('Video not found');
    return response.json();
};

export const getComments = async (videoId) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/comments`);
    return response.json();
};

export const postComment = async (videoId, content, token) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    });
    return response.json();
};

export const uploadVideo = async (token, videoData) => {
    const formData = new FormData();
    formData.append('title', videoData.title);
    formData.append('video_type', videoData.type);

    const response = await fetch(`${API_BASE_URL}/videos/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });
    return response.json();
};

export const getPosts = async () => {
    const response = await fetch(`${API_BASE_URL}/posts/`);
    return response.json();
};

export const createPost = async (content, imageFile, token) => {
    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const response = await fetch(`${API_BASE_URL}/posts/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    return response.json();
};

export const likeVideo = async (videoId, token) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/like`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const shareVideo = async (videoId) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/share`, {
        method: 'POST'
    });
    return response.json();
};

export const viewVideo = async (videoId) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}/view`, {
        method: 'POST'
    });
    return response.json();
};

export const searchVideos = async (query) => {
    const response = await fetch(`${API_BASE_URL}/videos/search?q=${encodeURIComponent(query)}`);
    return response.json();
};

export const getSearchSuggestions = async (query) => {
    const response = await fetch(`${API_BASE_URL}/videos/suggestions?q=${encodeURIComponent(query)}`);
    return response.json();
};

export const getUserProfile = async (username, token = null) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE_URL}/users/profile/${username}`, { headers });
    if (!response.ok) throw new Error('Profile not found');
    return response.json();
};

export const toggleFollow = async (userId, token) => {
    const response = await fetch(`${API_BASE_URL}/users/follow/${userId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const searchUnified = async (query) => {
    const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`);
    return response.json();
};
export const getTrendingSuggestions = async () => {
    const response = await fetch(`${API_BASE_URL}/videos/trending-suggestions`);
    return response.json();
};

export const deleteVideo = async (videoId, token) => {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const deletePost = async (postId, token) => {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const getUserInsights = async (token) => {
    const response = await fetch(`${API_BASE_URL}/users/me/insights`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return response.json();
};

export const getAchievements = async (token) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/achievements/`, { headers });
    return response.json();
};
