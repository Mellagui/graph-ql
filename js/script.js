const app = document.getElementById("app");
let token = null;
let userData = null;
let collaborators = [];

const Api = {
    login: "https://learn.zone01oujda.ma/api/auth/signin",
    graphQl : "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
}

/*  get project by path :: handle external talent
    group: {status: {_eq: finished}, _and: [
        {path: {_like: "%module%"}},
        {path: {_nilike: "%piscine%"}}
    ]}
*/

const QUERY = `{ 
    user {
        login firstName lastName email auditRatio totalUp totalDown
        
        finished_projects: groups(where: {
            group: {status: {_eq: finished}, _and: 
                {eventId: {_eq: 41}}
            }
        }) {
            group { path members { userLogin } }
        }

        transactions_aggregate(where: {eventId: {_eq: 41}, type: {_eq: "xp"}}) {
            aggregate { sum { amount } }
        }
    }
}`;

const Ui = {
    renderLogin: () => {
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
                    <button type="button" class="primary-button" onclick="Service.login()">
                        Sign In
                    </button>
                    <div id="errorMessage" class="error-message"></div>
                </div>
            </div>
        `;
    },

    renderProfile: () => {
        app.innerHTML = `
            <div class="profile-container">
                <div class="profile-header">
                    <div class="profile-info">
                        <h1>${userData.firstName} ${userData.lastName}</h1>
                        <p>${userData.email}</p>
                    </div>
                    <button class="logout-button" onclick="Service.logout()">
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
                            <span style="color: var(--success)">Given: ${Utils.formatXP(userData.totalUp, 2)}</span>
                            <span style="color: var(--accent)">Received: ${Utils.formatXP(userData.totalDown, 2)}</span>
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
                        <h2>Collaboration Network</h2>
                        <div class="chart-section">
                            <div class="chart-info" id="collaborationInfo">
                                Hover over bars to see details
                            </div>
                            <div class="svg-container">
                                <svg id="collaborationChart"></svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            Ui.renderAuditRatioBar();
            Ui.renderCollaborationChart();
        }, 100);
    },

    renderAuditRatioBar: () => {
        const total = userData.totalUp + userData.totalDown;
        const upPercent = total > 0 ? (userData.totalUp / total) * 100 : 0;
        const downPercent = 100 - upPercent;

        document.getElementById('auditRatioBar').innerHTML = `
            <svg width="100%" height="30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <rect x="0" y="0" width="${upPercent}" height="10" fill="var(--success)" rx="1" ry="1"></rect>
                <rect x="${upPercent}" y="0" width="${downPercent}" height="10" fill="var(--accent)" rx="1" ry="1"></rect>
            </svg>
        `;
    },

    renderCollaborationChart: () => {
        if (collaborators.length === 0) return;

        const svg = document.getElementById('collaborationChart');
        const topCollaborators = collaborators.slice(0, 10); // top 10
        const maxCount = topCollaborators[0].count;
        const width = 400;
        const height = 250;
        const barWidth = width / topCollaborators.length - 5;

        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        topCollaborators.forEach((collaborator, index) => {
            const barHeight = (collaborator.count / maxCount) * (height - 40);
            const x = index * (barWidth + 5);
            const y = height - barHeight - 20;

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barWidth);
            rect.setAttribute('height', barHeight);
            rect.setAttribute('fill', 'var(--primary)');
            rect.setAttribute('rx', '3');
            rect.classList.add('chart-bar');

            rect.addEventListener('mouseenter', () => {
                document.getElementById('collaborationInfo').textContent = 
                    `${collaborator.name}: ${collaborator.count} projects`;
            });
            rect.addEventListener('mouseleave', () => {
                document.getElementById('collaborationInfo').textContent = 
                    'Hover over bars to see details';
            });

            svg.appendChild(rect);
        });
    }
}

const Service = {
    login: async () => {
        const username = document.getElementById('usernameInput').value;
        const password = document.getElementById('passwordInput').value;

        if (!username || !password) return Utils.showError('Please enter both username and password');
        const credentials = btoa(`${username}:${password}`);

        try {
            const response = await fetch(Api.login, {
                method: "POST",
                headers: { Authorization: `Basic ${credentials}` }
            });
            if (!response.ok) throw new Error('Invalid credentials');
            token = await response.json();

            Token.save(token);
            Service.profile();
            
        } catch (error) {
            console.log("ERROR", error)
            Utils.showError('Login failed. Please check your credentials.');
        }
    },

    logout: () => {
        Token.remove();
        userData = null;
        collaborators = null;
        Ui.renderLogin();
    },

    profile: async () => {
        try {
            const response = await fetch(Api.graphQl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ query: QUERY})
            })

            if (!response.ok) throw new Error('failed to fetch user data');
            const result = await response.json();
            const user = result.data.user[0];

            userData = {
                userName: user.login,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                auditRatio: parseFloat(user.auditRatio).toFixed(1),
                totalUp: user.totalUp,
                totalDown: user.totalDown,
                projects: user.finished_projects,
                projectCount: user.finished_projects.length,
                formattedXP: Utils.formatXP(user.transactions_aggregate.aggregate.sum.amount)
            }

            collaborators = [];
            userData.projects.forEach(project => {
                project.group.members.forEach(member => {
                    if (member.userLogin !== userData.userName) {
                        let collab = collaborators.find(c => c.name === member.userLogin);
                        collab ? collab.count++ : collaborators.push({ name: member.userLogin, count: 1 });
                    }
                });
            });

            collaborators.sort((a, b) => b.count - a.count);
            Ui.renderProfile();
        } catch (error) {
            console.log(error);
            Service.logout();
        }
    }
}

const Token = {
    get: () => localStorage.getItem("z01Token"),

    save: (token) => localStorage.setItem('z01Token', token),

    remove: () => {
        localStorage.removeItem("z01Token");
        token = null;
    },

    isValid: (token) => {
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.exp > Date.now() / 1000
        } catch {
            return false
        }
    }
}

const Utils = {
    formatXP: (amount, fix = 0) => {
        if (amount < 1000) return amount + " b";
        if (amount < 1000000) return (amount / 1000).toFixed(fix) + " kb";
        return (amount / 1000000).toFixed(2) + " Mb";
    },

    formatProjectName: (path) => {
        console.log(path)
        return path.split('/').pop().replace(/-/g, ' ');
    },

    showError: (message) => {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            setTimeout(() => errorElement.textContent = '', 4000);
        }
    }
};

function init() {
    const currentToken = Token.get();
    if (currentToken && Token.isValid(currentToken)) {
        token = currentToken;
        Service.profile();
    } else {
        Token.remove();
        Ui.renderLogin();
    }
}

// start app
window.addEventListener('DOMContentLoaded', () => init());