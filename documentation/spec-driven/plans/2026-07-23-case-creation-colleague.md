# CASE_04 — Colleague Field Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Add an initially-empty `colleague` field to the Case model and expose it in the API response.

**Architecture:** Single model field addition with migration, serializer update to expose the field in responses.

**Tech Stack:** Django 5.x, Django REST Framework, SQLite

**Design Spec:** `documentation/spec-driven/specs/2026-07-23-case-creation-colleague-design.md`

---

### Task 1: Add colleague field to Case model

**Files:**
- Modify: `backend/cases/models.py` (line ~88, after `created_at`)

**Requirements:**
- Add `colleague` CharField, max_length=255, blank=True, default=""
- Field goes right before `created_at`

**Implementation:**

In `backend/cases/models.py`, add this line after `incident_description` (line ~86) and before `created_at` (line ~87):

```python
    colleague = models.CharField(max_length=255, blank=True, default='')
```

The Case model's field block should end with:
```python
    incident_description = models.TextField(max_length=500, null=True, blank=True)
    colleague = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
```

**Verification:**
```bash
cd backend && python manage.py check
```
Expected: `System check identified no issues.`

---

### Task 2: Create and apply migration

**Files:**
- Create: `backend/cases/migrations/0004_case_colleague.py` (auto-generated)

**Requirements:**
- Run `makemigrations` to generate the migration
- Run `migrate` to apply it

**Implementation:**
```bash
cd backend && python manage.py makemigrations cases && python manage.py migrate
```

**Verification:**
```bash
cd backend && python manage.py showmigrations cases
```
Expected: All migrations including `0004_case_colleague` show `[X]` (applied).

---

### Task 3: Add colleague to CaseResponseSerializer

**Files:**
- Modify: `backend/cases/serializers.py` (line ~301)

**Requirements:**
- Add `colleague` to the `fields` list in `CaseResponseSerializer`
- The field is read-only (ModelSerializer default for non-editable display fields)

**Implementation:**

Change the `CaseResponseSerializer` in `backend/cases/serializers.py` from:

```python
class CaseResponseSerializer(serializers.ModelSerializer):
    case_id = serializers.UUIDField(source='id')

    class Meta:
        model = Case
        fields = ['case_id', 'status', 'created_at']
```

To:

```python
class CaseResponseSerializer(serializers.ModelSerializer):
    case_id = serializers.UUIDField(source='id')

    class Meta:
        model = Case
        fields = ['case_id', 'status', 'colleague', 'created_at']
```

**Verification:**
```bash
cd backend && python manage.py check
```
Expected: `System check identified no issues.`

After starting the dev server (`python manage.py runserver`), a POST to `/api/cases/` with valid data should return a response including `"colleague": ""`.
