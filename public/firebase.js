import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

export const app = initializeApp({
  apiKey: "AIzaSyBwi8b--P5Xybi6fyAGu03PduaMbiY6V0w",
  authDomain: "money-m-789cb.firebaseapp.com",
  projectId: "money-m-789cb"
});

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
