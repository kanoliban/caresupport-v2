---
name: excel-editing
description: Edit and modify Excel spreadsheets. Use when working with .xlsx files.
---

# Excel Editing Skill

When editing Excel files, always use openpyxl with `copy()` to preserve formatting, and prefer Excel formulas over hardcoded calculated values for dynamic updates.

## Critical Rule: Use Formulas, Not Hardcoded Values

Always use Excel formulas instead of calculating in Python. This keeps spreadsheets dynamic.

```python
# ❌ WRONG - Hardcoding calculated values
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes 5000

# ✅ CORRECT - Using Excel formulas
sheet['B10'] = '=SUM(B2:B9)'
```

## Zero Formula Errors

Every Excel file must have zero formula errors: `#REF!`, `#DIV/0!`, `#VALUE!`, `#N/A`, `#NAME?`

After creating/modifying Excel files with formulas, validate them:
```bash
# Static validation (checks formula structure)
uv run python skills/excel-editing/scripts/validate_excel.py output.xlsx

# Full validation with formula recalculation (uses LibreOffice)
uv run python skills/excel-editing/scripts/validate_excel.py output.xlsx --recalc

# Strict mode (also checks for hardcoded values in formulas)
uv run python skills/excel-editing/scripts/validate_excel.py output.xlsx --recalc --strict
```

**Note:** The validation script NEVER modifies the original file. When using `--recalc`, formulas are recalculated in a temporary copy, preserving all original formatting and structure.

## Choosing the Right Library

| Use Case                            | Library  | Why                                  |
| ----------------------------------- | -------- | ------------------------------------ |
| Data analysis, aggregations, pivots | pandas   | Vectorized operations, DataFrame API |
| Formulas, formatting, styles        | openpyxl | Preserves Excel structure            |
| Simple data export                  | pandas   | Quick `to_excel()`                   |
| Modifying existing files            | openpyxl | Keeps formulas and formatting intact |

## Reading Excel Files

### With pandas (for data analysis)
```python
import pandas as pd

df = pd.read_excel('file.xlsx')  # First sheet
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # All sheets as dict
df.to_excel('output.xlsx', index=False)

# Performance tips for large files
df = pd.read_excel('file.xlsx', usecols=['A', 'B', 'C'])  # Only needed columns
df = pd.read_excel('file.xlsx', dtype={'id': str})  # Explicit types prevent inference issues
df = pd.read_excel('file.xlsx', parse_dates=['date_col'])  # Parse dates correctly
```

### With openpyxl (to preserve formulas)
```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

# Read calculated values only (WARNING: saving will permanently lose formulas!)
wb_data = load_workbook('file.xlsx', data_only=True)

# Performance tips for large files
wb = load_workbook('large.xlsx', read_only=True)  # Read-only mode, much faster
wb = Workbook(write_only=True)  # Write-only mode for generating large files
```

### openpyxl Gotchas
- **1-based indexing**: `sheet.cell(row=1, column=1)` is cell A1, not A0
- **data_only trap**: Loading with `data_only=True` then saving will replace all formulas with their last cached values - the formulas are gone forever
- **Formulas not evaluated**: openpyxl stores formulas as text, not calculated values. Use the validation script with `--recalc` to evaluate them

## Creating Excel Files

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

# Add data and formulas
sheet['A1'] = 'Revenue'
sheet['B1'] = 1000
sheet['B5'] = '=SUM(B1:B4)'

# Formatting
sheet['A1'].font = Font(bold=True, color='0000FF')  # Blue = input
sheet['B5'].font = Font(bold=True, color='000000')  # Black = formula

sheet.column_dimensions['A'].width = 20
wb.save('output.xlsx')
```

## Editing Existing Files

```python
from openpyxl import load_workbook

wb = load_workbook('existing.xlsx')
sheet = wb.active

# Modify while preserving structure
sheet['A1'] = 'New Value'
sheet.insert_rows(2)
sheet.delete_cols(3)

# Add sheets
new_sheet = wb.create_sheet('Summary')
new_sheet['A1'] = 'Total'

wb.save('modified.xlsx')
```

## Financial Model Standards

### Color Coding (industry-standard)
| Color             | Meaning                                  |
| ----------------- | ---------------------------------------- |
| Blue text         | Hardcoded inputs, user-changeable values |
| Black text        | All formulas and calculations            |
| Green text        | Links from other sheets in same workbook |
| Red text          | External links to other files            |
| Yellow background | Key assumptions needing attention        |

### Number Formatting
```python
# Currency with units in header
sheet['A1'] = 'Revenue ($mm)'
sheet['B1'].number_format = '$#,##0'

# Percentages with one decimal
sheet['C1'].number_format = '0.0%'

# Zeros as dashes
sheet['D1'].number_format = '$#,##0;($#,##0);"-"'

# Multiples
sheet['E1'].number_format = '0.0x'
```

### Formula Best Practices
```python
# ✅ Reference assumptions in separate cells
sheet['B2'] = 0.05  # Growth rate assumption
sheet['C5'] = '=B5*(1+$B$2)'

# ❌ Avoid hardcoded values in formulas
sheet['C5'] = '=B5*1.05'  # Bad: magic number
```

## Common Formula Errors and Fixes

| Error     | Cause                  | Fix                                      |
| --------- | ---------------------- | ---------------------------------------- |
| `#REF!`   | Invalid cell reference | Check deleted rows/columns               |
| `#DIV/0!` | Division by zero       | Add `=IF(B1=0,0,A1/B1)`                  |
| `#VALUE!` | Wrong data type        | Verify cell contains numbers             |
| `#NAME?`  | Unrecognized function  | Check spelling, use `TEXT()` not `TXT()` |
| `#N/A`    | VLOOKUP not found      | Add `IFERROR()` wrapper                  |

## Verification Checklist

- [ ] All formulas reference correct cells
- [ ] Column mapping is correct (column 64 = BL, not BK)
- [ ] Row offset accounts for 1-indexing (DataFrame row 5 = Excel row 6)
- [ ] Division by zero is handled
- [ ] Cross-sheet references use correct format (`Sheet1!A1`)
- [ ] Run validation script to check for errors
<!-- ══════════════════════════════════════════════════════════════════════════
