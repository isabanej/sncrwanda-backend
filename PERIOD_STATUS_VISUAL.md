# Period Status Visualization

## Current Status (October 24, 2025)

```
┌────────────────────────────────────────────────────────────────┐
│                    CASHFLOW PERIOD STATUS                       │
│                    (As of Oct 24, 2025)                         │
└────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║ 2026 (Future Year)                                             ║
╠═══════════════════════════════════════════════════════════════╣
║ 🔴 Dec 2026 - LOCKED    (Cannot edit - Future period)         ║
║ 🔴 Nov 2026 - LOCKED    (Cannot edit - Future period)         ║
║ 🔴 Oct 2026 - LOCKED    (Cannot edit - Future period)         ║
║ 🔴 Sept 2026 - LOCKED   (Cannot edit - Future period)         ║
║ 🔴 ... (All 2026 months are LOCKED)                           ║
╚═══════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════╗
║ 2025 (Current Year)                                            ║
╠═══════════════════════════════════════════════════════════════╣
║ 🔴 Dec 2025 - LOCKED    (Cannot edit - Future period)         ║
║ 🔴 Nov 2025 - LOCKED    (Cannot edit - Future period)         ║
║                                                                ║
║ ┌──────────────────────────────────────────────────────────┐  ║
║ │ 🟢 Oct 2025 - OPEN    ✅ CURRENT MONTH                   │  ║
║ │    - Full editing access                                  │  ║
║ │    - Can record all transactions                          │  ║
║ │    - No restrictions                                      │  ║
║ └──────────────────────────────────────────────────────────┘  ║
║                                                                ║
║ ⚫ Sept 2025 - CLOSED   (Grace period expired on Oct 5)       ║
║ ⚫ Aug 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Jul 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Jun 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ May 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Apr 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Mar 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Feb 2025 - CLOSED    (Past period - Read only)             ║
║ ⚫ Jan 2025 - CLOSED    (Past period - Read only)             ║
╚═══════════════════════════════════════════════════════════════╝
```

## Status Transition Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│         Month Timeline (showing September → October)             │
└─────────────────────────────────────────────────────────────────┘

September 2025:
├─ Sept 1-30: 🟢 OPEN (Current month - full editing)
└─ Sept 30: Month ends

October 2025:
├─ Oct 1-5: 🟡 Sept becomes LATE_ENTRY_PERIOD (5-day grace period)
│           🟢 Oct becomes OPEN
├─ Oct 6: Grace period expires
│         ⚫ Sept becomes CLOSED (read-only)
└─ Oct 24 (Today): 
            🟢 Oct 2025 - OPEN (current month)
            ⚫ Sept 2025 - CLOSED (past month)
            🔴 Nov 2025+ - LOCKED (future months)
```

## 5-Day Grace Period Example

```
┌────────────────────────────────────────────────────────────────┐
│        September 2025 → October 2025 Transition                 │
└────────────────────────────────────────────────────────────────┘

Sept 30 (Last day)
    ↓
    ├─ Oct 1: 🟡 Sept = LATE_ENTRY_PERIOD (Day 1/5)
    ├─ Oct 2: 🟡 Sept = LATE_ENTRY_PERIOD (Day 2/5)
    ├─ Oct 3: 🟡 Sept = LATE_ENTRY_PERIOD (Day 3/5)
    ├─ Oct 4: 🟡 Sept = LATE_ENTRY_PERIOD (Day 4/5)
    ├─ Oct 5: 🟡 Sept = LATE_ENTRY_PERIOD (Day 5/5) - Last day!
    ├─ Oct 6: ⚫ Sept = CLOSED ❌ (No more edits allowed)
    └─ Oct 24 (Today): ⚫ Sept = CLOSED (Permanent read-only)

During LATE_ENTRY_PERIOD (Oct 1-5):
✅ Can still add/edit September transactions
⚠️  System shows warning: "Late Entry Period"
📅 Deadline shown: "Grace period ends Oct 5, 23:59"
```

## Dropdown Display (in Cashflow Page)

```
┌──────────────────────────────────────────┐
│ Select Period:                        ▼  │
├──────────────────────────────────────────┤
│ 2026                                     │  ← Year group
│   Dec 2026 - Locked         🔴          │
│   Nov 2026 - Locked         🔴          │
│   Oct 2026 - Locked         🔴          │
│   ...                                    │
├──────────────────────────────────────────┤
│ 2025                                     │  ← Year group
│   Dec 2025 - Locked         🔴          │
│   Nov 2025 - Locked         🔴          │
│ ► Oct 2025 - Open           🟢 ✅      │  ← Currently selected
│   Sept 2025 - Closed        ⚫          │
│   Aug 2025 - Closed         ⚫          │
│   Jul 2025 - Closed         ⚫          │
│   ...                                    │
└──────────────────────────────────────────┘
```

## Status Badge Colors

```
┌──────────────────────────────────────────────────────────┐
│ Status           │ Color  │ Badge      │ Can Edit?       │
├──────────────────┼────────┼────────────┼─────────────────┤
│ OPEN             │ 🟢 Green │ Open       │ ✅ Yes         │
│ LATE_ENTRY_PERIOD│ 🟡 Yellow│ Late Entry │ ✅ Yes (warns) │
│ CLOSED           │ ⚫ Gray   │ Closed     │ ❌ No          │
│ LOCKED           │ 🔴 Red    │ Locked     │ ❌ No          │
└──────────────────┴────────┴────────────┴─────────────────┘
```

## What Changed?

### Before:
```
All past and future periods → 🔴 LOCKED (confusing)
- Can't tell if it's past or future
- No differentiation between closed past and upcoming future
```

### After:
```
Past periods (after grace) → ⚫ CLOSED (clear it's historical)
Future periods → 🔴 LOCKED (clear it's not yet open)
Current period → 🟢 OPEN
Previous (within 5 days) → 🟡 LATE_ENTRY_PERIOD
```

## Benefits:

1. ✅ **Clear Distinction**: Users can easily see past vs future periods
2. ✅ **Year Grouping**: Organized by year for easier navigation  
3. ✅ **Visual Clarity**: Different colors for each status type
4. ✅ **Grace Period**: 5 days to complete previous month entries
5. ✅ **Current Month**: Always OPEN for immediate data entry
