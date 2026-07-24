import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Settings, Moon, Sun, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="glass" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <h1 className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Anchor Vision</h1>
            </Link>

            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <a href="https://chat.whatsapp.com/IiF7G7Abx5PJyqrUFDrIp2" target="_blank" rel="noreferrer" className="icon-button" aria-label="Join the WhatsApp group" data-tooltip="whatsapp">
                    <MessageCircle size={19} />
                </a>
                <button type="button" onClick={toggleDarkMode} className="icon-button" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} data-tooltip={darkMode ? 'lightmode' : 'darkmode'}>
                    {darkMode ? <Sun size={19} /> : <Moon size={19} />}
                </button>
                {user ? (
                    <>
                        <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user.full_name || user.username}</span>
                        <Link to="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '0.5rem 1rem' }}>
                            <LayoutDashboard size={18} /> Dashboard
                        </Link>
                        {user.role === 'admin' && (
                            <Link to="/admin" className="btn btn-secondary" style={{ textDecoration: 'none', padding: '0.5rem 1rem' }}>
                                <Settings size={18} /> Admin
                            </Link>
                        )}
                        <button onClick={handleLogout} className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--danger)' }}>
                            <LogOut size={18} /> Logout
                        </button>
                    </>
                ) : (
                    <Link to="/" className="btn" style={{ textDecoration: 'none' }}>Login</Link>
                )}
            </div>
        </nav>
    );
}
