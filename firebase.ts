
// Add where and limit to the list of firestore imports and exports to support querying in components.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
// Fix: Added 'limit' to the imports from the Firestore module.
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
  where,
  limit
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

// Fix: Exported 'limit' to satisfy dependencies in ProjectForm.tsx and other components.
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
  where,
  limit
};
