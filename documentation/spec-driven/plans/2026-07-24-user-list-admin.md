# User List (Admin) — Implementation Plan

**Spec:** `documentation/spec-driven/specs/2026-07-24-user-list-admin-design.md`

## File Structure

### Modified Files
- `backend/cases/models.py` — Add `assigned_to` FK
- `backend/accounts/views.py` — Add admin user list/edit/delete views
- `backend/accounts/serializers.py` — Add admin user serializers
- `backend/accounts/urls.py` — Add admin routes
- `frontend/src/App.tsx` — Add routing to UserList page
- `frontend/src/components/Auth/AuthContext.tsx` — Expose is_staff in context
- `frontend/src/services/api.ts` — Add admin API functions

### New Files
- `backend/cases/migrations/0005_case_assigned_to.py` — Auto-generated migration
- `frontend/src/components/Admin/UserList.tsx` — User list component

## Tasks

### Task 1: Add `assigned_to` FK on Case model
**File:** `backend/cases/models.py`

Add after the `status` field:
```python
assigned_to = models.ForeignKey(
    'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_cases'
)
```

Then run `python manage.py makemigrations cases`.

### Task 2: Add admin serializers
**File:** `backend/accounts/serializers.py`

```python
class AdminUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    role = serializers.CharField(read_only=True)
    assigned_case_count = serializers.IntegerField(read_only=True)


class AdminUserUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['Admin', 'Agent', 'User'])
    reset_password = serializers.BooleanField(default=False, required=False)
```

### Task 3: Add admin views
**File:** `backend/accounts/views.py`

- `AdminUserListView(APIView)` — GET returns annotated user list
- `AdminUserDetailView(APIView)` — PUT to edit, DELETE to remove
- Both use `IsAdminUser` permission

### Task 4: Add admin URL routes
**File:** `backend/accounts/urls.py`

```python
path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
```

### Task 5: Update AuthContext to expose role info
**File:** `frontend/src/components/Auth/AuthContext.tsx`

Add `is_staff` and `is_superuser` to user state and login response.

### Task 6: Add admin API functions
**File:** `frontend/src/services/api.ts`

```typescript
export const getUsers = () => api.get('/admin/users/');
export const updateUser = (id: number, data: any) => api.put(`/admin/users/${id}/`, data);
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}/`);
```

### Task 7: Build UserList component
**File:** `frontend/src/components/Admin/UserList.tsx`

Table with Name, Email, Role, Assigned Cases, Actions (Edit/Delete).
Edit opens inline form/modal. Delete shows confirmation.

### Task 8: Add navigation and routing in App.tsx
**File:** `frontend/src/App.tsx`

Show "Users" button for admin users, render UserList component when selected.

### Task 9: Update /api/auth/me/ and login to return is_staff
**File:** `backend/accounts/views.py`

Add `is_staff` and `is_superuser` to the login and me responses.
