# User Account Creation Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Automatically create a user account with a generated password after case submission, send credentials via Gmail SMTP, and enforce password change on first login.

**Architecture:** Extend Django auth with a UserProfile model linked to Passenger. Account creation triggered in CaseCreateView after save. Frontend adds login page and password change flow using token auth.

**Tech Stack:** Django 5.x, DRF TokenAuthentication, Gmail SMTP, React 18, TypeScript, Vite

**Design Spec:** `documentation/spec-driven/specs/2026-07-24-user-account-creation-design.md`

---

## File Structure

### New Files
- `backend/accounts/__init__.py` — App init
- `backend/accounts/models.py` — UserProfile model
- `backend/accounts/services.py` — Account creation + password generation + email
- `backend/accounts/serializers.py` — Login, password change serializers
- `backend/accounts/views.py` — Auth API views
- `backend/accounts/urls.py` — URL routing
- `backend/accounts/migrations/0001_initial.py` — Auto-generated
- `frontend/src/components/Auth/Login.tsx` — Login page
- `frontend/src/components/Auth/ChangePassword.tsx` — Password change page
- `frontend/src/components/Auth/AuthContext.tsx` — Auth state management
- `frontend/src/components/Auth/ProtectedRoute.tsx` — Route guard

### Modified Files
- `backend/config/settings.py` — Add accounts app, email settings
- `backend/config/urls.py` — Add accounts URLs
- `backend/cases/views.py` — Call account creation after case save
- `frontend/src/App.tsx` — Add routing, login/change-password pages
- `frontend/package.json` — Add react-router-dom

---

### Task 1: Backend Accounts App — Model and Migration

**Files:**
- Create: `backend/accounts/__init__.py`
- Create: `backend/accounts/models.py`
- Modify: `backend/config/settings.py` (add 'accounts' to INSTALLED_APPS)

**Requirements:**
- UserProfile model with OneToOne to auth.User, OneToOne to Passenger (nullable), must_change_password boolean, created_at
- Register app in settings

**Implementation:**

`backend/accounts/__init__.py`:
```python
```

`backend/accounts/models.py`:
```python
from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    passenger = models.OneToOneField(
        'cases.Passenger', on_delete=models.SET_NULL, null=True, blank=True, related_name='user_profile'
    )
    must_change_password = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Profile for {self.user.email}"
```

In `backend/config/settings.py`, add `'accounts'` to INSTALLED_APPS after `'cases'`.

**Verification:**
- Run `python manage.py makemigrations accounts` — should create 0001_initial.py
- Run `python manage.py migrate` — should apply without errors
- Run `python manage.py check` — no issues

---

### Task 2: Backend Account Creation Service

**Files:**
- Create: `backend/accounts/services.py`

**Requirements:**
- Function `create_user_account(passenger)` that:
  - Checks if User with passenger.email already exists → if yes, link profile to passenger and return
  - Generates 12-char secure password using `secrets`
  - Creates User with username=email, email=email
  - Creates UserProfile with must_change_password=True, linked to passenger
  - Sends email with credentials via Django's send_mail
  - Returns tuple (user, password, created: bool)

**Implementation:**

```python
import secrets
import string
import logging
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.conf import settings
from .models import UserProfile

logger = logging.getLogger(__name__)


def generate_password(length=12):
    alphabet = string.ascii_letters + string.digits + '!@#$%&*'
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure at least one of each category
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in '!@#$%&*' for c in password)):
            return password


def create_user_account(passenger):
    """
    Create a user account for a passenger after case creation.
    Returns (user, created) tuple.
    """
    email = passenger.email
    existing_user = User.objects.filter(email=email).first()

    if existing_user:
        # Link profile to this passenger if not already linked
        profile, _ = UserProfile.objects.get_or_create(user=existing_user)
        if profile.passenger is None:
            profile.passenger = passenger
            profile.save()
        return existing_user, False

    # Generate password and create user
    password = generate_password()
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=passenger.first_name,
        last_name=passenger.last_name,
    )

    UserProfile.objects.create(
        user=user,
        passenger=passenger,
        must_change_password=True,
    )

    # Send email
    _send_credentials_email(passenger, email, password)

    return user, True


def _send_credentials_email(passenger, email, password):
    subject = 'Your SkyRefund Account Has Been Created'
    message = (
        f"Dear {passenger.first_name} {passenger.last_name},\n\n"
        f"Your compensation case has been registered with SkyRefund.\n"
        f"An account has been created for you to track your case progress.\n\n"
        f"Login credentials:\n"
        f"  Email: {email}\n"
        f"  Password: {password}\n\n"
        f"Please log in and change your password immediately.\n\n"
        f"Best regards,\n"
        f"SkyRefund Team"
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send credentials email to {email}: {e}")
```

**Verification:**
- Run `python manage.py check` — no issues
- Import test: `python -c "from accounts.services import create_user_account"`

---

### Task 3: Backend Auth API Views and Serializers

**Files:**
- Create: `backend/accounts/serializers.py`
- Create: `backend/accounts/views.py`
- Create: `backend/accounts/urls.py`
- Modify: `backend/config/urls.py` (add accounts URLs)

**Requirements:**
- Login endpoint: POST /api/auth/login/ — email+password → token + must_change_password
- Change password endpoint: POST /api/auth/change-password/ — old+new password, clears flag
- Me endpoint: GET /api/auth/me/ — returns user info
- Rate limiting on login (5/minute)

**Implementation:**

`backend/accounts/serializers.py`:
```python
from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        validate_password(value)
        return value


class UserInfoSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    must_change_password = serializers.BooleanField()
```

`backend/accounts/views.py`:
```python
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from .models import UserProfile
from .serializers import LoginSerializer, ChangePasswordSerializer, UserInfoSerializer


class LoginThrottle(AnonRateThrottle):
    rate = '5/minute'


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)
        profile = UserProfile.objects.filter(user=user).first()
        must_change = profile.must_change_password if profile else False

        return Response({
            'token': token.key,
            'must_change_password': must_change,
            'user': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Incorrect password.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()

        # Clear must_change_password flag
        profile = UserProfile.objects.filter(user=user).first()
        if profile:
            profile.must_change_password = False
            profile.save()

        # Regenerate token
        Token.objects.filter(user=user).delete()
        new_token = Token.objects.create(user=user)

        return Response({
            'detail': 'Password changed successfully.',
            'token': new_token.key,
        })


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = UserProfile.objects.filter(user=request.user).first()
        return Response({
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'must_change_password': profile.must_change_password if profile else False,
        })
```

`backend/accounts/urls.py`:
```python
from django.urls import path
from .views import LoginView, ChangePasswordView, MeView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
]
```

In `backend/config/urls.py`, add:
```python
path('api/', include('accounts.urls')),
```

**Verification:**
- Run `python manage.py check` — no issues
- curl POST /api/auth/login/ with invalid creds → 401

---

### Task 4: Email Settings Configuration

**Files:**
- Modify: `backend/config/settings.py` (add email configuration at end)

**Requirements:**
- Gmail SMTP configuration using environment variables
- DEFAULT_FROM_EMAIL set

**Implementation:**

Add to end of `backend/config/settings.py`:
```python
# Email Configuration (Gmail SMTP)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('EMAIL_HOST_USER', 'noreply@skyrefund.com')
```

**Verification:**
- Run `python manage.py check` — no issues

---

### Task 5: Integrate Account Creation into Case Creation

**Files:**
- Modify: `backend/cases/views.py` (call create_user_account after case save)

**Requirements:**
- After `case = serializer.save()`, call `create_user_account(case.passenger)`
- Add `user_created` field to response
- Handle gracefully if account creation fails (case is still created)

**Implementation:**

In `backend/cases/views.py`, after `case = serializer.save()`:
```python
# Create user account for passenger
user_created = False
try:
    from accounts.services import create_user_account
    _, user_created = create_user_account(case.passenger)
except Exception as e:
    import logging
    logging.getLogger(__name__).error(f"Failed to create user account: {e}")

response_serializer = CaseResponseSerializer(case)
response_data = response_serializer.data
response_data['user_created'] = user_created
return Response(response_data, status=status.HTTP_201_CREATED)
```

**Verification:**
- Run `python manage.py check` — no issues
- Submit a case via API → check that auth_user and accounts_userprofile rows are created

---

### Task 6: Frontend Auth Context and API

**Files:**
- Create: `frontend/src/components/Auth/AuthContext.tsx`
- Modify: `frontend/src/services/api.ts` (add login, changePassword, getMe functions)

**Requirements:**
- AuthContext provides: token, user, isAuthenticated, mustChangePassword, login(), logout(), changePassword()
- Token stored in localStorage
- API functions for login, change-password, me endpoints

**Implementation:**

`frontend/src/services/api.ts` (additions):
```typescript
export interface LoginResponse {
  token: string;
  must_change_password: boolean;
  user: { email: string; first_name: string; last_name: string };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Login failed');
  }
  return response.json();
}

export interface ChangePasswordResponse {
  detail: string;
  token: string;
}

export async function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> {
  const response = await fetch('/api/auth/change-password/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.old_password?.[0] || data.new_password?.[0] || 'Password change failed');
  }
  return response.json();
}
```

`frontend/src/components/Auth/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, changePassword as apiChangePassword, LoginResponse } from '../../services/api';

interface AuthState {
  token: string | null;
  user: { email: string; first_name: string; last_name: string } | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('auth_user');
    const mustChange = localStorage.getItem('must_change_password') === 'true';
    return {
      token,
      user: user ? JSON.parse(user) : null,
      mustChangePassword: mustChange,
      isAuthenticated: !!token,
    };
  });

  const login = async (email: string, password: string) => {
    const response: LoginResponse = await apiLogin(email, password);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
    localStorage.setItem('must_change_password', String(response.must_change_password));
    setState({
      token: response.token,
      user: response.user,
      mustChangePassword: response.must_change_password,
      isAuthenticated: true,
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('must_change_password');
    setState({ token: null, user: null, mustChangePassword: false, isAuthenticated: false });
  };

  const changePasswordFn = async (oldPassword: string, newPassword: string) => {
    if (!state.token) throw new Error('Not authenticated');
    const response = await apiChangePassword(state.token, oldPassword, newPassword);
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('must_change_password', 'false');
    setState(prev => ({ ...prev, token: response.token, mustChangePassword: false }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, changePassword: changePasswordFn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Verification:**
- `npm run build` in frontend compiles without errors

---

### Task 7: Frontend Login and Change Password Pages

**Files:**
- Create: `frontend/src/components/Auth/Login.tsx`
- Create: `frontend/src/components/Auth/ChangePassword.tsx`
- Modify: `frontend/src/App.tsx` (add routing)
- Modify: `frontend/package.json` (add react-router-dom)

**Requirements:**
- Login page with email + password fields
- On successful login with must_change_password=true, redirect to /change-password
- Change password page: old password, new password, confirm new password
- After password change, redirect to home (case wizard)
- Simple, matches existing app styling (dark theme with indigo accents)

**Implementation:**

Add to `package.json` dependencies: `"react-router-dom": "^6.20.0"`

`frontend/src/components/Auth/Login.tsx`:
```typescript
import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#e0e7ff' }}>
        Login to SkyRefund
      </h2>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

`frontend/src/components/Auth/ChangePassword.tsx`:
```typescript
import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

interface ChangePasswordProps {
  onSuccess: () => void;
}

export function ChangePassword({ onSuccess }: ChangePasswordProps) {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from old password.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto', padding: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#e0e7ff' }}>
        Change Your Password
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#94a3b8' }}>
        You must change your password before continuing.
      </p>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#fca5a5' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={e => setOldPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0' }}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1' }}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
```

`frontend/src/App.tsx` (full replacement):
```typescript
import { useState } from 'react';
import { CaseWizard } from './components/CaseWizard/CaseWizard';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { Login } from './components/Auth/Login';
import { ChangePassword } from './components/Auth/ChangePassword';

function AppContent() {
  const { isAuthenticated, mustChangePassword } = useAuth();
  const [page, setPage] = useState<'home' | 'login' | 'change-password'>('home');

  // If user just logged in and must change password
  if (isAuthenticated && mustChangePassword) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <ChangePassword onSuccess={() => setPage('home')} />
      </div>
    );
  }

  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <Login onLoginSuccess={() => {
          // AuthContext will update; if mustChangePassword, the check above handles it
          setPage('home');
        }} />
        <button onClick={() => setPage('home')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}>
          ← Back to case submission
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeInUp 0.6s ease-out' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' }}>
            ✈️
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            SkyRefund
          </h1>
        </div>
        <p style={{ color: 'rgba(203, 213, 225, 0.8)', fontSize: '0.95rem' }}>
          Flight compensation made simple
        </p>
      </div>
      {/* Login link */}
      <div style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
        <button onClick={() => setPage('login')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          {isAuthenticated ? 'My Account' : 'Login'}
        </button>
      </div>
      <CaseWizard />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

**Verification:**
- Run `npm install` then `npm run build` — compiles without errors

---
