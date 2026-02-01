import React, { useState, useEffect, useRef } from 'react';
import { Zap, Menu, X, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSearchSuggestions, getTrendingSuggestions } from '../api';

const Header = ({ onMenuToggle, isMenuOpen }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [trending, setTrending] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const dropdownRef = useRef(null);

    const { token, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const history = JSON.parse(localStorage.getItem('montage_search_history') || '[]');
        setSearchHistory(history);

        const loadTrending = async () => {
            try {
                const data = await getTrendingSuggestions();
                setTrending(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Trending error:", err);
                setTrending([]);
            }
        };
        loadTrending();

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                try {
                    const data = await getSearchSuggestions(searchQuery);
                    setSuggestions(Array.isArray(data) ? data : []);
                    setShowSuggestions(true);
                } catch (err) {
                    console.error("Suggestions error:", err);
                    setSuggestions([]);
                }
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const saveSearch = (query) => {
        if (!query || query.startsWith('@')) return; // Don't save empty or @user handles
        const history = JSON.parse(localStorage.getItem('montage_search_history') || '[]');
        const newHistory = [query, ...history.filter(h => h !== query)].slice(0, 5);
        localStorage.setItem('montage_search_history', JSON.stringify(newHistory));
        setSearchHistory(newHistory);
    };

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (searchQuery.trim()) {
            const query = searchQuery.trim();
            if (query.startsWith('@')) {
                const username = query.replace('@', '');
                navigate(`/profile/${username}`);
            } else {
                saveSearch(query);
                navigate(`/search?q=${encodeURIComponent(query)}`);
            }
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (s) => {
        setSearchQuery(s);
        if (s.startsWith('@')) {
            const username = s.replace('@', '');
            navigate(`/profile/${username}`);
        } else {
            saveSearch(s);
            navigate(`/search?q=${encodeURIComponent(s)}`);
        }
        setShowSuggestions(false);
    };

    // Build the "Suggestions to show" when query is empty
    const getEmptyQuerySuggestions = () => {
        const combined = [...searchHistory];
        // Fill up to 5 with trending
        if (combined.length < 5) {
            const remaining = 5 - combined.length;
            const extra = trending.filter(t => !combined.includes(t)).slice(0, remaining);
            return [...combined, ...extra];
        }
        return combined.slice(0, 5);
    };

    const displaySuggestions = searchQuery.trim().length > 0 ? suggestions : getEmptyQuerySuggestions();

    return (
        <header className="main-header glass">
            <div className="header-left">
                {!isHomePage && (
                    <button
                        className="back-button glass"
                        onClick={() => navigate(-1)}
                        style={{
                            marginRight: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            border: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={18} />
                    </button>
                )}

                <button
                    className="menu-toggle-btn glass"
                    onClick={onMenuToggle}
                    style={{
                        marginRight: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '1px solid var(--border-glass)',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white'
                    }}
                >
                    <Menu size={22} />
                </button>

                <div
                    className="nav-logo-static"
                    onClick={() => navigate('/')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
                >
                    <div className="logo-icon-wrapper">
                        <Zap size={28} fill="var(--accent-primary)" color="var(--accent-primary)" />
                    </div>
                    <span className="desktop-only" style={{
                        fontWeight: 900,
                        fontSize: '1.4rem',
                        letterSpacing: '1px',
                        background: 'linear-gradient(to right, #fff, #888)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>MONTAGE</span>
                </div>
            </div>

            {/* Mobile Search Icon - Only visible on small screens */}
            <div className="mobile-only" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <button
                    className="glass"
                    onClick={() => navigate('/search')}
                    style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)'
                    }}
                >
                    <Search size={20} />
                </button>
            </div>

            <div className="header-center desktop-only">
                <form className="search-container glass" onSubmit={handleSearch} ref={dropdownRef}>
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search users, videos, flash..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                    />
                    {showSuggestions && displaySuggestions.length > 0 && (
                        <div className="search-suggestions glass">
                            <div className="suggestion-header">
                                {searchQuery.trim().length === 0 ? 'Recents & Trending' : 'Suggestions'}
                            </div>
                            {displaySuggestions.map((s, i) => {
                                const isHistory = searchQuery.trim().length === 0 && searchHistory.includes(s);
                                const isUser = s.startsWith('@');
                                return (
                                    <div
                                        key={`sug-${i}`}
                                        className={`suggestion-item ${isHistory ? 'history' : ''}`}
                                        onClick={() => handleSuggestionClick(s)}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                            {isHistory ? (
                                                <Zap size={14} style={{ marginRight: '10px', opacity: 0.3 }} />
                                            ) : isUser ? (
                                                <div style={{ marginRight: '10px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-glow)' }} />
                                            ) : (
                                                <Search size={14} style={{ marginRight: '10px', opacity: 0.5 }} />
                                            )}
                                            <span style={{ color: isHistory ? 'var(--text-muted)' : 'white' }}>{s}</span>
                                        </div>
                                        {isUser && <span className="user-badge-mini">CREATOR</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </form>
            </div>

            <div className="header-right">
                {!token ? (
                    <button
                        className="mobile-login-pill glass btn-active"
                        onClick={() => navigate('/login')}
                    >
                        Login
                    </button>
                ) : (
                    <div className="user-profile-btn glass" onClick={() => navigate(`/profile/${user?.username}`)}>
                        {user?.profile_pic ? (
                            <img src={user.profile_pic} alt="profile" className="avatar-img-sm" />
                        ) : (
                            <div className="avatar-placeholder-sm">
                                {user?.username?.[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
