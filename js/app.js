document.addEventListener('DOMContentLoaded', function () {
    // Check if the user is on the dashboard page
    if (!document.getElementById('dashboard-view')) {
        return;
    }

    // --- GLOBAL STATE ---
    let currentUser = null;
    let currentRaffle = null; // Object to hold the currently managed raffle {id, data}
    let unsubscribe = null; // To detach Firestore listener

    // --- DOM Elements ---
    const dashboardView = document.getElementById('dashboard-view');
    const raffleSection = document.getElementById('raffle-section');
    const openRafflesList = document.getElementById('open-raffles-list');
    const finishedRafflesList = document.getElementById('finished-raffles-list');
    
    // Creation Modal
    const createRaffleModal = new bootstrap.Modal(document.getElementById('create-raffle-modal'));
    const newRaffleNameInput = document.getElementById('new-raffle-name');
    const newQuotasContainer = document.getElementById('new-quotas-container');
    const newQuotasInput = document.getElementById('new-quotas-input');
    const saveNewRaffleButton = document.getElementById('save-new-raffle-button');
    let newRaffleModality = '';

    // Details View
    const raffleTitle = document.getElementById('raffle-title');
    const backToDashboardButton = document.getElementById('back-to-dashboard-button');
    const participantView = document.getElementById('participant-view');
    const quotasView = document.getElementById('quotas-view');
    const numbersView = document.getElementById('numbers-view');
    const addParticipantForm = document.getElementById('add-participant-form');
    const participantInput = document.getElementById('participant-input');
    const participantsList = document.getElementById('participants-list');
    const participantCount = document.getElementById('participant-count');
    const quotasInput = document.getElementById('quotas-input');
    const drawButton = document.getElementById('draw-button');

    // Results Modal
    const resultsModal = new bootstrap.Modal(document.getElementById('results-modal'));
    const winnersList = document.getElementById('winners-list');

    // --- INITIALIZATION ---
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadDashboard();
        } else {
            currentUser = null;
            // Auth.js should handle redirecting to login
        }
    });

    // --- DASHBOARD LOGIC ---
    function loadDashboard() {
        if (!currentUser) return;

        // Detach previous listener if it exists
        if (unsubscribe) unsubscribe();

        // Attach a real-time listener to the user's raffles
        unsubscribe = db.collection('sorteios')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                openRafflesList.innerHTML = '';
                finishedRafflesList.innerHTML = '';
                if (snapshot.empty) {
                    openRafflesList.innerHTML = '<p class="text-muted">Nenhum sorteio em aberto.</p>';
                    finishedRafflesList.innerHTML = '<p class="text-muted">Nenhum sorteio finalizado.</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const raffle = { id: doc.id, ...doc.data() };
                    if (raffle.status === 'open') {
                        renderRaffleCard(openRafflesList, raffle);
                    } else {
                        renderRaffleCard(finishedRafflesList, raffle);
                    }
                });
            }, error => {
                console.error("Erro ao carregar sorteios: ", error);
                alert("Não foi possível carregar seus sorteios. Verifique se você configurou os índices no Firestore.");
            });
    }

    function renderRaffleCard(listElement, raffle) {
        const col = document.createElement('div');
        col.className = 'col-md-6';

        const statusBadge = raffle.status === 'open' 
            ? '<span class="badge bg-info">Aberto</span>' 
            : '<span class="badge bg-success">Finalizado</span>';

        const winnersHTML = raffle.winners ? `<strong>Vencedores:</strong> ${raffle.winners.join(', ')}` : '';
        const buttonHTML = raffle.status === 'open' 
            ? `<button class="btn btn-sm btn-outline-light" onclick="window.navigateToRaffle('${raffle.id}')">Gerenciar</button>`
            : '';

        col.innerHTML = `
            <div class="card bg-dark border-secondary h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h5 class="card-title">${raffle.name}</h5>
                        ${statusBadge}
                    </div>
                    <h6 class="card-subtitle mb-2 text-muted">Modalidade: ${raffle.modality}</h6>
                    <p class="card-text">Criado em: ${new Date(raffle.createdAt.seconds * 1000).toLocaleString()}</p>
                    <p class="card-text">${winnersHTML}</p>
                    ${buttonHTML}
                </div>
            </div>
        `;
        listElement.appendChild(col);
    }

    // --- RAFFLE CREATION LOGIC ---
    document.querySelectorAll('#create-raffle-modal .modality-card').forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all
            document.querySelectorAll('#create-raffle-modal .modality-card').forEach(c => c.classList.remove('border-primary'));
            // Add to clicked one
            this.classList.add('border-primary');
            newRaffleModality = this.dataset.modality;
            newQuotasContainer.classList.toggle('d-none', newRaffleModality !== 'Cotas');
        });
    });

    saveNewRaffleButton.addEventListener('click', async () => {
        const name = newRaffleNameInput.value.trim();
        if (!name || !newRaffleModality) {
            alert('Por favor, preencha o nome e selecione uma modalidade.');
            return;
        }

        const newRaffle = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            name: name,
            modality: newRaffleModality,
            status: 'open',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            participants: [],
            winners: []
        };

        if (newRaffleModality === 'Cotas') {
            const totalCotas = parseInt(newQuotasInput.value, 10);
            if (!totalCotas || totalCotas < 3) {
                alert('Para a modalidade Cotas, o total deve ser um número maior ou igual a 3.');
                return;
            }
            newRaffle.participants = totalCotas;
        }

        try {
            await db.collection('sorteios').add(newRaffle);
            createRaffleModal.hide();
            // Reset modal form
            newRaffleNameInput.value = '';
            newQuotasInput.value = '';
            newRaffleModality = '';
            document.querySelectorAll('#create-raffle-modal .modality-card').forEach(c => c.classList.remove('border-primary'));
            newQuotasContainer.classList.add('d-none');
            // Dashboard will update automatically via onSnapshot
        } catch (error) {
            console.error("Erro ao criar sorteio: ", error);
            alert("Não foi possível criar o sorteio.");
        }
    });

    // --- RAFFLE DETAIL/MANAGEMENT LOGIC ---
    window.navigateToRaffle = async (raffleId) => {
        const doc = await db.collection('sorteios').doc(raffleId).get();
        if (!doc.exists) {
            alert("Sorteio não encontrado!");
            return;
        }
        currentRaffle = { id: doc.id, ...doc.data() };

        dashboardView.classList.add('d-none');
        raffleSection.classList.remove('d-none');

        raffleTitle.textContent = currentRaffle.name;
        participantView.classList.add('d-none');
        quotasView.classList.add('d-none');
        numbersView.classList.add('d-none');

        switch (currentRaffle.modality) {
            case 'Nome':
            case 'CPF':
                participantView.classList.remove('d-none');
                updateParticipantsUI(currentRaffle.participants);
                break;
            case 'Cotas':
                quotasView.classList.remove('d-none');
                quotasInput.value = currentRaffle.participants;
                break;
            case 'Números':
                numbersView.classList.remove('d-none');
                break;
        }
    };

    backToDashboardButton.addEventListener('click', () => {
        raffleSection.classList.add('d-none');
        dashboardView.classList.remove('d-none');
        currentRaffle = null;
    });

    addParticipantForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const participantName = participantInput.value.trim();
        if (participantName && currentRaffle) {
            const raffleRef = db.collection('sorteios').doc(currentRaffle.id);
            await raffleRef.update({
                participants: firebase.firestore.FieldValue.arrayUnion(participantName)
            });
            participantInput.value = '';
            // UI will update via snapshot listener, but we can force a local update for responsiveness
            currentRaffle.participants.push(participantName);
            updateParticipantsUI(currentRaffle.participants);
        }
    });

    // This needs to be a global function to be called from the dynamically created button
    window.removeParticipant = async (participantName) => {
        if (currentRaffle) {
            const raffleRef = db.collection('sorteios').doc(currentRaffle.id);
            await raffleRef.update({
                participants: firebase.firestore.FieldValue.arrayRemove(participantName)
            });
            // UI will update via snapshot listener, but we can force a local update for responsiveness
            currentRaffle.participants = currentRaffle.participants.filter(p => p !== participantName);
            updateParticipantsUI(currentRaffle.participants);
        }
    };

    function updateParticipantsUI(participantsArray) {
        participantsList.innerHTML = '';
        if (!participantsArray) return;

        participantsArray.forEach(p => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.textContent = p;
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-sm btn-outline-danger';
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
            deleteBtn.onclick = () => window.removeParticipant(p);
            li.appendChild(deleteBtn);
            participantsList.appendChild(li);
        });
        participantCount.textContent = participantsArray.length;
        drawButton.disabled = participantsArray.length < 3;
    }

    // --- DRAW LOGIC ---
    drawButton.addEventListener('click', async () => {
        if (!currentRaffle) return;

        let winners = [];
        let pool = [];

        try {
            const modality = currentRaffle.modality;
            const participants = currentRaffle.participants;

            switch (modality) {
                case 'Nome':
                case 'CPF':
                    if (!participants || participants.length < 3) {
                        throw new Error('É necessário ter pelo menos 3 participantes para realizar o sorteio.');
                    }
                    pool = [...participants];
                    break;
                case 'Números':
                    pool = Array.from({ length: 100 }, (_, i) => i + 1);
                    break;
                case 'Cotas':
                    const totalCotas = parseInt(participants, 10);
                    if (!totalCotas || totalCotas < 3) {
                        throw new Error('A quantidade total de cotas é inválida.');
                    }
                    pool = Array.from({ length: totalCotas }, (_, i) => i + 1);
                    break;
                default:
                    throw new Error('Modalidade de sorteio inválida.');
            }

            // Get winners
            const shuffled = [...pool].sort(() => 0.5 - Math.random());
            winners = shuffled.slice(0, 3);

            // Update document in Firestore
            const raffleRef = db.collection('sorteios').doc(currentRaffle.id);
            await raffleRef.update({
                status: 'finished',
                winners: winners,
                finishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            displayWinners(winners);
            backToDashboardButton.click(); // Go back to dashboard after draw

        } catch (error) {
            alert(error.message);
            console.error(error);
        }
    });

    function displayWinners(winners) {
        winnersList.innerHTML = '';
        const places = ['1º Lugar', '2º Lugar', '3º Lugar'];
        winners.forEach((winner, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${places[index]}:</strong> ${winner}`;
            winnersList.appendChild(li);
        });
        resultsModal.show();
    }
});
