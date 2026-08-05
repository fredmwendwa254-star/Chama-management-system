import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, Mail, Phone, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config';

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!fullName || !email || !phone || !password || !confirmPassword) {
            setError('All fields are required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    phone,
                    password,
                    role: 'member',
                    fullName
                })
            });

            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { msg: text };
            }

            if (res.ok) {
                setSuccess('Account created successfully! Logging you in...');
                // Auto login after registration
                setTimeout(() => {
                    handleAutoLogin(email, password);
                }, 1000);
            } else {
                setError(data.msg || 'Registration failed');
            }
        } catch (err) {
            setError('Server error, please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoLogin = async (emailOrPhone, pwd) => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ emailOrPhone, password: pwd })
            });

            const data = await res.json();

            if (res.ok) {
                login(data.token, data.user);
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Auto-login failed:', err);
            navigate('/');
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 110px)', padding: '2rem 1rem' }}>
            <div className="glass" style={{ padding: 'clamp(1.75rem, 5vw, 3rem)', width: '100%', maxWidth: '440px' }}>
                <p className="eyebrow" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Start your contribution journey</p>
                <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '0.65rem', fontSize: '2.35rem' }}>Create Account</h2>
                <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>Fill in your details to register as a chama member.</p>

                {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</div>}
                {success && <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Full Name */}
                    <div className="input-nudge">
                        <User style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="text"
                            placeholder="Full Name (e.g. Fred Mwendwa)"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: '3rem' }}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="input-nudge">
                        <Mail style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="email"
                            placeholder="Email Address (e.g. fred@example.com)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: '3rem' }}
                            required
                        />
                    </div>

                    {/* Phone Number */}
                    <div className="input-nudge">
                        <Phone style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type="tel"
                            placeholder="Phone Number (e.g. 0712345678)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: '3rem' }}
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="input-nudge">
                        <Lock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password (min 6 characters)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Confirm Password */}
                    <div className="input-nudge">
                        <Lock style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="glass-input"
                            style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn"
                        style={{
                            marginTop: '0.5rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
