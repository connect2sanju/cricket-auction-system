# 🏏 Season 9 Setup Guide

## Files to Update for Season 9

### 1. **Update Players** 📝
**File:** `players.yaml`

Edit this file to add/remove/update players for Season 9.

**Format:**
```yaml
players:
  - name: Player Name 1
    photo: ""  # Optional: URL or path to player photo
  - name: Player Name 2
    photo: ""
```

**Example:**
```yaml
players:
  - name: John Doe
    photo: "https://example.com/john.jpg"
  - name: Jane Smith
    photo: ""
```

---

### 2. **Update Captains** 👨‍✈️
**File:** `backend/app.py`

Find line 65 and update the CAPTAINS list:

```python
CAPTAINS = ["Captain1", "Captain2", "Captain3", "Captain4", "Captain5"]
```

**Current (Season 8):**
```python
CAPTAINS = ["Amit", "Rajdeep", "Sanjib", "Sohail", "Vinay"]
```

**Update to Season 9 captains:**
```python
CAPTAINS = ["NewCaptain1", "NewCaptain2", "NewCaptain3", "NewCaptain4", "NewCaptain5"]
```

---

### 3. **Optional: Adjust Auction Settings** ⚙️
**File:** `backend/app.py` (lines 66-67)

You can also adjust:
- `INITIAL_POINTS = 200` - Starting balance for each captain
- `MIN_PRICE = 5` - Minimum bid price

---

## Quick Update Steps

1. **Update Players:**
   ```bash
   # Edit players.yaml
   nano players.yaml
   # or use your favorite editor
   ```

2. **Update Captains:**
   ```bash
   # Edit backend/app.py, line 65
   nano backend/app.py
   ```

3. **Restart Backend:**
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   ./start_backend.sh
   ```

4. **Refresh Frontend:**
   - Just refresh your browser (frontend auto-reloads)

---

## Files Already Updated ✅

- ✅ Header title: "Season 9 Auction"
- ✅ Page title: "Season 9"
- ✅ README.md: Updated to Season 9

---

## Notes

- Players are loaded from `players.yaml` automatically
- Captains must be updated in `backend/app.py`
- All changes take effect after restarting the backend server
- Old Season 8 data is safely backed up in `backup_original_20251128_200745/`

