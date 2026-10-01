
import { initializeApp } from 'firebase/app';
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
  documentId,
  limit,
  setDoc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';

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
  where,
  documentId,
  limit,
  setDoc,
  updateDoc,
  runTransaction
};
