# 📁 Google Drive Tree Exporter

**Google Drive Tree Exporter** is a Google Apps Script tool that allows you to generate a detailed hierarchical structure of any Google Drive folder. It lists all subfolders, files (including Google Docs, Sheets, PDFs, etc.), and even tabs from Google Sheets, directly into a Google Spreadsheet.

---

## ✨ Features

- Visual tree-style structure of Drive folders and files.
- Shows file type, last modified date, and file owner.
- Clickable links to open each file/folder.
- Automatically extracts and lists all tabs from Google Sheets.
- Includes a summary tab with total counts (folders, files, file types).
- Pause / Resume / Stop export via custom menu.

---

## 📦 Output Example

```
📁 Main Folder (3+ files, 2+ folders)
│  ├─ 📄 Document.docx
│  ├─ 📄 Sheet.xlsx
│  └─ 📁 Sub Folder (1+ file)
│     └─ 📄 Sales Report (Google Sheet)
│         └─ 🎫 Q1
│         └─ 🎫 Q2
```

---

## 🚀 How It Works

This script recursively navigates through a Google Drive folder (by folder ID) and lists all items in a spreadsheet. It uses batching to avoid timeout errors, and includes a menu in the spreadsheet UI to control export status.

---

## 🔧 Setup Instructions

### ✅ Prerequisites

- A Google Account
- [clasp](https://developers.google.com/apps-script/guides/clasp) (Command Line Apps Script Tool)
- Git

---

### 📁 1. Clone This Repository

```bash
git clone https://github.com/pkmangukiya/Google-Drive-Tree-Exporter.git
cd google-drive-tree-exporter
```

---

### 🛠 2. Setup clasp Configuration

#### Step 1: Copy the config template

```bash
cp .clasp.template.json .clasp.json
```

#### Step 2: Add Your Google Apps Script Project ID

In `.clasp.json`, replace:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./"
}
```

Get your `scriptId` from:
- Open your script project
- Go to: **Extensions > Apps Script > Project Settings**
- Copy the **Script ID**

---

### 🧠 3. Update `folderId` and `sheetId`

In `Code.gs`, update these constants with your actual values:

```js
const folderId = "YOUR_FOLDER_ID_HERE";
const sheetId = "YOUR_SHEET_ID_HERE";
```

> 📝 Tip: You can find the `folderId` and `sheetId` in the URL of your Drive folder or spreadsheet.

---

### 🔁 4. Deploy the Script

Use clasp to push the script to your Apps Script project:

```bash
clasp push
```

Then open the Apps Script editor:

```bash
clasp open
```

Run the `onOpen` function once manually to initialize the menu.

---

### 📄 5. Use the Tool

1. Open the connected Google Spreadsheet.
2. You’ll see a new menu: `📂 Drive Tools`
3. Use:
   - ▶ **Start Export** to begin scanning
   - ⏵ **Resume Export** to continue paused jobs
   - ⏸ **Pause Export** to temporarily stop
   - ⏹ **Stop Export** to cancel
   - 📊 **Insert Summary** to generate summary (auto runs after completion)

---

## 🔐 Security

To keep sensitive data safe:

- `.clasp.json` is in `.gitignore` (do not upload your script ID)
- Keep API keys, folder IDs, and sheet IDs **outside version control** or in `PropertiesService`

---

## 📚 Folder Structure

```
📁 google-drive-tree-exporter/
│
├── Code.gs                 # Main logic script
├── appsscript.json         # Apps Script config file
├── .clasp.template.json    # Template config (sample only)
├── README.md               # This file
└── .gitignore              # To ignore .clasp.json and node_modules
```

---

## 🧾 Output Columns

| Column          | Description                                      |
|----------------|--------------------------------------------------|
| Name            | File or folder name, shown in tree format        |
| Type            | Folder / File / Tab                              |
| File Type       | Google Doc, Sheet, PDF, etc.                     |
| Last Modified   | Last modified timestamp                          |
| Modified By     | Owner of the file                                |
| Link            | Clickable hyperlink to the file/folder           |
| Parent Folder   | The direct parent folder's name                  |

---

## 🧮 Summary Tab

When export is done, a **Summary** sheet is created with counts of:

- Total Folders
- Total Files
- Total Tabs
- Google Sheets, Docs, Slides
- PDFs, Word, Excel, PowerPoint
- Other File Types

---

## 🙋‍♂️ Support

Found a bug or want to contribute?
- Open an [issue](https://github.com/pkmangukiya/Google-Drive-Tree-Exporter/issues)
- Submit a pull request

---

## 📝 License

MIT License – free to use, share, and modify with attribution.
