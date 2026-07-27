const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
    console.log('--- STARTING E2E VERIFICATION TEST ---');
    let adminToken = '';
    let memberToken = '';
    let depositId = '';

    try {
        // 1. Register Admin User
        console.log('\n[1] Registering Admin User...');
        const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@chama.com',
                phone: '+254700000000',
                password: 'admin123',
                role: 'admin',
                fullName: 'System Admin'
            })
        });
        const adminReg = await adminRegRes.json();
        if (!adminRegRes.ok) throw new Error(`Admin Reg failed: ${adminReg.msg}`);
        console.log('✓ Admin registered:', adminReg.user.email);

        // 2. Register Member User
        console.log('\n[2] Registering Member User...');
        const memberRegRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'member@chama.com',
                phone: '+254722222222',
                password: 'member123',
                role: 'member',
                fullName: 'Jane Doe'
            })
        });
        const memberReg = await memberRegRes.json();
        if (!memberRegRes.ok) throw new Error(`Member Reg failed: ${memberReg.msg}`);
        console.log('✓ Member registered:', memberReg.user.email);

        // 3. Test Duplicate Validations
        console.log('\n[3] Testing duplicate register checks...');
        const dupRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'member@chama.com',
                phone: '+254733333333',
                password: 'member123',
                fullName: 'Jane Duplicate'
            })
        });
        if (dupRes.ok) {
            throw new Error('Duplicate check failed! Should have blocked duplicate email.');
        }
        const dupData = await dupRes.json();
        console.log('✓ Verification successful: Rejected duplicate email:', dupData.msg);

        // 4. Login Admin and Member
        console.log('\n[4] Logging in both users...');
        const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailOrPhone: 'admin@chama.com',
                password: 'admin123'
            })
        });
        const adminLogin = await adminLoginRes.json();
        if (!adminLoginRes.ok) throw new Error(`Admin Login failed: ${adminLogin.msg}`);
        adminToken = adminLogin.token;
        console.log('✓ Admin logged in. Token acquired.');

        const memberLoginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                emailOrPhone: '+254722222222', // Phone number login
                password: 'member123'
            })
        });
        const memberLogin = await memberLoginRes.json();
        if (!memberLoginRes.ok) throw new Error(`Member Login failed: ${memberLogin.msg}`);
        memberToken = memberLogin.token;
        console.log('✓ Member logged in using phone. Token acquired.');

        // 5. Create Pending Deposit as Member
        console.log('\n[5] Creating a deposit as member...');
        const depositResVal = await fetch(`${BASE_URL}/deposits`, {
            method: 'POST',
            headers: {
                'x-auth-token': memberToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: 5000,
                transaction_ref: 'MPESA12345'
            })
        });
        const depositData = await depositResVal.json();
        if (!depositResVal.ok) throw new Error(`Deposit creation failed: ${depositData.msg}`);
        depositId = depositData.id;
        console.log(`✓ Deposit created. ID: ${depositId}, Status: ${depositData.status}`);
        if (depositData.status !== 'pending') {
            throw new Error('Deposit status should be pending by default!');
        }

        // 6. Check Dashboard Stats (Pending deposit shouldn't be counted)
        console.log('\n[6] Checking stats/balance (pending deposit)...');
        const statsResVal = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'x-auth-token': memberToken }
        });
        const statsData = await statsResVal.json();
        console.log('Current Stats (Member):', statsData);
        if (parseFloat(statsData.currentBalance) !== 0) {
            throw new Error('Current balance should be 0 because deposit is pending!');
        }
        console.log('✓ Confirmed: Pending deposit is not counted towards active balance.');

        // 7. Rejecting a deposit for invalid ref
        console.log('\n[7] Testing deposit rejection...');
        const dummyRes = await fetch(`${BASE_URL}/deposits`, {
            method: 'POST',
            headers: {
                'x-auth-token': memberToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: 1500,
                transaction_ref: 'INVALIDREF'
            })
        });
        const dummyDeposit = await dummyRes.json();
        console.log(`Created dummy deposit ${dummyDeposit.id} with status ${dummyDeposit.status}`);
        const rejectRes = await fetch(`${BASE_URL}/deposits/${dummyDeposit.id}/reject`, {
            method: 'PUT',
            headers: { 'x-auth-token': adminToken }
        });
        if (!rejectRes.ok) throw new Error('Failed to reject dummy deposit');
        console.log('✓ Rejected dummy deposit successfully.');

        // 8. Admin Approves Deposit
        console.log('\n[8] Admin approving main deposit...');
        const approveResVal = await fetch(`${BASE_URL}/deposits/${depositId}/approve`, {
            method: 'PUT',
            headers: { 'x-auth-token': adminToken }
        });
        const approveData = await approveResVal.json();
        if (!approveResVal.ok) throw new Error(`Approve failed: ${approveData.msg}`);
        console.log(`✓ Deposit status updated. New status: ${approveData.status}`);

        // Verify stats update for member
        const statsRes2Val = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'x-auth-token': memberToken }
        });
        const statsData2 = await statsRes2Val.json();
        console.log('New Stats (Member):', statsData2);
        if (parseFloat(statsData2.currentBalance) !== 5000) {
            throw new Error('Current balance should be 5000 after approval!');
        }
        console.log('✓ Confirmed: Deposit added to active balance after approval!');

        // 9. Admin Withdrawal Execution
        console.log('\n[9] Admin executing withdrawal...');
        const withdrawalResVal = await fetch(`${BASE_URL}/withdrawals`, {
            method: 'POST',
            headers: {
                'x-auth-token': adminToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: 2000 })
        });
        const withdrawalData = await withdrawalResVal.json();
        if (!withdrawalResVal.ok) throw new Error(`Withdrawal execution failed: ${withdrawalData.msg}`);
        console.log(`✓ Admin withdrawal executed. Amount: ${withdrawalData.amount}, Status: ${withdrawalData.status}`);

        // Verify stats after withdrawal (using Admin Token to verify overall Platform Balance)
        console.log('\n[9b] Verifying platform balance gets updated for Admin...');
        const statsRes3Val = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'x-auth-token': adminToken }
        });
        const statsData3 = await statsRes3Val.json();
        console.log('Stats post-withdrawal (Admin/Platform):', statsData3);
        if (parseFloat(statsData3.currentBalance) !== 3000) {
            throw new Error('Current balance should be 3000 post-withdrawal!');
        }
        console.log('✓ Confirmed: Platform balance reduced after withdrawal.');

        // 10. Member cannot initiate withdrawal
        console.log('\n[10] Verifying member cannot execute withdrawal...');
        const blockedRes = await fetch(`${BASE_URL}/withdrawals`, {
            method: 'POST',
            headers: {
                'x-auth-token': memberToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount: 500 })
        });
        if (blockedRes.ok) {
            throw new Error('Member succeeded in executing withdrawal!');
        }
        console.log('✓ Verification successful: Member request blocked with status:', blockedRes.status);

        // 11. Reset Dashboard Stats as Admin
        console.log('\n[11] Admin resetting system stats...');
        const resetResVal = await fetch(`${BASE_URL}/dashboard/reset`, {
            method: 'POST',
            headers: { 'x-auth-token': adminToken }
        });
        if (!resetResVal.ok) throw new Error('Reset failed');
        console.log('✓ Dashboard stats reset succeeded.');

        // Final balance check after reset (using Admin Token)
        const finalStatsVal = await fetch(`${BASE_URL}/dashboard/stats`, {
            headers: { 'x-auth-token': adminToken }
        });
        const finalStats = await finalStatsVal.json();
        console.log('Final stats (Admin/Platform):', finalStats);
        if (parseFloat(finalStats.currentBalance) !== 0) {
            throw new Error('Stats did not reset correctly!');
        }
        console.log('✓ E2E validation completed successfully without errors.');

    } catch (err) {
        console.error('\n✗ Test Failed with error:', err.message);
        process.exit(1);
    }
}

runTests();
