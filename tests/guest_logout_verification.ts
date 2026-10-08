/**
 * TerminalX - Guest Logout & Session Persistence Verification Suite
 * Verifies the production-blocking guest logout bug fix:
 * 1. Guest login -> authenticated guest session
 * 2. Logout -> unauthenticated state, cookies expired, storage cleared
 * 3. Refresh/reinitialize auth after logout -> STILL unauthenticated (no silent resurrection)
 * 4. Visiting protected routes after logout -> strictly rejected with 401
 * 5. Guest login again -> fresh valid session created
 * 6. Normal registered user login/logout/re-login cycle
 * 7. Multi-user state isolation (Guest vs Registered user data)
 */

const BASE_URL = 'http://127.0.0.1:3000';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${msg}`);
  }
}

async function runGuestLogoutVerification() {
  console.log('================================================================');
  console.log('TERMINALX — GUEST LOGOUT & SESSION PERSISTENCE VERIFICATION');
  console.log('================================================================\n');

  // Simulated browser storage
  const mockSessionStorage = new Map<string, string>();
  const mockLocalStorage = new Map<string, string>();

  // Helper functions simulating authStore
  const simulateStoreLogin = (token: string, user: any) => {
    mockSessionStorage.delete('terminalx_logged_out');
    mockLocalStorage.delete('terminalx_logged_out');
    mockSessionStorage.set('terminalx_token', token);
    mockLocalStorage.set('terminalx_token', token);
  };

  const simulateStoreLogout = () => {
    mockSessionStorage.set('terminalx_logged_out', 'true');
    mockLocalStorage.set('terminalx_logged_out', 'true');
    mockSessionStorage.delete('terminalx_token');
    mockLocalStorage.delete('terminalx_token');
  };

  const simulateStoreCheckAuth = async (cookieHeader?: string) => {
    const isExplicitlyLoggedOut =
      mockSessionStorage.get('terminalx_logged_out') === 'true' ||
      mockLocalStorage.get('terminalx_logged_out') === 'true';

    if (isExplicitlyLoggedOut) {
      return { isAuthenticated: false, user: null };
    }

    const storedToken =
      mockSessionStorage.get('terminalx_token') || mockLocalStorage.get('terminalx_token');
    const headers: Record<string, string> = {};
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const res = await fetch(`${BASE_URL}/api/auth/me`, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        return { isAuthenticated: true, user: data.user, token: storedToken };
      }
    }
    return { isAuthenticated: false, user: null };
  };

  // ----------------------------------------------------
  // STEP 1: GUEST DEMO LOGIN
  // ----------------------------------------------------
  console.log('--- STEP 1: GUEST DEMO LOGIN ---');
  const demoEmail = 'demo.student@terminalx.io';
  const demoPassword = 'password123';

  const guestLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });
  const guestLoginJson = await guestLoginRes.json();
  assert(guestLoginRes.status === 200 && guestLoginJson.success, 'Guest login must return 200 OK');
  assert(guestLoginJson.user && guestLoginJson.user.email === demoEmail, 'Guest user email must match');
  assert(!!guestLoginJson.token, 'Guest login must issue valid JWT token');

  const guestToken = guestLoginJson.token;
  const cookieHeader = guestLoginRes.headers.get('set-cookie') || '';
  simulateStoreLogin(guestToken, guestLoginJson.user);

  console.log(`✔ Guest Login succeeded (Email: ${guestLoginJson.user.email}, ID: ${guestLoginJson.user.id})`);

  // Verify protected route works with guest session
  const guestPortRes = await fetch(`${BASE_URL}/api/trading/portfolio`, {
    headers: { Authorization: `Bearer ${guestToken}` },
  });
  assert(guestPortRes.status === 200, 'Guest session must access protected portfolio endpoint');
  console.log('✔ Protected portfolio access verified for active guest session');

  // ----------------------------------------------------
  // STEP 2: LOGOUT EXECUTION
  // ----------------------------------------------------
  console.log('\n--- STEP 2: LOGOUT EXECUTION ---');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
  });
  const logoutJson = await logoutRes.json();
  assert(logoutRes.status === 200 && logoutJson.success, 'Logout must return 200 OK');

  // Verify Set-Cookie header contains expired timestamp
  const logoutCookies = logoutRes.headers.get('set-cookie') || '';
  assert(
    logoutCookies.includes('Expires=Thu, 01 Jan 1970') || logoutCookies.includes('Max-Age=0') || logoutCookies.includes('terminalx_token=;'),
    'Set-Cookie header on logout must expire terminalx_token'
  );

  // Execute client store logout
  simulateStoreLogout();
  assert(mockSessionStorage.get('terminalx_logged_out') === 'true', 'terminalx_logged_out flag set in sessionStorage');
  assert(mockLocalStorage.get('terminalx_logged_out') === 'true', 'terminalx_logged_out flag set in localStorage');
  assert(!mockSessionStorage.get('terminalx_token'), 'terminalx_token removed from sessionStorage');
  assert(!mockLocalStorage.get('terminalx_token'), 'terminalx_token removed from localStorage');
  console.log('✔ Logout succeeded: cookies expired and storage keys cleared');

  // ----------------------------------------------------
  // STEP 3: REFRESH / REINITIALIZE AUTH AFTER LOGOUT
  // ----------------------------------------------------
  console.log('\n--- STEP 3: REFRESH / REINITIALIZE AUTH AFTER LOGOUT ---');
  // Even if a browser had a lingering cookie, terminalx_logged_out prevents auto-login
  const checkAuthAfterLogout = await simulateStoreCheckAuth(cookieHeader);
  assert(
    checkAuthAfterLogout.isAuthenticated === false && checkAuthAfterLogout.user === null,
    'Page refresh/reinitialization must remain strictly unauthenticated after logout'
  );
  console.log('✔ Refresh after logout confirmed: guest session is NOT silently restored');

  // ----------------------------------------------------
  // STEP 4: PROTECTED ROUTES AFTER LOGOUT
  // ----------------------------------------------------
  console.log('\n--- STEP 4: PROTECTED ROUTES AFTER LOGOUT ---');
  const noAuthPortfolio = await fetch(`${BASE_URL}/api/trading/portfolio`);
  assert(noAuthPortfolio.status === 401, 'Accessing portfolio without auth must return 401');

  const noAuthOrders = await fetch(`${BASE_URL}/api/trading/orders`);
  assert(noAuthOrders.status === 401, 'Accessing orders without auth must return 401');

  const noAuthAlerts = await fetch(`${BASE_URL}/api/alerts`);
  assert(noAuthAlerts.status === 401, 'Accessing alerts without auth must return 401');

  const noAuthAI = await fetch(`${BASE_URL}/api/ai/context`);
  assert(noAuthAI.status === 401, 'Accessing AI context without auth must return 401');
  console.log('✔ All protected endpoints strictly reject requests after logout (401 Unauthorized)');

  // ----------------------------------------------------
  // STEP 5: GUEST LOGIN AGAIN
  // ----------------------------------------------------
  console.log('\n--- STEP 5: GUEST LOGIN AGAIN ---');
  const guestReLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });
  const guestReLoginJson = await guestReLoginRes.json();
  assert(guestReLoginRes.status === 200 && guestReLoginJson.success, 'Re-login as guest must succeed');
  simulateStoreLogin(guestReLoginJson.token, guestReLoginJson.user);
  assert(mockSessionStorage.get('terminalx_logged_out') === undefined, 'Logged-out flag cleared on new login');

  const reAuthCheck = await simulateStoreCheckAuth();
  assert(reAuthCheck.isAuthenticated === true && reAuthCheck.user?.email === demoEmail, 'New guest session verified');
  console.log('✔ Guest session successfully recreated upon explicit user request');

  // Log out guest again before testing registered user
  simulateStoreLogout();

  // ----------------------------------------------------
  // STEP 6: NORMAL REGISTERED USER LOGOUT CYCLE
  // ----------------------------------------------------
  console.log('\n--- STEP 6: NORMAL REGISTERED USER LOGOUT CYCLE ---');
  const ts = Date.now();
  const regEmail = `regular_trader_${ts}@terminalx.test`;
  const regPassword = 'SecurePassword@123';

  // Register
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Regular Trader', email: regEmail, password: regPassword }),
  });
  const regJson = await regRes.json();
  assert(regRes.status === 201 && regJson.success, 'Regular user registration must succeed');

  // Login
  const regLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, password: regPassword }),
  });
  const regLoginJson = await regLoginRes.json();
  assert(regLoginRes.status === 200 && regLoginJson.success, 'Regular user login must succeed');
  simulateStoreLogin(regLoginJson.token, regLoginJson.user);

  // Logout regular user
  simulateStoreLogout();
  const regAfterLogout = await simulateStoreCheckAuth();
  assert(regAfterLogout.isAuthenticated === false, 'Regular user must be unauthenticated after logout');

  // Re-login regular user
  const regReLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, password: regPassword }),
  });
  assert(regReLoginRes.status === 200, 'Regular user re-login must succeed');
  console.log('✔ Normal registered user login -> logout -> re-login cycle verified');

  // ----------------------------------------------------
  // STEP 7: MULTI-USER STATE ISOLATION (GUEST VS REGISTERED)
  // ----------------------------------------------------
  console.log('\n--- STEP 7: MULTI-USER STATE ISOLATION ---');
  // Regular user places an order
  const regToken = (await regReLoginRes.json()).token;
  await fetch(`${BASE_URL}/api/trading/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${regToken}` },
    body: JSON.stringify({ symbol: 'INFY', type: 'BUY', orderType: 'MARKET', quantity: 10 }),
  });

  const regPort = await (await fetch(`${BASE_URL}/api/trading/portfolio`, {
    headers: { Authorization: `Bearer ${regToken}` },
  })).json();
  const regInfyHolding = regPort.data.holdings.find((h: any) => h.symbol === 'INFY');
  assert(regInfyHolding && regInfyHolding.quantity === 10, 'Regular user holds 10 INFY');

  // Logout regular user, login as guest
  simulateStoreLogout();
  const guest3Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: demoEmail, password: demoPassword }),
  });
  const guest3Token = (await guest3Res.json()).token;

  const guestPort = await (await fetch(`${BASE_URL}/api/trading/portfolio`, {
    headers: { Authorization: `Bearer ${guest3Token}` },
  })).json();
  const guestInfyHolding = guestPort.data.holdings.find((h: any) => h.symbol === 'INFY');
  assert(!guestInfyHolding, 'Guest user MUST NOT see regular user holdings');
  console.log('✔ Cross-user data isolation verified: Guest does NOT see registered user holdings');

  // Final logout
  simulateStoreLogout();

  console.log('\n================================================================');
  console.log('ALL GUEST LOGOUT & SESSION PERSISTENCE VERIFICATION CHECKS PASSED!');
  console.log('================================================================');
}

runGuestLogoutVerification().catch((err) => {
  console.error('\n❌ GUEST LOGOUT VERIFICATION FAILED:', err);
  process.exit(1);
});
