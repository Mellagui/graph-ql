const app = document.getElementById("app");
let token = null;
let userData = null;
let collaborators = [];

const Api = {
    login: "https://learn.zone01oujda.ma/api/auth/signin",
    graphQl : "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
}

const QUERY = `{ 
    user {
        login firstName lastName email auditRatio totalUp totalDown
        
        finished_projects: groups(where: {
            group: {status: {_eq: finished}, _and: [
                {path: {_like: "%module%"}},
                {path: {_nilike: "%piscine-js%"}}
            ]}
        }) {
            group { path members { userLogin } }
        }

        transactions_aggregate(where: {eventId: {_eq: 41}, type: {_eq: "xp"}}) {
            aggregate { sum { amount } }
        }
    }
}`;

window.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    console.log("init func here");

    const currentToken = getToken();
    console.log(currentToken);

    if (currentToken && isValidToken(currentToken)) {
        token = currentToken;
        profile();
    } else {
        removeToken();
        renderLogin();
    }
}

// 2.2 - profile (render static data)

async function profile() {
    console.log("inside main profile")
    // get user data by query

    try {
        const response = await fetch(Api.graphQl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ query: QUERY})
        })
        const result = await response.json();
        if (result.error) {
            throw new Error("failed to fetch user data")
        }

        console.log("DATA ===> ", result.data)
        // userData = result

        const user = result.data.user[0];
        userData = {
            username: user.login,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            auditRatio: parseFloat(user.auditRatio).toFixed(1),
            totalUp: user.totalUp,
            totalDown: user.totalDown,
            projects: user.finished_projects,
            projectCount: user.finished_projects.length,
            formattedXP: Utils.formatXP(user.transactions_aggregate.aggregate.sum.amount)
        };

        // Process collaborators
        collaborators = [];
        userData.projects.forEach(project => {
            project.group.members.forEach(member => {
                if (member.userLogin !== userData.username) {
                    let collaborator = collaborators.find(c => c.name === member.userLogin);
                    if (collaborator) {
                        collaborator.count++;
                    } else {
                        collaborators.push({ 
                            name: member.userLogin, 
                            count: 1 
                        });
                    }
                }
            });
        });

        // Sort collaborators by count
        collaborators.sort((a, b) => b.count - a.count);
        renderProfile();
    } catch (error) {
        console.log(error);
        logout();
    }
}

function renderProfile() {
    app.innerHTML = `
        <div class="profile-container fade-in">
            <div class="profile-header">
                <div class="profile-info">
                    <h1>${userData.firstName} ${userData.lastName}</h1>
                    <p>${userData.email}</p>
                </div>
                <button class="logout-button" onclick="AuthService.logout()">
                    Logout
                </button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total XP</h3>
                    <div class="stat-value">${userData.formattedXP}</div>
                </div>
                <div class="stat-card">
                    <h3>Completed Projects</h3>
                    <div class="stat-value">${userData.projectCount}</div>
                </div>
                <div class="stat-card">
                    <h3>Audit Ratio</h3>
                    <div class="stat-value">${userData.auditRatio}</div>
                </div>
                <div class="stat-card">
                    <h3>Collaborations</h3>
                    <div class="stat-value">${collaborators.length}</div>
                </div>
            </div>
            
            <div class="chart-container">
                <h2>Audit Performance</h2>
                <div class="audit-ratio-container">
                    <div class="audit-ratio-display">${userData.auditRatio}</div>
                    <div class="audit-ratio-bar" id="auditRatioBar"></div>
                    <div class="audit-ratio-labels">
                        <span style="color: var(--success)">Given: ${Utils.formattedXP(userData.totalUp)}</span>
                        <span style="color: var(--accent)">Received: ${Utils.formattedXP(userData.totalDown)}</span>
                    </div>
                </div>
            </div>

            <div class="chart-grid">
                <div class="chart-container">
                    <h2>Completed Projects</h2>
                    <div class="projects-container">
                        ${userData.projects.map(project => `
                            <div class="project-item">
                                ${Utils.formatProjectName(project.group.path)}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="chart-container">
                    <div class="collaboration-list" id="collaborationList"></div>
                </div>
            </div>
            
        </div>
    `;

    // render charts after DOM is updated
    setTimeout(() => {
        renderAuditRatioBar();
        renderCollaborationList();
    }, 100);
}

function renderAuditRatioBar() {
    const total = userData.totalUp + userData.totalDown;
    const upPercent = total > 0 ? (userData.totalUp / total) * 100 : 0;
    const downPercent = 100 - upPercent;

    document.getElementById('auditRatioBar').innerHTML = `
        <svg width="100%" height="30" viewBox="0 0 100 10" preserveAspectRatio="none">
            <rect x="0" y="0" width="${upPercent}" height="10" fill="var(--success)" rx="1" ry="1"></rect>
            <rect x="${upPercent}" y="0" width="${downPercent}" height="10" fill="var(--accent)" rx="1" ry="1"></rect>
        </svg>
    `;
}
function renderCollaborationList() {
    const listContainer = document.getElementById('collaborationList');
    listContainer.innerHTML = collaborators.slice(0, 8).map(collaborator => `
        <div class="collaboration-item">
            <span>${collaborator.name}</span>
            <span class="collaboration-count">${collaborator.count}</span>
        </div>
    `).join('');
}

function logout() {
    removeToken();
    userData = null;
    collaborators = null;
    renderLogin();
}

function renderLogin() {
    app.innerHTML = `
        <div class="login-container">
            <div class="login-form">
                <h1>Zone01</h1>
                <div class="form-group">
                    <input type="text" id="usernameInput" class="form-input" placeholder="Username" required>
                </div>
                <div class="form-group">
                    <input type="password" id="passwordInput" class="form-input" placeholder="Password" required>
                </div>
                <button type="button" class="primary-button" onclick="login()">
                    Sign In
                </button>
                <div id="errorMessage" class="error-message"></div>
            </div>
        </div>
    `;
}

async function login() {
    const username = document.getElementById('usernameInput').value;
    const password = document.getElementById('passwordInput').value;
    console.log("here")
    if (!username || !password) {
        document.getElementById('errorMessage').innerHTML = 'Please enter both username and password'
        return
    }

    const credentials = btoa(`${username}:${password}`);

    try {
        const response = await fetch(Api.login, {
            method: "POST",
            headers: { Authorization: `Basic ${credentials}` }
        });

        if (!response.ok) {
            throw new Error('Invalid credentials');
        }

        token = await response.json();

        saveToken(token);
        profile();
        
    } catch (error) {
        console.log("ERROR", error)
        document.getElementById('errorMessage').innerHTML = 'Login failed. Please check your credentials.'
        setTimeout(() => document.getElementById('errorMessage').innerHTML = '', 4000);

    }
}

function getToken() {
    return localStorage.getItem("z01Token")
}

function removeToken() {
    localStorage.removeItem("z01Token");
    token = null;
}

function isValidToken(token) {
    if (!token) return false;

    try {
        const payload = atob(token.split(".")[1]);
        const data = JSON.parse(payload);
        console.log("payload object:", data);

        const now = Date.now() / 1000;
        return data.exp > now
    } catch {
        return false
    }
}

function saveToken(token) {
    localStorage.setItem('z01Token', token);
}

// Utility Functions
const Utils = {
    formatXP: (amount) => {
        if (amount < 1000) return amount + " b";
        if (amount < 1000000) return Math.floor(amount / 1000) + " kb";
        return Math.floor(amount / 1000000) + " Mb";
    },
    formattedXP: (amount) => {
        if (amount < 1000) return amount + " b";
        if (amount < 1000000) return (amount / 1000).toFixed(2) + " kb";
        return (amount / 1000000).toFixed(2) + " Mb";
    },

    formatProjectName: (path) => {
        return path.split('/').pop().replace(/-/g, ' ');
    },
};

