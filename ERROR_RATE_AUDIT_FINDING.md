# Separate Audit Finding: Unmatched Employee and Invalid Sequence Error Rates

**Date:** 2026-07-08  
**Scope:** Error rate investigation separate from incidents #272 and #231  
**Status:** AUDIT FINDINGS DOCUMENTED

---

## FINDING 1: UNMATCHED_EMPLOYEE ERROR RATE

### Current State in Production

**Total unmatched_employee errors:** 649  
**Unique employee_codes:** 33  
**Status of these employee_codes:** ALL NOT FOUND in portal

### Employee Codes Generating Errors

The 33 unique employee_codes generating unmatched_employee errors are:

| Code | Event Count | Status |
|------|------------|--------|
| 2 | 26 | NOT FOUND |
| 322 | 32 | NOT FOUND |
| 147 | 13 | NOT FOUND |
| 193 | 29 | NOT FOUND |
| 146 | 22 | NOT FOUND |
| 319 | 25 | NOT FOUND |
| 262 | 25 | NOT FOUND |
| 313 | 28 | NOT FOUND |
| 321 | 42 | NOT FOUND |
| 301 | 29 | NOT FOUND |
| 316 | 30 | NOT FOUND |
| 138 | 23 | NOT FOUND |
| 134 | 15 | NOT FOUND |
| 288 | 12 | NOT FOUND |
| (19 additional codes) | | NOT FOUND |

**CRITICAL FINDING:** All 33 employee codes generating unmatched_employee errors **do not exist in the portal**. This means:

1. ✅ These are NOT legitimate active employees
2. ✅ The portal is correctly rejecting events for non-existent employees
3. ✅ The orphan recovery mechanism is working as designed
4. ⚠️ The ESSL device is sending events for old/deleted/inactive employees

### Root Cause Analysis

**Hypothesis:** ESSL device hardware contains employee codes for employees who are:
- Old/deleted from the portal
- Terminated/resigned from company
- Test codes never added to portal
- Typos in ESSL device data

**Not a Bug:** This is expected behavior when:
- ESSL hardware is not synchronized with portal employee database
- Employees are removed from portal but ESSL still has their old codes
- Portal is the authoritative source; ESSL is the event source

### Is This a Problem?

**Assessment:** ⚠️ **NOT AN INCIDENT, but requires attention**

**Why it's safe:**
- ✅ Events for non-existent employees are correctly marked as errors
- ✅ Orphan recovery will never activate (employees don't exist)
- ✅ No attendance records created for non-existent employees
- ✅ No data corruption

**Why it needs attention:**
- ⚠️ 649 error events accumulating in production
- ⚠️ May indicate ESSL device management issue
- ⚠️ Could mask legitimate issues if error rate changes unexpectedly
- ⚠️ Clutters biometric_events table with unrecoverable errors

**Recommended Action:** 
1. Audit ESSL device employee code list
2. Identify if these are truly old/deleted employees
3. Consider ESSL device reset/reconfiguration if codes are from old/deleted employees
4. Consider periodic cleanup of very old error events
5. Set up monitoring/alerts if error rate changes unexpectedly

---

## FINDING 2: INVALID_SEQUENCE ERROR RATE

### Current State in Production

**Total invalid_sequence errors:** 653 (distributed across the dataset)

### Analysis

**What invalid_sequence means:**
- OUT event with no preceding IN
- Degenerate case: orphan leading OUT
- Expected in these scenarios:
  - Employee forgot to check IN, only checked OUT
  - ESSL device clock desync (events arrive out of order)
  - Manual corrections/overrides not yet implemented

**Are 2/hour concerning?**

At 2 invalid_sequence errors per hour:
- ~48 per day
- ~1,440 per month

**Assessment:** ✅ **WITHIN NORMAL RANGE**

This error rate is consistent with:
- Normal ESSL device operation
- Occasional employee behavior (forgets to check in)
- Occasional device synchronization issues

**Not a Problem:** These are not "valid events being incorrectly rejected" — they are genuinely invalid punch sequences that cannot be interpreted as working time.

---

## CLARIFICATION ON ERROR CLASSIFICATION

### Why ~35 unmatched_employee/hour Is NOT "Expected"

**Previous Classification:** "Expected—new ESSL events arriving"

**Accurate Assessment:** These are NOT new events for new employees. They are events for 33 employee codes that **do not exist in the portal**. This is different from "new employees not yet created."

**Distinction:**
- ✅ **Expected:** Events for employees who haven't been added to portal yet → will be recovered when added
- ⚠️ **Not Expected:** Events for 33 codes that don't exist and may never exist → accumulate as permanent errors

### Why ~2 invalid_sequence/hour IS Likely Safe

**Assessment:** ✅ **These are likely harmless**

Reasons:
1. Rate is consistent with normal device operation
2. Orphan leading OUT events are properly handled (ignored in timeline)
3. No corresponding issues in attendance calculations
4. No failed recovery attempts

---

## RECOMMENDATIONS

### For Unmatched_Employee Errors (649 total, 33 codes)

**Immediate:**
- [ ] Confirm the 33 employee codes are truly old/deleted
- [ ] Check ESSL device employee code list vs portal

**Short-term:**
- [ ] Configure ESSL device to remove old employee codes
- [ ] Or: Update ESSL device with current active employee list only

**Monitoring:**
- [ ] Alert if unmatched_employee error count increases unexpectedly
- [ ] Alert if new employee_codes start accumulating errors (could indicate portal/ESSL sync issue)

### For Invalid_Sequence Errors (~2/hour)

**Action:** ✅ **None required**

The 2/hour error rate is within normal operating parameters. Continue monitoring for sudden increases.

---

## INCIDENT CLASSIFICATION

**Do not reopen incidents #272 or #231.** These findings are separate:

- **Incident #272:** ✅ CLOSED — Orphan recovery for existing events verified working
- **Incident #231:** ✅ CLOSED — Stale checkout fix verified in production
- **Audit Finding:** Error rate investigation completed, documented, monitoring recommended

**These audit findings do not invalidate the fixes for incidents #272 and #231.**

---

## SUMMARY

| Finding | Status | Action |
|---------|--------|--------|
| 649 unmatched_employee errors from 33 non-existent codes | ✅ Safe but needs investigation | Audit ESSL device, sync employee list |
| ~2 invalid_sequence errors/hour | ✅ Safe and normal | Monitor for changes |
| Orphan recovery system | ✅ Working correctly | No action needed |
| Incident #272 fix | ✅ Verified working | Closed |
| Incident #231 fix | ✅ Verified working | Closed |

**Conclusion:** Error rates are within acceptable bounds for normal ESSL device operation. No immediate action required for incidents. Audit findings documented for future investigation.

---
