# Scripts

## generate-dailies.js

Generates a JSON file containing metadata for all daily artwork files.

### What it does

- Scans the `dailies` folder at the project root
- Processes files with extensions: `.gif`, `.png`, `.mp4`, `.mov`
- Creates an entry for each file with:
  - `id`: Filename without extension (e.g., `rascal_daily_1`)
  - `imageUrl`: Path for Next.js public folder (e.g., `/dailies/rascal_daily_1.gif`)
  - `savedDate`: File modification date in YYYY-MM-DD format
  - `status`: Set to `"not_listed"`
  - `tags`: Empty array
- Sorts entries by `savedDate` ascending
- Outputs to `data/dailies.json`

### How to run

**Option 1: Using npm script (recommended)**
```bash
npm run generate-dailies
```

**Option 2: Direct Node.js execution**
```bash
node scripts/generate-dailies.js
```

### Setup instructions

1. **Move dailies to public folder** (if not already there):
   ```bash
   # Create public folder if it doesn't exist
   mkdir -p public
   
   # Move dailies folder into public
   mv dailies public/dailies
   ```
   
   Or if you prefer to keep dailies at the root, update the script's `DAILIES_FOLDER` path.

2. **Run the script**:
   ```bash
   npm run generate-dailies
   ```

3. **Verify output**:
   Check `data/dailies.json` to see the generated entries.

### Notes

- The script uses file modification dates for `savedDate`. If you need to set specific dates, you can manually edit the JSON file afterward.
- Files are sorted chronologically by modification date.
- Only files with supported extensions (`.gif`, `.png`, `.mp4`, `.mov`) are processed.
- The script will create the `data` directory if it doesn't exist.

