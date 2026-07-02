Intersmart HR Portal – Complete Leave Calculation & Leave Balance Policy

This document defines the complete Leave Management Policy for the Intersmart HR Portal. Every leave request, leave balance calculation, sandwich leave calculation, paid leave allocation, leave summary, leave approval, leave balance update, and Super Admin override must strictly follow these business rules.

1. Leave Types

The system supports the following leave types.

Full-Day Leave
Casual Leave (CL)
Sick Leave (SL)
Work From Home (WFH)
Half-Day Leave

Each half-day leave must allow the employee to choose either the Morning or Afternoon session.

Casual Leave
Half-Day Casual Leave (Morning)
Half-Day Casual Leave (Afternoon)
Sick Leave
Half-Day Sick Leave (Morning)
Half-Day Sick Leave (Afternoon)
Work From Home
Half-Day Work From Home (Morning)
Half-Day Work From Home (Afternoon)
2. Leave Balance Deduction
Leave Type	Leave Deduction
Full-Day Leave	1 Day
Half-Day Leave	0.5 Day

Half-day leave must always deduct only 0.5 day.

It should never deduct a full day.

3. Employee Leave Balance Initialization

When a new employee is created, the system must initialize leave balances automatically.

If the Joining Date is Today

Automatically allocate:

Casual Leave : 0
Sick Leave : 0

The employee is considered to be under probation.

No paid leave should be available during this period.

4. Probation Period

The probation period is 6 calendar months from the employee's joining date.

During probation:

No paid Casual Leave is available.
No paid Sick Leave is available.
Leave balance remains:
Casual Leave : 0
Sick Leave : 0
5. Automatic Leave Allocation After Probation

Immediately after completing 6 calendar months, the system must automatically allocate:

12 Casual Leaves
12 Sick Leaves

Example

Joining Date

26 May 2026

Probation Ends

26 November 2026

On 26 November 2026, the system must automatically update the employee's balance to:

Casual Leave : 12
Sick Leave : 12

No manual intervention should be required.

This must happen automatically on the exact probation completion date.

6. Casual Leave Carry Forward Policy

Casual Leave supports carry forward.

At the end of every calendar year:

Example

31 December 2026

Remaining CL

5

On

1 January 2027

The employee should automatically receive:

Carry Forward CL : 5

New Year's CL : 12

Total Casual Leave : 17

The carry-forward balance must be added automatically.

7. Carry Forward Validity

Carry-forward Casual Leave is valid only during the immediate next calendar year.

If the carried-forward balance is not used within that year, it must automatically expire.

Example

Carry Forward from 2026

5 CL

Not used during 2027

On

1 January 2028

Those 5 carried-forward leaves must be permanently deleted.

Only the remaining balance from 2027 is eligible for carry forward.

Older carry-forward leaves can never continue into a third year.

8. Sick Leave Policy

Sick Leave does not have any carry-forward policy.

Every year:

At

31 December

11:59:59 PM

All remaining Sick Leave balance must automatically expire.

On

1 January

The employee automatically receives:

12 Sick Leaves

Remaining Sick Leave from the previous year must never be carried forward.

9. Leave Consumption Priority

Whenever an employee uses Casual Leave, the system must consume leave in the following order:

Carry-Forward Casual Leave (Oldest Balance)
Current Year's Casual Leave

This ensures that carry-forward leave is used before it expires.

10. Future Leave Validation Across Calendar Years

The system must prevent employees from exploiting leave balances across calendar years.

Example

Today

20 December 2026

Employee has

5 Casual Leaves remaining.

Employee applies leave:

28 December 2026

to

5 January 2027

The system must split the calculation by calendar year.

For 2026

Only the remaining eligible leave balance of 2026 can be used.

For 2027

The employee cannot use leave that has not yet been granted or is not yet available according to policy.

The system must validate each calendar year independently.

If any portion of the leave violates the leave allocation rules, the system must reject the request with a clear explanation.

11. Casual Leave Advance Notice Rule

Casual Leave becomes a Paid Leave only if applied at least 3 calendar days before the leave starts.

Otherwise it becomes LOP.

12. Sick Leave

Sick Leave follows the same allocation logic.

If Sick Leave balance exists,

allocate it.

Otherwise,

remaining leave becomes LOP.

13. Sandwich Leave Policy

Whenever holidays fall between leave dates,

those holidays automatically become leave.

This includes:

Saturdays
Sundays
Company Holidays
Festival Holidays
Public Holidays
Any custom holiday added by the Super Admin

The system must always use the latest Holiday Calendar.

Weekends must never be hardcoded.

14. Dynamic Holiday Detection

The Super Admin may add holidays at any time.

Whenever leave is calculated,

the latest holiday list must be checked.

If holidays fall between leave dates,

they automatically become Sandwich Leave.

15. Sandwich Leave Across Multiple Applications

Employees must not bypass Sandwich Leave by submitting multiple leave requests.

Example

Friday Leave

Later

Monday Leave

The system must still detect:

Friday

Saturday

Sunday

Monday

as one continuous leave block.

16. Half-Day Sandwich Leave

Example

Friday Afternoon Half Day

Monday Morning Half Day

Calculation

Friday Afternoon

0.5

Saturday

1

Sunday

1

Monday Morning

0.5

Total Leave

3 Days

This rule applies even when the leaves are submitted separately.

17. Leave Calculation Order

Every leave request must follow this calculation sequence.

Calculate Requested Working Days.
Detect holidays.
Apply Sandwich Leave.
Calculate Total Leave Count.
Validate advance notice rules.
Validate leave balances.
Allocate Paid Leave.
Convert remaining leave into LOP.
18. Continuous Leave Block Rule

If the first leave day becomes LOP because of the advance notice rule,

the leave continues as one uninterrupted leave block.

Paid leave allocation starts only from the first eligible working day after the continuous non-eligible leave block.

19. Leave Balance Allocation

The system must allocate leave in the following order:

Eligible Carry-Forward Casual Leave
Current Year's Casual Leave
Sick Leave (for Sick Leave requests)
Remaining becomes LOP
20. Leave Summary

Every leave request must display a detailed calculation summary.

Requested Working Days      : XX

Sandwich Leave Days         : XX

Total Leave Count           : XX

Paid Casual Leave           : XX

Paid Sick Leave             : XX

Loss of Pay (LOP)           : XX

Remaining Casual Leave      : XX

Remaining Sick Leave        : XX

Status                      : Paid / Partially Paid / LOP
Reason for the Lop : 

The system must clearly explain:

requested leave
sandwich leave
paid leave
unpaid leave
remaining balances

Employees should never be left wondering how the leave was calculated.

21. Leave Calculation Explanation

Whenever leave is calculated, the system must clearly explain every decision made.

Examples:

Casual Leave is not eligible because it was applied less than 3 days in advance.
Saturday and Sunday were added as Sandwich Leave.
Company Holiday on 15 August was counted as Sandwich Leave.
Paid Casual Leave balance has been exhausted.
Remaining leave has been converted to LOP.
Carry-forward Casual Leave was used before the current year's Casual Leave.
Sick Leave balance is exhausted.
Leave spans two calendar years and has been calculated separately for each year.

Every calculation should be transparent to both employees and HR.

22. Super Admin Leave Balance Management

The Super Admin has complete authority to manage employee leave balances.

The Super Admin can:

Increase Casual Leave balance
Decrease Casual Leave balance
Increase Sick Leave balance
Decrease Sick Leave balance

The balance displayed in the employee profile is the master (core) balance used for all leave calculations.

All future leave requests must use this updated balance.

23. Probation Restriction for Super Admin

If the Super Admin attempts to manually allocate Casual Leave or Sick Leave before the employee completes probation,

the system must block the action.

Display a warning such as:

This employee is still under the 6-month probation period. Paid Casual Leave and Sick Leave cannot be granted until the probation period is completed.

The update must not be allowed.

24. Leave Balance Management After Probation

After probation ends,

HR/Super Admin may:

Remove the automatically allocated 12 Casual Leaves.
Remove the automatically allocated 12 Sick Leaves.
Increase leave balances.
Reduce leave balances.
Set any custom leave balance according to company policy.

The manually updated balance becomes the employee's official leave balance.

25. Super Admin Leave Override

During approval,

the Super Admin can:

Change Leave Dates.
Recalculate Leave.
Split Paid Leave and LOP.
Allocate Paid Casual Leave.
Allocate Paid Sick Leave.
Modify LOP.
Override automatic calculations.

The total must always equal the Total Leave Count.

26. Audit Trail

Every manual change must record:

Original Leave
Updated Leave
Original Balance
Updated Balance
Original Calculation
Updated Calculation
Approving Admin
Date & Time
Optional Override Reason
27. Employee Transparency

Every leave calculation must be fully transparent.

The employee should always know:

Why a leave became LOP.
Why Sandwich Leave was added.
Why Casual Leave was or was not allocated.
Why Sick Leave was or was not allocated.
Which leave balance was used.
Whether Carry-Forward Leave was used.
Whether leave crossed into another calendar year.
Why any leave request was rejected.

All validation messages, warnings, and calculation reasons should be displayed in clear, user-friendly language so that employees and HR can easily understand every decision made by the system without ambiguity.