
// Add where to the list of firestore imports and exports to support querying in components.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  writeBatch,
  doc,
  serverTimestamp,
  getDocs,
  where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyD7jfkjX28p7LxWtG6w_cPQ9TlU7TUtrC0",
  authDomain: "project-tracking---vsd.firebaseapp.com",
  projectId: "project-tracking---vsd",
  storageBucket: "project-tracking---vsd.appspot.com",
  messagingSenderId: "560547000216",
  appId: "1:560547000216:web:86948a3395874288005391"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { 
  db, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  writeBatch, 
  doc, 
  serverTimestamp,
  getDocs,
  where
};