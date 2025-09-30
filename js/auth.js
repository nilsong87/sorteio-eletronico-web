
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const userEmailSpan = document.getElementById('user-email');
    const errorMessageDiv = document.getElementById('error-message');

    // Gatekeeper: Redirect users based on auth state
    auth.onAuthStateChanged(user => {
        const currentPage = window.location.pathname.split('/').pop();

        if (user) {
            // User is logged in
            if (currentPage === 'index.html' || currentPage === '') {
                window.location.replace('dashboard.html');
            } else if (userEmailSpan) {
                userEmailSpan.textContent = user.email;
            }
        } else {
            // User is not logged in
            if (currentPage !== 'index.html' && currentPage !== '') {
                window.location.replace('index.html');
            }
        }
    });

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    // Successful login is handled by onAuthStateChanged
                })
                .catch(error => {
                    console.error("Login Error:", error);
                    errorMessageDiv.textContent = 'Email ou senha inválidos. Tente novamente.';
                    errorMessageDiv.classList.remove('d-none');
                });
        });
    }

    // Handle Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                // Successful logout is handled by onAuthStateChanged
            }).catch(error => {
                console.error("Logout Error:", error);
            });
        });
    }
});
