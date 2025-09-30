// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSpkOtsHAV_KMbyBeeQAVu3tzl-0mtb8g",
  authDomain: "sorteio-eletronico-web.firebaseapp.com",
  projectId: "sorteio-eletronico-web",
  storageBucket: "sorteio-eletronico-web.firebasestorage.app",
  messagingSenderId: "732869315519",
  appId: "1:732869315519:web:dd0131508c113e89e6ef0a",
  measurementId: "G-LY6C3T0LJW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
