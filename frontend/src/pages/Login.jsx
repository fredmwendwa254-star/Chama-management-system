import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrPhone, password })
            });

            // Parse JSON if present, otherwise read plaintext body
            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { msg: text };
            }

            if (res.ok) {
                login(data.token, data.user);
                // Redirect based on role
                if (data.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.msg || 'Login failed');
            }
        } catch (err) {
            console.error('Login connection error:', err);
            setError('Cannot connect to backend server. Please verify the server is running on port 3000.');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 110px)', padding: '2rem 1rem' }}>
            <div className="glass" style={{ padding: 'clamp(1.75rem, 5vw, 3rem)', width: '100%', maxWidth: '440px' }}>
                <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Anchor Vision member portal</p>
                <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.65rem', fontSize: '2.35rem' }}>Welcome back</h2>
                <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>Manage your contributions with clarity.</p>

                {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="input-nudge">
                        <Mail style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="text"
                            className="glass-input"
                            style={{ paddingLeft: '3rem' }}
                            placeholder="Email or Phone Number"
                            value={emailOrPhone}
                            onChange={e => setEmailOrPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-nudge">
                        <Lock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            className="glass-input"
                            style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                            placeholder="Enter your account password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', top: '50%', right: '1rem', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button type="submit" className="btn" style={{ marginTop: '0.5rem', width: '100%' }}>Login to Vault</button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                        Create one
                    </Link>
                </div>
            </div>
        </div>
    );
}
