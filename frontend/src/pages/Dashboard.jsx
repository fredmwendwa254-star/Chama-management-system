import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Wallet, ArrowUpRight, ArrowDownRight, Activity, BadgeAlert, Send, PlusCircle, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';
import { API_URL, SOCKET_URL } from '../config';
import { formatShillings } from '../utils/currency';

export default function Dashboard() {
    const { token } = useContext(AuthContext);
    const [stats, setStats] = useState({ totalDeposits: 0, totalWithdrawals: 0, currentBalance: 0 });
    const [deposits, setDeposits] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositRef, setDepositRef] = useState('');
    const [monthly, setMonthly] = useState([]);

    const fetchData = async () => {
        try {
            const headers = { 'x-auth-token': token };

            // Fetch stats
            const statsRes = await fetch(`${API_URL}/dashboard/stats`, { headers });
            if (statsRes.ok) setStats(await statsRes.json());

            // Fetch deposits
            const depositsRes = await fetch(`${API_URL}/deposits`, { headers });
            if (depositsRes.ok) setDeposits(await depositsRes.json());

            // Fetch withdrawals
            const withdrawalsRes = await fetch(`${API_URL}/withdrawals`, { headers });
            if (withdrawalsRes.ok) setWithdrawals(await withdrawalsRes.json());

            const monthlyRes = await fetch(`${API_URL}/dashboard/monthly`, { headers });
            if (monthlyRes.ok) setMonthly(await monthlyRes.json());
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        const socket = io(SOCKET_URL);
        socket.on('new_deposit', (data) => {
            setNotifications(prev => [data.msg, ...prev]);
            fetchData();
        });
        socket.on('withdrawal_approved', (data) => {
            setNotifications(prev => [data.msg, ...prev]);
            fetchData();
        });
        return () => socket.disconnect();
    }, [token]);

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!depositAmount || !depositRef) {
            setNotifications(prev => ['Please fill in all deposit fields', ...prev]);
            return;
        }
        try {
            const res = await fetch(`${API_URL}/deposits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
                body: JSON.stringify({ amount: parseFloat(depositAmount), transaction_ref: depositRef })
            });
            if (res.ok) {
                setNotifications(prev => [`Deposit of ${formatShillings(depositAmount)} recorded!`, ...prev]);
                setDepositAmount('');
                setDepositRef('');
                fetchData();
            } else {
                const error = await res.json();
                setNotifications(prev => [error.msg || 'Deposit failed', ...prev]);
            }
        } catch (err) {
            console.error(err);
            setNotifications(prev => ['Server error', ...prev]);
        }
    };

    return (
        <div className="container" style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <div className="page-intro">
                <p className="eyebrow">Member overview</p>
                <h2 style={{ marginTop: '0.35rem', fontSize: '2.35rem' }}>
                    <span className="text-gradient">Your contribution dashboard</span>
                </h2>
                <p className="muted" style={{ marginTop: '0.5rem' }}>Track deposits, withdrawals, and your available balance in one place.</p>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="glass stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        <Wallet size={24} /> Current Balance
                    </div>
                    <h3 className="stat-value">{formatShillings(stats.currentBalance)}</h3>
                </div>

                <div className="glass stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--success)' }}>
                        <TrendingDown size={24} /> Total Deposited
                    </div>
                    <h3 className="stat-value">{formatShillings(stats.totalDeposits)}</h3>
                </div>

                <div className="glass stat-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: 'var(--warning)' }}>
                        <TrendingUp size={24} /> Total Withdrawn
                    </div>
                    <h3 className="stat-value">{formatShillings(stats.totalWithdrawals)}</h3>
                </div>
            </div>

            <div className="glass progress-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <p className="eyebrow">Year-to-date progress</p>
                        <h3 style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}><BarChart3 size={20} /> Monthly contributions</h3>
                    </div>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>{new Date().getFullYear()}</span>
                </div>
                <div className="monthly-chart" aria-label="Monthly contribution chart">
                    {monthly.map((item) => {
                        const maximum = Math.max(...monthly.map(month => Number(month.contributions)), 1);
                        const height = Math.max((Number(item.contributions) / maximum) * 100, Number(item.contributions) > 0 ? 8 : 2);
                        return (
                            <div className="month-column" key={item.month} title={`${formatShillings(item.contributions)} contributed`}>
                                <div className="month-value">{Number(item.contributions) > 0 ? formatShillings(item.contributions) : ''}</div>
                                <div className="month-track">
                                    <div className="month-bar contribution-bar" style={{ height: `${height}%` }} />
                                    <div className="month-bar withdrawal-bar" style={{ height: `${Math.max((Number(item.withdrawals) / maximum) * 100, Number(item.withdrawals) > 0 ? 8 : 2)}%` }} />
                                </div>
                                <span>{new Date(2000, item.month - 1, 1).toLocaleDateString('en', { month: 'short' })}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="chart-legend muted"><span className="legend-dot" /> Contributions <span className="legend-line" /> Approved withdrawals</div>
            </div>

            {/* Forms and Activity */}
            <div className="two-column-grid" style={{ marginBottom: '2rem' }}>
                {/* Deposit Form */}
                <div className="glass" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <PlusCircle size={20} style={{ color: 'var(--success)' }} /> Make a Deposit
                    </h3>
                    <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="number"
                            placeholder="Amount"
                            step="0.01"
                            className="glass-input"
                            value={depositAmount}
                            onChange={e => setDepositAmount(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Transaction Ref (e.g., MPESA_123)"
                            className="glass-input"
                            value={depositRef}
                            onChange={e => setDepositRef(e.target.value)}
                            required
                        />
                        <button type="submit" className="btn" style={{ backgroundColor: 'var(--success)' }}>
                            <PlusCircle size={18} /> Deposit Now
                        </button>
                    </form>
                </div>

                {/* Contribution Guide Card */}
                <div className="glass" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ArrowUpRight size={20} style={{ color: 'var(--primary)' }} /> Contribution Guidelines
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        <p>
                            All deposits are submitted to a <strong style={{ color: 'var(--warning)' }}>pending</strong> state and must be verified and approved by an Administrator.
                        </p>
                        <p>
                            To ensure proper tracking, make sure you enter the correct <strong>transaction reference</strong> (e.g. M-Pesa, bank receipt, or transaction code).
                        </p>
                        <p>
                            Only <strong style={{ color: 'var(--success)' }}>approved</strong> transactions are reflected in group records and your available balance.
                        </p>
                        <p>
                            Withdrawals are executed only by group Administrators for accountability. Contact your admin to request group funds.
                        </p>
                    </div>
                </div>
            </div>

            {/* History and Activity */}
            <div className="three-column-grid">
                {/* Deposit History */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--success)' }}>
                        <ArrowDownRight size={20} /> Deposits
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {deposits.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No deposits yet</p>
                        ) : (
                            deposits.map(d => {
                                let statusBg = 'rgba(245, 158, 11, 0.05)';
                                let statusBorder = '3px solid var(--warning)';
                                let statusTextColor = 'var(--warning)';

                                if (d.status === 'approved') {
                                    statusBg = 'rgba(34, 197, 94, 0.05)';
                                    statusBorder = '3px solid var(--success)';
                                    statusTextColor = 'var(--success)';
                                } else if (d.status === 'rejected') {
                                    statusBg = 'rgba(239, 68, 68, 0.05)';
                                    statusBorder = '3px solid var(--danger)';
                                    statusTextColor = 'var(--danger)';
                                }

                                return (
                                    <div key={d.id} style={{ padding: '0.75rem', backgroundColor: statusBg, borderLeft: statusBorder, borderRadius: '0.25rem', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600 }}>{formatShillings(d.amount)}</span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                textTransform: 'uppercase',
                                                fontWeight: 700,
                                                color: statusTextColor,
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.25rem',
                                                border: `1px solid ${statusTextColor}`
                                            }}>{d.status}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                            <span>Ref: {d.transaction_ref}</span>
                                            <span>{new Date(d.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Withdrawal History */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--warning)' }}>
                        <ArrowUpRight size={20} /> Withdrawals
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {withdrawals.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No withdrawals yet</p>
                        ) : (
                            withdrawals.map(w => (
                                <div key={w.id} style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--warning)', borderRadius: '0.25rem', fontSize: '0.9rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{formatShillings(w.amount)}</span>
                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                            {w.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        {new Date(w.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Live Activity */}
                <div className="glass" style={{ padding: '1.5rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', fontSize: '1rem' }}>
                        <Activity color="var(--primary)" size={20} /> Live Activity
                    </h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <BadgeAlert size={32} opacity={0.5} />
                                <p style={{ fontSize: '0.9rem' }}>Waiting for events...</p>
                            </div>
                        ) : (
                            notifications.map((note, index) => (
                                <div key={index} style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderLeft: '3px solid var(--primary)', borderRadius: '0.25rem', fontSize: '0.85rem', animation: 'fadeIn 0.3s ease-in' }}>
                                    {note}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
