const app = document.getElementById("app");
let token = null;
let userData = null;
let collaborators = [];

const API = {
    login: "https://learn.zone01oujda.ma/api/auth/signin",
    graphQl : "https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql",
}

const QUERY = `query { 
    user {
        login firstName lastName email auditRatio totalUp totalDown
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
        const response = await fetch(API.graphQl, {
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

        console.log("DATA ===> ", result)
        userData = result
    } catch (error) {
        console.log(error);
        logout();
    }
    renderProfile();
}

function renderProfile() {
    app.innerHTML = `
        <div class="profile-header">
            <div class="profile-info">
                <h1> USER NAME </h1>
                <p> EMAIL.EXP@.COM </p>
            </div>
            <button class="logout-button" onclick="logout()">
                Logout
            </button>
        </div>
        <span>USER DATA ===> ${userData}</span>
    `;
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
        const response = await fetch(API.login, {
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
