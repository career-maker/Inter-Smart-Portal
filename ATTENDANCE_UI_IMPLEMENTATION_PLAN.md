# Attendance Daily Activity Timeline — Implementation Plan

**Date:** 2026-07-08  
**Status:** READY FOR IMPLEMENTATION

---

## CURRENT STATE

### Backend ✅
- **Endpoint:** `GET /api/attendance/details?date=YYYY-MM-DD&user_id={id}`
- **Data Available:**
  - `raw_punches` - Chronological IN/OUT events
  - `working_sessions` - Calculated work blocks
  - `completed_breaks` - Calculated breaks
  - `first_in`, `last_out` - Canonical times
  - `is_currently_working` - Boolean flag
  - `total_working_minutes`, `total_completed_break_minutes`
- **Status:** Backend fully provides canonical timeline ✅

### Frontend ✅
- **Main Page:** `/frontend/src/app/(dashboard)/attendance/page.tsx`
  - Shows month/day filter ✓
  - Shows summary stats ✓
  - Shows table with attendance records ✓
  - Has "View" button linking to details
- **Details Page:** `/frontend/src/app/(dashboard)/attendance/details/[date]/page.tsx`
  - Partially implemented
  - Needs: Daily activity timeline display

---

## REQUIRED CHANGES

### Backend Changes: NONE ✅
The backend already provides all needed data in the correct format.

### Frontend Changes

#### 1. Daily Activity Timeline Component (NEW)

**File:** `frontend/src/components/attendance/DailyActivityTimeline.tsx`

**Purpose:** Display chronological activity for one day

**Features:**
- List raw_punches in order with human-readable labels
- Label each event based on position in day:
  - First IN → "First Clock In"
  - IN after OUT → "Clock In / Break Ended"
  - OUT followed by IN → "Clock Out / Break Started"
  - Final OUT (when is_currently_working=false) → "Final Clock Out"
  - OUT when is_currently_working=true → "Clock Out (Currently Working)"

**Props:**
```typescript
{
  rawPunches: Array<{ type: string; time: string; event_id: number }>;
  isCurrentlyWorking: boolean;
  firstIn?: string;
  lastOut?: string;
}
```

**Output:** Vertical timeline with labeled events

#### 2. Daily Summary Card (NEW)

**File:** `frontend/src/components/attendance/DailySummaryCard.tsx`

**Purpose:** Show one-day summary above timeline

**Fields:**
- Employee Name
- Employee Code
- Team
- Date
- First Check-In
- Last/Final Check-Out (or "Currently Working")
- Number of Breaks
- Total Break Duration
- Total Worked Hours
- Current/Final Shift Status
- Attendance Status
- Late Arrival status/minutes
- Early Leaving status/minutes

**Props:**
```typescript
{
  attendance?: AttendanceDetails;
  totalBreaks: number;
  totalBreakMinutes: number;
  totalWorkMinutes: number;
  isCurrentlyWorking: boolean;
}
```

#### 3. Update Attendance Details Page

**File:** `/frontend/src/app/(dashboard)/attendance/details/[date]/page.tsx`

**Changes:**
- Import new components
- Display DailySummaryCard at top
- Display DailyActivityTimeline below summary
- Keep existing raw data display at bottom (for debugging)

---

## DATA FLOW

```
Backend API (/attendance/details)
    ↓
    ├─ raw_punches (chronological list with type: IN/OUT)
    ├─ first_in / last_out (canonical times)
    ├─ is_currently_working (boolean)
    ├─ completed_breaks (list with minutes)
    ├─ total_working_minutes
    └─ working_sessions (work blocks)
    ↓
Frontend Page (/attendance/details/[date])
    ↓
    ├─ DailySummaryCard (displays summary stats)
    └─ DailyActivityTimeline (displays raw_punches as readable timeline)
    ↓
HTML/CSS Rendering
    ↓
User sees clear chronological activity for the day
```

---

## LABEL LOGIC FOR TIMELINE EVENTS

For each raw_punch in order:

1. **First event in list + type=IN**
   - Label: "First Clock In"

2. **Event where type=IN + Previous event was OUT**
   - Label: "Clock In / Break Ended"

3. **Event where type=OUT + Next event is IN (or is_currently_working=false)**
   - If latest event and not currently working:
     - Label: "Final Clock Out"
   - Else:
     - Label: "Clock Out / Break Started"

4. **Event where type=OUT + is_currently_working=true (latest event)**
   - Label: "Clock Out (Continued Working)"

---

## DISPLAY ORDER

1. Daily Summary Card
   - Employee info
   - Check-in/checkout times
   - Work hours
   - Break info
   - Status

2. Activity Timeline
   - Vertical list with timestamps and labels
   - Connects visually (lines between events)

3. Breaks Summary (optional)
   - Number of breaks
   - Break duration details

---

## VERIFICATION POINTS

### Employee 272 (8-Event Production Sequence)
```
Expected Timeline:
09:45:38 — First Clock In
10:59:53 — Clock Out / Break Started
12:11:12 — Clock Out / Break Started (duplicate OUT, shown)
12:16:55 — Clock In / Break Ended
14:03:25 — Clock Out / Break Started (duplicate OUT shown)
14:03:26 — Final Clock Out

Expected Summary:
- First Check-In: 09:45:38
- Final Check-Out: 14:03:26
- Total Work: 251 minutes
- Breaks: 1
- Break Duration: 5 minutes
```

### Employee 231 (Currently Working)
```
Expected Timeline:
10:40:27 — First Clock In
[multiple intermediate IN/OUT events]
16:13:32 — Clock In (Currently Working - no final checkout)

Expected Summary:
- First Check-In: 10:40:27
- Final Check-Out: [Empty / "Still Working"]
- Status: Currently Working / Punched In
- No stale 13:00:55 checkout displayed
```

---

## TESTING REQUIREMENTS

### Backend Tests
- No changes needed (already tested)

### Frontend Component Tests
- Timeline renders all raw_punches
- Labels are correct for each event type
- First event is labeled "First Clock In"
- Final event is labeled correctly based on is_currently_working
- Break-related labels appear between OUT/IN pairs
- Summary card displays all required fields
- Permission checks work (Employee/TL/Admin)

### Integration Tests
- Details page loads with timeline
- All 8 employee 272 events displayed
- Employee 231 shows as working (no stale checkout)
- Employee 272 shows 251 minutes worked
- Employee 231 shows correct break count

---

## FILES TO CREATE/MODIFY

### Create (NEW)
- [ ] `frontend/src/components/attendance/DailyActivityTimeline.tsx`
- [ ] `frontend/src/components/attendance/DailySummaryCard.tsx`
- [ ] `frontend/src/components/attendance/index.ts` (exports)

### Modify (EXISTING)
- [ ] `frontend/src/app/(dashboard)/attendance/details/[date]/page.tsx`

### No Changes
- [ ] Backend (API already complete)
- [ ] Database schema
- [ ] Attendance model
- [ ] Routes

---

## IMPLEMENTATION SEQUENCE

1. Create DailyActivityTimeline component
2. Create DailySummaryCard component
3. Update details page to use new components
4. Test with employee 272 and 231
5. Verify all roles can see (Employee/TL/Admin)
6. Run existing tests to ensure no regressions

---

**Status:** Ready to implement  
**Risk Level:** LOW (no backend changes, pure UI improvement)  
**Effort:** 2-3 hours implementation + testing
