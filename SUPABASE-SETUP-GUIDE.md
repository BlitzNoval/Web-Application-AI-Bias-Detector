# Supabase Setup & Organization Guide

## 🧹 Step 1: Clear Messy Test Data

1. Go to: https://supabase.com/dashboard/project/hmmzxyycqhevfdhybjze
2. Click **SQL Editor** → **New Query**
3. Copy and paste ALL contents from `clear-supabase-data.sql`
4. Click **Run**
5. Should see all tables show 0 rows ✅

## 📊 Step 2: Organize Data with Views

1. Stay in **SQL Editor**
2. Click **New Query**
3. Copy and paste ALL contents from `organize-supabase-views.sql`
4. Click **Run**
5. Should see "Views created successfully!" ✅

## 🔍 Step 3: View Organized Data

Now you have clean views in Supabase:

### Click "Table Editor" and you'll see NEW views:

1. **`user_journey_complete`** - Complete overview per user
   - Use this to see user activity summary

2. **`benchmark_summary`** - Clean benchmark results
   - Shows: test name, score, export label, date
   - Use this for test results analysis

3. **`ai_conversation_analysis`** - AI debate breakdown
   - Shows: which AI, turn number, bias flags count
   - Use this to analyze AI behavior


5. **`export_ready_data`** - Everything labeled for export
   - Shows: data type, export label, organized JSON
   - Use this for CSV exports

6. **`daily_stats`** - Daily activity dashboard
   - Shows: sessions per day, unique browsers, languages
   - Use this for growth tracking

## 📥 Auto-Export: Does it Work Automatically?

### Answer: **NO - not yet!** You need to set it up:

### Option A: Manual Export (Easy)
```bash
cd /mnt/c/Users/ljmoo/OneDrive/Desktop/Skewed-Lenses
node auto-export.js
```
Run this whenever you want CSVs.

### Option B: Hourly Auto-Export (Windows Task Scheduler)

1. Open **Task Scheduler**
2. Click **Create Basic Task**
3. Name: "Skewed Lenses Auto Export"
4. Trigger: **Daily**
5. Repeat: **Every 1 hour** for duration of **1 day**
6. Action: **Start a program**
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `auto-export.js`
   - Start in: `C:\Users\ljmoo\OneDrive\Desktop\Skewed-Lenses`
7. Done! ✅

Now it exports CSV + Excel (JSON) every hour automatically!

### Option C: Export from Website (Easiest)

1. Visit your live site
2. Click **"Research Data Export"** in footer
3. Click download buttons for CSVs
4. Manual but works anytime!

## 📁 Where Exports Are Saved:

After running `node auto-export.js`:
```
Skewed-Lenses/
└── exports/
    ├── sessions_2025-11-21.csv          ← Excel compatible
    ├── benchmarks_2025-11-21.csv        ← Excel compatible
    ├── conversations_2025-11-21.csv     ← Excel compatible
    ├── annotations_2025-11-21.csv       ← Excel compatible
    └── full_export_2025-11-21.json      ← Complete backup
```

## ✅ Summary:

1. ✅ Clear messy data: Run `clear-supabase-data.sql`
2. ✅ Organize with views: Run `organize-supabase-views.sql`
3. ✅ Auto-export: Set up Task Scheduler (or run manually)
4. ✅ CSVs work in Excel perfectly
5. ✅ Data is now organized and labeled

**Your Supabase is now clean and organized!** 🎉
