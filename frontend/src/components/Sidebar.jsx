import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home as HomeIcon, Zap, Layout, Upload as UploadIcon, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout, token } = useAuth();

    return (
        <aside className={`sidebar glass ${isOpen ? 'open' : ''}`}>
            <nav className="nav-menu">
                <NavLink to="/" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <HomeIcon size={20} />
                    <span>Home</span>
                </NavLink>
                <NavLink to="/flash" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Zap size={20} />
                    <span>Flash Clips</span>
                </NavLink>
                <NavLink to="/posts" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Layout size={20} />
                    <span>Feed</span>
                </NavLink>
                {token && (
                    <NavLink to="/insights" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Zap size={20} color="#f59e0b" />
                        <span>Insights</span>
                    </NavLink>
                )}
                <div style={{ margin: '1.5rem 0', height: '1px', background: 'var(--border-glass)' }} />
                <NavLink to="/upload" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <UploadIcon size={20} />
                    <span>Upload Content</span>
                </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {token ? (
                    <>
                        <div className="user-info">
                            <div className="user-role">{user?.role || 'User'}</div>
                            <div className="user-name">{user?.username}</div>
                        </div>
                        <button onClick={() => { logout(); onClose(); }} className="nav-item" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </>
                ) : (
                    <NavLink to="/login" onClick={onClose} className="nav-item">
                        <LogIn size={20} />
                        <span>Login</span>
                    </NavLink>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
