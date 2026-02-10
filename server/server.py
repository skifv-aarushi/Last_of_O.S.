import sys
import os
import random
import uuid
import time
from typing import List, Optional, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Depends, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from firebase_admin import auth, firestore

# --- IMPORT YOUR DATABASE CONNECTION ---
from database import get_db_client

# --- CRITICAL FIX: Add current folder to Python path ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="YANTRA 2026 Game Server")

# ==========================================
# 1. CONFIGURATION & CONSTANTS
# ==========================================

class GameConfig:
    MAX_PLAYERS = 300
    ROUNDS = 4
    INITIAL_HEALTH = 100
    HEAL_AMOUNT = 1
    DAMAGE_AMOUNT = 5
    CITIZEN_APPROVAL_THRESHOLD = 80
    CITIZEN_HEAL_THRESHOLD = 95
    MINOR_INFECTION_PENALTY = 6
    MAJOR_INFECTION_PENALTY = 10
    ATTACKER_COOLDOWN_MS = 2 * 60 * 1000
    AUTHORITY_COOLDOWN_MS = 3 * 60 * 1000
    AUDITOR_ABILITY_COOLDOWN_MS = 6 * 60 * 1000
    MINIGAME_DURATION_MS = 60 * 1000
    BUFFER_TIME_MIN_MS = 5 * 1000
    BUFFER_TIME_MAX_MS = 15 * 1000
    NUM_MINIGAMES = 6
    PROBLEMS_PER_GAME = 30

ROUND_RATIOS = [
    {'citizens': 2, 'attackers': 1},
    {'citizens': 1.5, 'attackers': 1},
    {'citizens': 1.2, 'attackers': 1},
    {'citizens': 1, 'attackers': 1},
]

# ==========================================
# 2. CORS SETUP
# ==========================================
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://last-of-os-485319.web.app",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. PYDANTIC MODELS (Input Validation)
# ==========================================

class UserRegister(BaseModel):
    email: str
    displayName: Optional[str] = None

class TokenVerify(BaseModel):
    idToken: str

class MinigameSubmit(BaseModel):
    problemId: str
    answer: float
    infectionLevel: Optional[str] = "none"

class CertificateProcess(BaseModel):
    action: str  # "approve" or "reject"
    medianEstimate: float = 75

class CooldownIssue(BaseModel):
    targetPlayerId: str
    reason: str = "Suspicious activity"

# ==========================================
# 4. UTILITY FUNCTIONS & LOGIC
# ==========================================

def get_current_time_ms():
    return int(time.time() * 1000)

def get_random_buffer_time():
    return random.randint(GameConfig.BUFFER_TIME_MIN_MS, GameConfig.BUFFER_TIME_MAX_MS)

def get_ordinal_suffix(n):
    s = ['th', 'st', 'nd', 'rd']
    v = n % 100
    return s[(v - 20) % 10] if (v - 20) % 10 < 4 else s[v] if v < 4 else s[0]

# --- MINIGAME GENERATORS (Ported from app.py) ---
def generate_minigame_problem(game_type):
    problem_id = random.randint(0, GameConfig.PROBLEMS_PER_GAME - 1)
    
    if game_type == 0: # Slider
        target = 30 + (problem_id * 2) + random.randint(0, 9)
        return {'type': 'slider', 'problemId': problem_id, 'targetValue': target, 'tolerance': 5, 'instruction': f'Adjust control to {target}%', 'minValue': 0, 'maxValue': 100}
    elif game_type == 1: # Value Entry
        a, b = 10 + problem_id, 5 + problem_id // 2
        return {'type': 'value_entry', 'problemId': problem_id, 'expectedAnswer': a * b, 'instruction': f'Calculate power: {a} x {b}'}
    elif game_type == 2: # Calibration
        readings = [random.randint(25, 74) for _ in range(5)]
        return {'type': 'calibration', 'problemId': problem_id, 'readings': readings, 'expectedAnswer': round(sum(readings) / len(readings)), 'instruction': f'Calibrate to average: {readings}'}
    elif game_type == 3: # Sequence
        start = problem_id + 1
        step = random.choice([2, 3, 4])
        seq = [start + i * step for i in range(4)]
        return {'type': 'sequence', 'problemId': problem_id, 'sequence': seq, 'expectedAnswer': start + 4 * step, 'instruction': f'Complete sequence: {seq}, ?'}
    elif game_type == 4: # Balance
        l, r = 20 + problem_id * 3, 15 + problem_id * 2
        return {'type': 'balance', 'problemId': problem_id, 'leftWeight': l, 'rightWeight': r, 'expectedAnswer': l - r, 'instruction': f'Balance system. Left: {l}, Right: {r}. Add to right:'}
    elif game_type == 5: # Frequency
        base = 100 + problem_id * 10
        harm = 2 + (problem_id % 3)
        return {'type': 'frequency', 'problemId': problem_id, 'baseFrequency': base, 'harmonic': harm, 'expectedAnswer': base * harm, 'instruction': f'Tune to {harm}{get_ordinal_suffix(harm)} harmonic of {base}Hz'}
    return {}

def calculate_score(problem, answer):
    try:
        answer = float(answer)
    except:
        return 0
    
    if problem['type'] == 'slider':
        diff = abs(answer - problem['targetValue'])
        return max(0, 100 - int(diff * 2))
    else:
        expected = problem.get('expectedAnswer', 0)
        if answer == expected: return 100
        elif abs(answer - expected) <= 2: return 90
        elif abs(answer - expected) <= 5: return 75
        else: return 50

# ==========================================
# 5. AUTH MIDDLEWARE (Dependency)
# ==========================================
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# ==========================================
# 6. API ENDPOINTS
# ==========================================

@app.get("/")
def read_root():
    return {"status": "YANTRA 2026 Backend Running", "engine": "FastAPI", "database": "Cloud Firestore"}

# --- AUTH ---
@app.post("/api/auth/register")
def register_user(user: UserRegister):
    try:
        password = str(uuid.uuid4())[:12]
        user_record = auth.create_user(email=user.email, password=password, display_name=user.displayName or user.email.split('@')[0])
        
        db = get_db_client()
        # FIRESTORE: Users are documents in 'users' collection
        db.collection('users').document(user_record.uid).set({
            'email': user.email,
            'displayName': user.displayName,
            'createdAt': get_current_time_ms(),
            'gamesPlayed': 0,
            'totalTrustScore': 0
        })
        return {"success": True, "userId": user_record.uid, "tempPassword": password, "message": "User created"}
    except auth.EmailAlreadyExistsError:
        # Returning user — look up existing UID and return success
        try:
            existing = auth.get_user_by_email(user.email)
            return {"success": True, "userId": existing.uid, "tempPassword": "", "message": "User already exists"}
        except Exception as e2:
            raise HTTPException(status_code=400, detail=str(e2))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/verify")
def verify_token(data: TokenVerify):
    try:
        decoded_token = auth.verify_id_token(data.idToken)
        return {"success": True, "uid": decoded_token['uid']}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- SESSION MANAGEMENT ---
@app.post("/api/session/create")
def create_session(user_id: str = Depends(get_current_user)):
    try:
        session_id = str(uuid.uuid4())
        session_data = {
            'id': session_id,
            'status': 'waiting',
            'currentRound': 0,
            'globalHealth': GameConfig.INITIAL_HEALTH,
            'createdAt': get_current_time_ms(),
            'medianScore': 75
        }
        db = get_db_client()
        # FIRESTORE: Create document in 'sessions'
        db.collection('sessions').document(session_id).set(session_data)
        return {"success": True, "sessionId": session_id, "session": session_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/session/{session_id}/join")
def join_session(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session_ref = db.collection('sessions').document(session_id)
    session = session_ref.get()
    
    if not session.exists:
        raise HTTPException(404, "Session not found")
    if session.to_dict().get('status') != 'waiting':
        raise HTTPException(400, "Session already started")
    
    # FIRESTORE: Check size of 'players' subcollection
    players_ref = session_ref.collection('players')
    # Count queries are efficient in Firestore
    count_query = players_ref.count()
    if len(players_ref.get()) >= GameConfig.MAX_PLAYERS:
         raise HTTPException(400, "Session full")
        
    players_ref.document(user_id).set({
        'joinedAt': get_current_time_ms(),
        'role': None,
        'trustScore': 0,
        'cooldownUntil': 0,
        'nextGameAvailable': 0
    })
    return {"success": True}

@app.post("/api/session/{session_id}/start")
def start_session(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session_ref = db.collection('sessions').document(session_id)
    
    # Fetch all player IDs
    players_docs = session_ref.collection('players').stream()
    player_ids = [doc.id for doc in players_docs]
    
    if len(player_ids) < 4:
        raise HTTPException(400, "Not enough players (min 4)")

    # Assign Roles
    ratio = ROUND_RATIOS[0]
    total = len(player_ids)
    auth_count = max(1, int(total * 0.1))
    audit_count = max(1, int(total * 0.05))
    others = total - auth_count - audit_count
    
    cit_count = int(others * (ratio['citizens'] / (ratio['citizens'] + ratio['attackers'])))
    
    shuffled = player_ids.copy()
    random.shuffle(shuffled)
    
    roles = {}
    idx = 0
    
    def assign(count, role_name):
        nonlocal idx
        for _ in range(count):
            if idx < len(shuffled):
                roles[shuffled[idx]] = role_name
                idx += 1

    assign(cit_count, 'citizen')
    assign(others - cit_count, 'attacker')
    assign(auth_count, 'authority')
    assign(audit_count, 'auditor')
    
    # FIRESTORE: Batch Write for atomicity
    batch = db.batch()
    for pid, role in roles.items():
        ref = session_ref.collection('players').document(pid)
        batch.update(ref, {'role': role, 'trustScore': 0, 'cooldownUntil': 0})
    
    session_ref.update({
        'status': 'active',
        'currentRound': 1,
        'roundStartedAt': get_current_time_ms()
    })
    batch.commit()
    
    return {"success": True, "roles": roles}

# --- MINIGAME LOOP ---
@app.get("/api/session/{session_id}/minigame")
def get_minigame(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    # FIRESTORE: Path = sessions/{id}/players/{uid}
    player_ref = db.collection('sessions').document(session_id).collection('players').document(user_id)
    player = player_ref.get()
    
    if not player.exists:
        raise HTTPException(404, "Player not found")
    
    p_data = player.to_dict()
    current_time = get_current_time_ms()
    
    if p_data.get('cooldownUntil', 0) > current_time:
        raise HTTPException(429, detail=f"On Cooldown: {(p_data['cooldownUntil'] - current_time)//1000}s")
    if p_data.get('nextGameAvailable', 0) > current_time:
        raise HTTPException(429, detail=f"Buffer time: {(p_data['nextGameAvailable'] - current_time)//1000}s")
        
    game_type = random.randint(0, GameConfig.NUM_MINIGAMES - 1)
    problem = generate_minigame_problem(game_type)
    problem_id = str(uuid.uuid4())
    
    # Store Active Problem in subcollection 'active_problems'
    db.collection('sessions').document(session_id).collection('active_problems').document(user_id).set({
        'problemId': problem_id,
        'problem': problem,
        'expiresAt': current_time + GameConfig.MINIGAME_DURATION_MS
    })
    
    # Hide answer from client
    safe_problem = {k: v for k, v in problem.items() if k != 'expectedAnswer'}
    return {"success": True, "problemId": problem_id, "problem": safe_problem, "timeLimit": GameConfig.MINIGAME_DURATION_MS}

@app.post("/api/session/{session_id}/minigame/submit")
def submit_minigame(session_id: str, data: MinigameSubmit, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session_doc_ref = db.collection('sessions').document(session_id)
    
    # Get Active Problem
    prob_ref = session_doc_ref.collection('active_problems').document(user_id)
    prob_doc = prob_ref.get()
    
    if not prob_doc.exists:
        raise HTTPException(400, "No active problem")
    
    prob_data = prob_doc.to_dict()
    if prob_data['problemId'] != data.problemId:
        raise HTTPException(400, "Invalid problem ID")
    
    current_time = get_current_time_ms()
    if current_time > prob_data.get('expiresAt', 0):
        prob_ref.delete()
        raise HTTPException(400, "Time expired")
        
    # Calculate Score
    problem = prob_data['problem']
    score = calculate_score(problem, data.answer)
    
    # Role Logic (Attacker Infection)
    player_ref = session_doc_ref.collection('players').document(user_id)
    player_data = player_ref.get().to_dict()
    
    is_infected = False
    if player_data.get('role') == 'attacker' and data.infectionLevel != 'none':
        is_infected = True
        if data.infectionLevel == 'minor':
            score = max(0, score - GameConfig.MINOR_INFECTION_PENALTY)
        elif data.infectionLevel == 'major':
            score = max(0, score - GameConfig.MAJOR_INFECTION_PENALTY)
            
    # Create Certificate in 'certificates' subcollection
    cert_id = str(uuid.uuid4())
    session_doc_ref.collection('certificates').document(cert_id).set({
        'id': cert_id,
        'playerId': user_id,
        'score': score,
        'isInfected': is_infected,
        'infectionLevel': data.infectionLevel if is_infected else None,
        'status': 'pending',
        'problemType': problem['type'],
        'createdAt': current_time
    })
    
    # Cleanup & Buffer
    prob_ref.delete()
    buffer_time = get_random_buffer_time()
    player_ref.update({
        'lastSubmission': current_time,
        'nextGameAvailable': current_time + buffer_time
    })
    
    return {"success": True, "score": score, "bufferTime": buffer_time}

# --- AUTHORITY ACTIONS ---
@app.get("/api/session/{session_id}/certificates/pending")
def get_pending_certs(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    
    # Verify Role
    player = db.collection('sessions').document(session_id).collection('players').document(user_id).get()
    if not player.exists or player.to_dict().get('role') != 'authority':
        raise HTTPException(403, "Not Authorized")

    # FIRESTORE: Query filtered by status='pending'
    query = db.collection('sessions').document(session_id).collection('certificates')\
              .where(filter=firestore.FieldFilter("status", "==", "pending")).limit(10)
    
    results = []
    for doc in query.stream():
        d = doc.to_dict()
        results.append({
            'id': d['id'],
            'problemType': d.get('problemType'),
            'score': d.get('score'),
            'createdAt': d.get('createdAt')
        })
    return {"success": True, "certificates": results}

@app.post("/api/session/{session_id}/certificates/{cert_id}/process")
def process_certificate(session_id: str, cert_id: str, data: CertificateProcess, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session_ref = db.collection('sessions').document(session_id)
    cert_ref = session_ref.collection('certificates').document(cert_id)
    cert = cert_ref.get()
    
    if not cert.exists or cert.to_dict()['status'] != 'pending':
        raise HTTPException(400, "Certificate invalid or already processed")
        
    cert_data = cert.to_dict()
    approved = (data.action == 'approve' and cert_data['score'] >= data.medianEstimate)
    
    # Update Cert
    cert_ref.update({
        'status': 'approved' if approved else 'rejected',
        'processedBy': user_id,
        'processedAt': get_current_time_ms()
    })
    
    # Calculate Impact
    health_change = 0
    if approved:
        if cert_data.get('isInfected'):
            health_change = -GameConfig.DAMAGE_AMOUNT
        elif cert_data['score'] >= GameConfig.CITIZEN_HEAL_THRESHOLD:
            health_change = GameConfig.HEAL_AMOUNT
            
    # Update Global Health (Transaction would be safer here, but keeping it simple)
    if health_change != 0:
        session_snap = session_ref.get()
        if session_snap.exists:
            current_health = session_snap.to_dict().get('globalHealth', 100)
            new_health = max(0, min(100, current_health + health_change))
            session_ref.update({'globalHealth': new_health})
        
    # Update Trust Score
    sender_ref = session_ref.collection('players').document(cert_data['playerId'])
    if approved:
        # FIRESTORE: Atomic Increment
        sender_ref.update({'trustScore': firestore.Increment(1)})
        
    return {"success": True, "approved": approved, "healthChange": health_change}

# --- AUDITOR ACTIONS ---
@app.post("/api/session/{session_id}/cooldown")
def issue_cooldown(session_id: str, data: CooldownIssue, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session_ref = db.collection('sessions').document(session_id)
    
    # Verify Auditor
    auditor_ref = session_ref.collection('players').document(user_id)
    auditor = auditor_ref.get()
    if not auditor.exists or auditor.to_dict().get('role') != 'auditor':
        raise HTTPException(403, "Not Authorized")
        
    current_time = get_current_time_ms()
    if auditor.to_dict().get('abilityCooldownUntil', 0) > current_time:
        raise HTTPException(429, "Ability on Cooldown")
        
    # Apply to Target
    target_ref = session_ref.collection('players').document(data.targetPlayerId)
    target = target_ref.get()
    if not target.exists:
        raise HTTPException(404, "Target not found")
        
    duration = GameConfig.AUTHORITY_COOLDOWN_MS if target.to_dict().get('role') == 'authority' else GameConfig.ATTACKER_COOLDOWN_MS
    
    target_ref.update({'cooldownUntil': current_time + duration})
    auditor_ref.update({'abilityCooldownUntil': current_time + GameConfig.AUDITOR_ABILITY_COOLDOWN_MS})
    
    # Log to 'ledger' subcollection
    session_ref.collection('ledger').add({
        'type': 'cooldown',
        'auditorId': user_id,
        'targetId': data.targetPlayerId,
        'reason': data.reason,
        'timestamp': current_time
    })
    
    return {"success": True, "cooldownDuration": duration}

# --- GAME STATE ---
@app.get("/api/session/{session_id}/state")
def get_state(session_id: str, user_id: str = Depends(get_current_user)):
    db = get_db_client()
    session = db.collection('sessions').document(session_id).get()
    if not session.exists:
        raise HTTPException(404, "Session not found")
        
    s_data = session.to_dict()
    player_snap = db.collection('sessions').document(session_id).collection('players').document(user_id).get()
    p_data = player_snap.to_dict() if player_snap.exists else {}
    
    return {
        "success": True,
        "globalHealth": s_data.get('globalHealth'),
        "currentRound": s_data.get('currentRound'),
        "status": s_data.get('status'),
        "playerRole": p_data.get('role'),
        "cooldownUntil": p_data.get('cooldownUntil', 0)
    }

# ... (existing code) ...

# --- ADD THIS BACK FOR TESTING ---
@app.get("/test-db")
def test_db_connection():
    try:
        from database import get_db_client
        db = get_db_client()
        # Create a temporary test document
        ref = db.collection("system_checks").document("cloud_test")
        ref.set({"status": "connected", "timestamp": get_current_time_ms()})
        
        # Read it back
        doc = ref.get()
        return {"status": "connected", "data": doc.to_dict()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # ...

if __name__ == "__main__":
    import uvicorn
    # Use 0.0.0.0 for container compatibility
    uvicorn.run(app, host="0.0.0.0", port=8000)