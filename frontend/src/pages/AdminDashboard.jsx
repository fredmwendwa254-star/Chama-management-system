import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { ShieldAlert, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { formatShillings } from '../utils/currency';

export default function AdminDashboard() {
    const { user, token } = useContext(AuthContext);
    const [stats, setStats] = useState({ totalDeposits: 0, totalWithdrawals: 0, currentBalance: 0 });
    const [allUsers, setAllUsers] = useState([]);
    const [memberStatus, setMemberStatus] = useState({ paidMembers: [], unpaidMembers: [] });
    const [withdrawals, setWithdrawals] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const paidMembers = memberStatus.paidMembers;
    const unpaidMembers = memberStatus.unpaidMembers;

    const fetchData = async () => {
        try {
            const headers = { 'x-auth-token': token };

            // Fetch stats
            const statsRes = await fetch('http://localhost:3000/api/dashboard/stats', { headers });
            if (statsRes.ok) setStats(await statsRes.json());

            // Fetch all users
            const usersRes = await fetch('http://localhost:3000/api/users', { headers });
            if (usersRes.ok) setAllUsers(await usersRes.json());

            // Fetch member payment status
            const statusRes = await fetch('http://localhost:3000/api/users/status', { headers });
            if (statusRes.ok) setMemberStatus(await statusRes.json());

            // Fetch withdrawals
            const withdrawalsRes = await fetch('http://localhost:3000/api/withdrawals', { headers });
            if (withdrawalsRes.ok) setWithdrawals(await withdrawalsRes.json());

            // Fetch audit logs
            const auditRes = await fetch('http://localhost:3000/api/audit', { headers });
            if (auditRes.ok) setAuditLogs(await auditRes.json());

            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const socket = io('http://localhost:3000');
        socket.on('new_deposit', () => fetchData());
        socket.on('withdrawal_approved', () => fetchData());

        return () => socket.disconnect();
    }, [token]);

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`http://localhost:3000/api/withdrawals/${id}/approve`, {
                method: 'PUT',
                headers: { 'x-auth-token': token }
            });
            if (res.ok) {
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (user?.role !== 'admin') return <div className="container"><h2>Access Denied</h2></div>;

    return (
        <div className="container" style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <div className="page-intro">
                <p className="eyebrow">Administration</p>
                <h2 style={{ marginTop: '0.35rem', fontSize: '2.35rem' }} className="text-gradient">Member command center</h2>
                <p className="muted" style={{ marginTop: '0.5rem' }}>Monitor contributions and keep the next payment cycle ready.</p>
            </div>

            {/* Stats Overview */}
            <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                <div className="glass stat-card">
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Platform Balance</h4>
                    <h2 className="stat-value">{formatShillings(stats.currentBalance)}</h2>
                </div>
                <div className="glass stat-card">
                    <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>Total Deposits</h4>
                    <h2 className="stat-value">{formatShillings(stats.totalDeposits)}</h2>
                </div>
                <div className="glass stat-card">
                    <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Total Withdrawals</h4>
                    <h2 className="stat-value">{formatShillings(stats.totalWithdrawals)}</h2>
                </div>
                <div className="glass stat-card">
                    <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Active Users</h4>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 700 }}>{allUsers.length}</h2>
                </div>
            </div>

            {/* System Reset Action */}
            <div className="glass" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>System Controls</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Reset the deposited and withdrawn amounts across the system back to zero. Use only when you want to clear the ledger for a new cycle.
                </p>
                <button
                    onClick={async () => {
                        if (!window.confirm('Reset all deposit and withdrawal amounts to zero? This cannot be undone.')) return;
                        try {
                            const res = await fetch('http://localhost:3000/api/dashboard/reset', {
                                method: 'POST',
                                headers: { 'x-auth-token': token }
                            });
                            if (res.ok) {
                                fetchData();
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }}
                    className="btn"
                    style={{ backgroundColor: '#e11d48', borderColor: '#e11d48', color: '#fff' }}
                >
                    Reset System Amounts
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="two-column-grid" style={{ marginBottom: '2rem' }}>
                {/* Pending Withdrawals */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={20} style={{ color: 'var(--warning)' }} /> Pending Withdrawals
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No pending withdrawals.</p>
                        ) : (
                            withdrawals.filter(w => w.status === 'pending').map(w => (
                                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderLeft: '3px solid var(--warning)', borderRadius: '0.5rem' }}>
                                    <div>
                                        <strong>User ID: {w.user_id}</strong>
                                        <br />
                                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning)' }}>{formatShillings(w.amount)}</span>
                                        <br />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(w.created_at).toLocaleString()}</span>
                                    </div>
                                    <button onClick={() => handleApprove(w.id)} className="btn" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle size={18} /> Approve
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Member Accounts */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={20} style={{ color: 'var(--primary)' }} /> Current Members ({allUsers.length})
                    </h3>
                    <div className="two-column-grid" style={{ gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.08)' }}>
                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)' }}>
                                <CheckCircle size={18} /> Paid Members ({paidMembers.length})
                            </h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {loading ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Loading members...</p>
                                ) : paidMembers.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No paid members yet.</p>
                                ) : (
                                    paidMembers.map((u) => (
                                        <div key={u.id} style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', borderLeft: '3px solid var(--success)', borderRadius: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong>{u.username}</strong>
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Paid</span>
                                            </div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Deposited: {formatShillings(u.total_deposits)}
                                                <br />
                                                Withdrawn: {formatShillings(u.total_withdrawals)}
                                                <br />
                                                Balance: {formatShillings(u.current_balance)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(248, 113, 113, 0.08)' }}>
                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                                <TrendingUp size={18} /> Unpaid Members ({unpaidMembers.length})
                            </h4>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {loading ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Loading members...</p>
                                ) : unpaidMembers.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>All members have paid.</p>
                                ) : (
                                    unpaidMembers.map((u) => (
                                        <div key={u.id} style={{ padding: '0.75rem', backgroundColor: 'rgba(248, 113, 113, 0.12)', borderLeft: '3px solid var(--danger)', borderRadius: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <strong>{u.username}</strong>
                                                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Unpaid</span>
                                            </div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Deposited: {formatShillings(u.total_deposits)}
                                                <br />
                                                Withdrawn: {formatShillings(u.total_withdrawals)}
                                                <br />
                                                Balance: {formatShillings(u.current_balance)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audit Logs */}
            <div className="glass" style={{ padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={20} style={{ color: 'var(--primary)' }} /> Audit Logs
                </h3>
                <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {auditLogs.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No audit logs yet</p>
                    ) : (
                        auditLogs.map(log => (
                            <div key={log.id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 600 }}>[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                <strong> {log.actor || 'System'}</strong>: <span style={{ color: 'var(--text-secondary)' }}>{log.description}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
