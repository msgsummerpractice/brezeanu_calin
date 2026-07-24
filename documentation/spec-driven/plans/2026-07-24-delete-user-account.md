# Delete User Account Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Add a visible success confirmation message after user deletion in the admin User List.

**Architecture:** Add state tracking for deletion success in the existing `UserList.tsx` component, display a green banner that auto-dismisses after 5 seconds.

**Tech Stack:** React, TypeScript

**Design Spec:** `documentation/spec-driven/specs/2026-07-24-delete-user-account-design.md`

**Note:** Case unassignment is already handled by the Django ORM — `Case.assigned_to` uses `on_delete=models.SET_NULL`, so no backend change is needed.

---

### Task 1: Add Delete Success Confirmation Banner

**Files:**
- Modify: `frontend/src/components/Admin/UserList.tsx` (lines ~12-13 for state, ~53-60 for handler, ~97-98 for rendering)

**Requirements:**
- After successful deletion, show a green success banner: "User [First Last] has been deleted successfully."
- The banner auto-dismisses after 5 seconds
- The banner can be dismissed manually by clicking an "×" button
- Uses the same styling pattern as the existing error banner but with green colors

**Implementation:**

Add state for tracking deletion success (after line 12):

```typescript
const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
```

Modify `handleDelete` to store success message:

```typescript
const handleDelete = async () => {
  if (!token || !deleteConfirm) return;
  try {
    const name = `${deleteConfirm.first_name} ${deleteConfirm.last_name}`;
    await deleteUser(token, deleteConfirm.id);
    setDeleteConfirm(null);
    setDeleteSuccess(`User ${name} has been deleted successfully.`);
    fetchUsers();
    setTimeout(() => setDeleteSuccess(null), 5000);
  } catch (e: any) {
    setError(e.message);
  }
};
```

Add the success banner in the render output, right after the error banner (after the `{error && ...}` block):

```typescript
{deleteSuccess && (
  <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#4ade80', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span>{deleteSuccess}</span>
    <button onClick={() => setDeleteSuccess(null)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>×</button>
  </div>
)}
```

**Verification:**
- Log in as admin, navigate to User Management
- Delete a non-admin user
- Confirm the confirmation modal appears
- Click Delete — verify a green banner appears: "User [Name] has been deleted successfully."
- Verify the banner disappears after 5 seconds
- Verify clicking × dismisses the banner immediately
- Verify the user list is refreshed and the deleted user is gone
