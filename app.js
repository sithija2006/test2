// Import Firebase
import firebase from "firebase/app"
import "firebase/auth"
import "firebase/database"

// Firebase Configuration (IMPORTANT: Replace with your Firebase config)
const firebaseConfig = {
  apiKey: "AIzaSyBP-3uuExD9_zmOHyBdamjCNOaxXkhQKNo",
  authDomain: "whatsapp-8a128.firebaseapp.com",
  projectId: "whatsapp-8a128",
  storageBucket: "whatsapp-8a128.firebasestorage.app",
  messagingSenderId: "276452175533",
  appId: "1:276452175533:web:3c93881ca04fd19504e024",
  measurementId: "G-JXFZ6H435V",
}

// Initialize Firebase (using script tags in production)
firebase.initializeApp(firebaseConfig)
const auth = firebase.auth()
const database = firebase.database()

let currentUser = null
let selectedUserId = null
let messagesListener = null
let onlineUsersListener = null

// WebRTC Configuration
let localStream = null
let remoteStream = null
let peerConnection = null
let callType = "video" // 'video' or 'audio'
let callStartTime = null
let callDurationInterval = null

const iceServers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
}

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  setupAuthListeners()
  setupChatListeners()
  setupCallListeners()
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user
      database.ref(`users/${user.uid}`).set({
        uid: user.uid,
        email: user.email,
        online: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
      })
      database.ref(`users/${user.uid}/online`).onDisconnect().set(false)
      database.ref(`users/${user.uid}/lastSeen`).onDisconnect().set(firebase.database.ServerValue.TIMESTAMP)
      showChatApp()
      loadOnlineUsers()
      listenForIncomingCalls()
    } else {
      showAuthSection()
    }
  })
})

// Auth Setup
function setupAuthListeners() {
  // Tab switching
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"))
      document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"))

      tab.classList.add("active")
      const formId = tab.dataset.tab + "-form"
      document.getElementById(formId).classList.add("active")
    })
  })

  // Login
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const email = document.getElementById("login-email").value
    const password = document.getElementById("login-password").value

    try {
      await auth.signInWithEmailAndPassword(email, password)
      hideError()
    } catch (error) {
      showError(error.message)
    }
  })

  // Register
  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault()
    const email = document.getElementById("register-email").value
    const password = document.getElementById("register-password").value

    try {
      const result = await auth.createUserWithEmailAndPassword(email, password)

      await database.ref(`users/${result.user.uid}`).set({
        uid: result.user.uid,
        email: email,
        online: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
      })

      hideError()
    } catch (error) {
      showError(error.message)
    }
  })

  // Logout
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await database.ref(`users/${currentUser.uid}/online`).set(false)
    await database.ref(`users/${currentUser.uid}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP)
    await auth.signOut()
  })
}

// Chat Setup
function setupChatListeners() {
  // Send message
  document.getElementById("send-message-btn").addEventListener("click", sendMessage)
  document.getElementById("message-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage()
  })

  // User search
  document.getElementById("user-search").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase()
    document.querySelectorAll(".user-item").forEach((item) => {
      const name = item.querySelector(".user-item-name").textContent.toLowerCase()
      item.style.display = name.includes(query) ? "flex" : "none"
    })
  })
}

// Call Setup
function setupCallListeners() {
  document.getElementById("video-call-btn").addEventListener("click", () => startCall("video"))
  document.getElementById("audio-call-btn").addEventListener("click", () => startCall("audio"))
  document.getElementById("accept-call-btn").addEventListener("click", acceptCall)
  document.getElementById("reject-call-btn").addEventListener("click", rejectCall)
  document.getElementById("end-call-btn").addEventListener("click", endCall)

  document.getElementById("toggle-mic-btn").addEventListener("click", toggleMic)
  document.getElementById("toggle-video-btn").addEventListener("click", toggleVideo)
}

// UI Functions
function showAuthSection() {
  document.getElementById("auth-section").style.display = "flex"
  document.getElementById("chat-app").style.display = "none"
}

function showChatApp() {
  document.getElementById("auth-section").style.display = "none"
  document.getElementById("chat-app").style.display = "flex"

  if (currentUser) {
    const emailInitial = currentUser.email.charAt(0).toUpperCase()
    document.getElementById("current-user-name").textContent = emailInitial
    document.getElementById("current-user-initial").textContent = emailInitial
  }
}

function showError(message) {
  const errorEl = document.getElementById("auth-error")
  errorEl.textContent = message
  errorEl.classList.add("show")
}

function hideError() {
  document.getElementById("auth-error").classList.remove("show")
}

function getInitial(email) {
  return email.charAt(0).toUpperCase()
}

async function loadOnlineUsers() {
  if (onlineUsersListener) {
    database.ref("users").off("value", onlineUsersListener)
  }

  const usersList = document.getElementById("users-list")

  onlineUsersListener = database.ref("users").on("value", (snapshot) => {
    const users = snapshot.val() || {}
    usersList.innerHTML = ""

    Object.values(users).forEach((user) => {
      if (user.uid !== currentUser.uid && user.online === true) {
        const userItem = createUserItem(user)
        usersList.appendChild(userItem)
      }
    })
  })
}

function createUserItem(user) {
  const div = document.createElement("div")
  div.className = "user-item"
  div.dataset.userId = user.uid

  const emailInitial = getInitial(user.email)

  div.innerHTML = `
    <div class="user-avatar">
      <span>${emailInitial}</span>
    </div>
    <div class="user-item-info">
      <div class="user-item-name">${emailInitial}</div>
      <div class="user-item-last-message">Click to start chatting</div>
    </div>
  `

  div.addEventListener("click", () => selectUser(user))

  return div
}

function selectUser(user) {
  selectedUserId = user.uid

  document.querySelectorAll(".user-item").forEach((item) => item.classList.remove("active"))
  document.querySelector(`[data-user-id="${user.uid}"]`).classList.add("active")

  document.getElementById("no-chat-selected").style.display = "none"
  document.getElementById("chat-content").style.display = "flex"

  const emailInitial = getInitial(user.email)
  document.getElementById("selected-user-name").textContent = emailInitial
  document.getElementById("selected-user-initial").textContent = emailInitial

  loadMessages(user.uid)
}

async function loadMessages(userId) {
  if (messagesListener) {
    database.ref(`messages/${getChatId(currentUser.uid, userId)}`).off("value", messagesListener)
  }

  const chatId = getChatId(currentUser.uid, userId)
  const messagesRef = database.ref(`messages/${chatId}`)

  messagesListener = messagesRef.on("value", (snapshot) => {
    const messages = snapshot.val() || {}
    displayMessages(messages)
  })
}

function getChatId(uid1, uid2) {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`
}

function displayMessages(messages) {
  const container = document.getElementById("messages-container")
  container.innerHTML = ""

  Object.values(messages).forEach((msg) => {
    const messageEl = createMessageElement(msg)
    container.appendChild(messageEl)
  })

  container.scrollTop = container.scrollHeight
}

function createMessageElement(message) {
  const div = document.createElement("div")
  div.className = `message ${message.senderId === currentUser.uid ? "sent" : "received"}`

  const time = new Date(message.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })

  div.innerHTML = `
    <div class="message-bubble">
      <div class="message-text">${message.text}</div>
      <div class="message-time">${time}</div>
    </div>
  `

  return div
}

async function sendMessage() {
  const input = document.getElementById("message-input")
  const text = input.value.trim()

  if (!text || !selectedUserId) return

  const chatId = getChatId(currentUser.uid, selectedUserId)
  const messagesRef = database.ref(`messages/${chatId}`)

  await messagesRef.push({
    text,
    senderId: currentUser.uid,
    receiverId: selectedUserId,
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  })

  input.value = ""
}

async function startCall(type) {
  if (!selectedUserId) return

  callType = type

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: type === "video",
      audio: true,
    })

    peerConnection = new RTCPeerConnection(iceServers)

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
      if (!remoteStream) {
        remoteStream = new MediaStream()
        document.getElementById("remote-video").srcObject = remoteStream
      }
      remoteStream.addTrack(event.track)
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        database.ref(`calls/${selectedUserId}/candidates`).push().set({
          candidate: event.candidate.toJSON(),
          from: currentUser.uid,
        })
      }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    const userSnapshot = await database.ref(`users/${selectedUserId}`).once("value")
    const user = userSnapshot.val()
    showIncomingCall({ email: user.email }, type, false)

    listenForCallAnswer()
  } catch (error) {
    console.error("Error starting call:", error)
    alert("Could not access camera/microphone")
  }
}

function listenForIncomingCalls() {
  database.ref(`calls/${currentUser.uid}`).on("value", async (snapshot) => {
    const call = snapshot.val()

    if (call && call.status === "ringing" && call.to === currentUser.uid) {
      const callerRef = database.ref(`users/${call.from}`)
      const callerSnap = await callerRef.once("value")
      const caller = callerSnap.val()

      showIncomingCall(caller, call.type, true)
      window.incomingCallData = call
    }
  })
}

function showIncomingCall(user, type, isIncoming) {
  document.getElementById("call-modal").style.display = "flex"

  if (isIncoming) {
    document.getElementById("incoming-call-view").style.display = "flex"
    document.getElementById("active-call-view").style.display = "none"
    const emailInitial = getInitial(user.email)
    document.getElementById("caller-name").textContent = emailInitial
    document.getElementById("caller-initial").textContent = emailInitial
    document.getElementById("call-type-label").textContent =
      type === "video" ? "Incoming video call..." : "Incoming audio call..."
  }
}

async function acceptCall() {
  const call = window.incomingCallData

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: call.type === "video",
      audio: true,
    })

    peerConnection = new RTCPeerConnection(iceServers)

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })

    peerConnection.ontrack = (event) => {
      if (!remoteStream) {
        remoteStream = new MediaStream()
        document.getElementById("remote-video").srcObject = remoteStream
      }
      remoteStream.addTrack(event.track)
    }

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        database.ref(`calls/${call.from}/candidates`).push().set({
          candidate: event.candidate.toJSON(),
          from: currentUser.uid,
        })
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(call.offer))

    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    await database.ref(`calls/${currentUser.uid}`).set({
      ...call,
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
      status: "connected",
    })

    showActiveCall(call.type)

    listenForIceCandidates(call.from)
  } catch (error) {
    console.error("Error accepting call:", error)
    endCall()
  }
}

function listenForCallAnswer() {
  database.ref(`calls/${selectedUserId}`).on("value", async (snapshot) => {
    const call = snapshot.val()

    if (call && call.answer && call.status === "connected") {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(call.answer))
      showActiveCall(call.type)
      listenForIceCandidates(selectedUserId)
    }
  })
}

function listenForIceCandidates(userId) {
  database.ref(`calls/${userId}/candidates`).on("value", async (snapshot) => {
    const candidates = snapshot.val() || {}

    for (const key in candidates) {
      const data = candidates[key]
      if (data.from !== currentUser.uid && peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        } catch (error) {
          console.error("Error adding ICE candidate:", error)
        }
      }
    }
  })
}

function showActiveCall(type) {
  document.getElementById("incoming-call-view").style.display = "none"
  document.getElementById("active-call-view").style.display = "flex"

  document.getElementById("local-video").srcObject = localStream
  document.getElementById("active-call-name").textContent = document.getElementById("selected-user-name").textContent

  if (type === "audio") {
    document.getElementById("local-video").style.display = "none"
    document.getElementById("remote-video").style.display = "none"
  }

  callStartTime = Date.now()
  updateCallDuration()
  callDurationInterval = setInterval(updateCallDuration, 1000)
}

function updateCallDuration() {
  if (!callStartTime) return

  const elapsed = Math.floor((Date.now() - callStartTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0")
  const seconds = (elapsed % 60).toString().padStart(2, "0")

  document.getElementById("call-duration").textContent = `${minutes}:${seconds}`
}

function rejectCall() {
  database.ref(`calls/${currentUser.uid}`).set(null)
  document.getElementById("call-modal").style.display = "none"
}

function endCall() {
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }

  remoteStream = null

  if (currentUser && selectedUserId) {
    database.ref(`calls/${currentUser.uid}`).set(null)
    database.ref(`calls/${selectedUserId}`).set(null)
  }

  if (callDurationInterval) {
    clearInterval(callDurationInterval)
    callDurationInterval = null
  }
  callStartTime = null

  document.getElementById("call-modal").style.display = "none"
  document.getElementById("local-video").style.display = "block"
  document.getElementById("remote-video").style.display = "block"
}

function toggleMic() {
  if (localStream) {
    const audioTrack = localStream.getAudioTracks()[0]
    audioTrack.enabled = !audioTrack.enabled
    document.getElementById("toggle-mic-btn").classList.toggle("active")
  }
}

function toggleVideo() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      document.getElementById("toggle-video-btn").classList.toggle("active")
    }
  }
}
