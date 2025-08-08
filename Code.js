// 🚨 Configuration (Replace with your actual values when deploying)
const folderId = "YOUR_FOLDER_ID_HERE";
const sheetId = "YOUR_SHEET_ID_HERE";
const sheetName = "Drive Tree Export";

// 📍 Constants
const PROGRESS_CELL = "H1";
const STATUS_CELL = "H2";
const batchLimit = 250;
const MAX_RUNTIME = 15 * 60 * 1000; // 15 minutes

/**
 * 📂 Adds custom menu to Google Sheets
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📂 Drive Tools")
    .addItem("▶ Start Export", "startExport")
    .addItem("⏵ Resume Export", "exportDriveTreeBatched")
    .addItem("⏸ Pause Export", "pauseExport")
    .addItem("⏹ Stop Export", "stopExport")
    .addItem("📊 Insert Summary", "insertSummaryTab")
    .addToUi();
}

/**
 * ▶ Starts a fresh export of the folder structure
 */
function startExport() {
  const props = PropertiesService.getDocumentProperties();
  props.deleteAllProperties();

  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(sheetName);

  if (sheet && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet);
    sheet = ss.insertSheet(sheetName);
  } else if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.appendRow(["Name", "Type", "File Type", "Last Modified", "Modified By", "Link", "Parent Folder"]);
  sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#B799FF");
  sheet.setFrozenRows(1);
  sheet.getRange(PROGRESS_CELL).setValue("Progress: 0%");
  sheet.getRange(STATUS_CELL).setValue("Status: Running");

  const state = {
    folders: [{ id: folderId, indent: 0, parentName: "" }],
    row: 2,
    counters: { folders: 0, files: 0, tabs: 0 },
    startTime: Date.now(),
  };

  props.setProperty("state", JSON.stringify(state));
  props.setProperty("status", "running");

  exportDriveTreeBatched();
}

/**
 * ⏸ Pauses the export process
 */
function pauseExport() {
  PropertiesService.getDocumentProperties().setProperty("status", "paused");
  SpreadsheetApp.openById(sheetId).getSheetByName(sheetName).getRange(STATUS_CELL).setValue("Status: Paused");
}

/**
 * ⏹ Stops the export process and clears saved state
 */
function stopExport() {
  PropertiesService.getDocumentProperties().deleteAllProperties();
  SpreadsheetApp.openById(sheetId).getSheetByName(sheetName).getRange(STATUS_CELL).setValue("Status: Stopped");
}

/**
 * 🔄 Continues the export in batches to avoid timeouts
 */
function exportDriveTreeBatched() {
  const props = PropertiesService.getDocumentProperties();
  const status = props.getProperty("status");
  if (status !== "running") return;

  let state = JSON.parse(props.getProperty("state"));
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName(sheetName);

  let rows = [];
  let processed = 0;
  const startTime = Date.now();

  const foldersToFormat = [];
  const filesToFormat = [];
  const tabsToFormat = [];

  while (state.folders.length > 0 && processed < batchLimit && Date.now() - startTime < MAX_RUNTIME) {
    const { id, indent, parentName } = state.folders.shift();
    try {
      const folder = DriveApp.getFolderById(id);
      const folderName = "│  ".repeat(indent) + `📁 ${folder.getName()}`;
      const folderLink = `=HYPERLINK("${folder.getUrl()}", "Open Folder")`;

      const hasFiles = folder.getFiles().hasNext();
      const hasSubfolders = folder.getFolders().hasNext();
      const label = (hasSubfolders || hasFiles)
        ? ` (${hasSubfolders ? "1+ folder" : ""}${hasFiles ? ", 1+ file" : ""})`
        : "";

      rows.push([`${folderName}${label}`, "Folder", "", "", "", folderLink, parentName]);
      foldersToFormat.push(state.row + rows.length - 1);
      state.counters.folders++;
      processed++;

      const subs = folder.getFolders();
      while (subs.hasNext()) {
        const sub = subs.next();
        state.folders.unshift({ id: sub.getId(), indent: indent + 1, parentName: folder.getName() });
      }

      const files = folder.getFiles();
      while (files.hasNext() && processed < batchLimit) {
        const file = files.next();
        if (file.getMimeType() === MimeType.GOOGLE_APPS_FOLDER) continue;

        const name = "│  ".repeat(indent + 1) + "📄 " + file.getName();
        const mime = file.getMimeType();
        const ext = file.getName().split('.').pop().toLowerCase();
        const type = getFriendlyType(mime, ext);
        const modified = file.getLastUpdated();
        const modifiedBy = file.getOwner() ? file.getOwner().getName() : "Unknown";
        const link = `=HYPERLINK("${file.getUrl()}", "${getLinkLabel(mime)}")`;

        rows.push([name, "File", type, modified, modifiedBy, link, folder.getName()]);
        filesToFormat.push(state.row + rows.length - 1);
        state.counters.files++;
        processed++;

        // If it's a Google Sheet, extract its tabs
        if (mime === MimeType.GOOGLE_SHEETS && processed < batchLimit - 3) {
          try {
            const tabs = SpreadsheetApp.openById(file.getId()).getSheets();
            for (const tab of tabs) {
              rows.push(["│  ".repeat(indent + 2) + "🎫 " + tab.getName(), "Tab", "Sheet Tab", "", "", "", file.getName()]);
              tabsToFormat.push(state.row + rows.length - 1);
              state.counters.tabs++;
              processed++;
              if (processed >= batchLimit) break;
            }
          } catch (e) {
            Logger.log("⚠️ Could not open sheet: " + file.getName());
          }
        }
      }
    } catch (e) {
      Logger.log(`⚠️ Skipping folder ${id}: ${e.message}`);
    }
  }

  // Insert rows and apply formatting
  if (rows.length > 0) {
    sheet.getRange(state.row, 1, rows.length, 7).setValues(rows);
    if (foldersToFormat.length)
      sheet.getRangeList(foldersToFormat.map(r => `A${r}:G${r}`)).setBackground("#ACBCFF").setFontWeight("bold");
    if (filesToFormat.length)
      sheet.getRangeList(filesToFormat.map(r => `A${r}:G${r}`)).setBackground("#AEE2FF");
    if (tabsToFormat.length)
      sheet.getRangeList(tabsToFormat.map(r => `A${r}:G${r}`)).setBackground("#E6FFFD");

    state.row += rows.length;
  }

  const total = state.counters.folders + state.counters.files + state.counters.tabs;
  const elapsed = (Date.now() - state.startTime) / 1000;
  const avgSpeed = total / elapsed;
  const remaining = Math.round(state.folders.length / (avgSpeed || 1));

  sheet.getRange(PROGRESS_CELL).setValue(`Progress: ${total} items | Est. Time Left: ${remaining}s`);
  sheet.getRange(STATUS_CELL).setValue("Status: Running");
  props.setProperty("state", JSON.stringify(state));

  // Continue in next batch
  if (state.folders.length > 0) {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === "exportDriveTreeBatched") {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    ScriptApp.newTrigger("exportDriveTreeBatched").timeBased().after(5000).create();
  } else {
    sheet.getRange(STATUS_CELL).setValue("Status: Completed ✅");
    props.deleteAllProperties();
    insertSummaryTab();
  }
}

/**
 * 🔖 Friendly labels for common file types
 */
function getFriendlyType(mime, ext) {
  const map = {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slide",
    "application/pdf": "PDF",
    "application/msword": "Word",
    "application/vnd.ms-excel": "Excel",
    "application/vnd.ms-powerpoint": "PowerPoint",
    "text/plain": "Text",
  };
  return map[mime] || (ext ? ext.toUpperCase() : "Unknown");
}

/**
 * 🔗 Friendly hyperlink labels
 */
function getLinkLabel(mime) {
  const map = {
    "application/vnd.google-apps.folder": "Open Folder",
    "application/vnd.google-apps.document": "Open Doc",
    "application/vnd.google-apps.spreadsheet": "Open Sheet",
    "application/vnd.google-apps.presentation": "Open Slides",
    "application/pdf": "Open PDF",
  };
  return map[mime] || "Open File";
}

/**
 * 📊 Inserts a summary tab with counts of file types
 */
function insertSummaryTab() {
  const ss = SpreadsheetApp.openById(sheetId);
  const exportSheet = ss.getSheetByName(sheetName);
  const status = exportSheet.getRange(STATUS_CELL).getValue();

  if (!status.includes("Completed")) {
    SpreadsheetApp.getUi().alert("Export is not completed yet.");
    return;
  }

  const oldSummary = ss.getSheetByName("Summary");
  if (oldSummary) ss.deleteSheet(oldSummary);

  const summarySheet = ss.insertSheet("Summary");
  summarySheet.appendRow(["📊 Summary of Drive Export"]);
  summarySheet.appendRow([""]);

  const data = exportSheet.getDataRange().getValues();
  let folders = 0, files = 0, tabs = 0;
  const countMap = {
    "Google Sheet": 0,
    "Google Doc": 0,
    "PDF": 0,
    "Google Slide": 0,
    "Word": 0,
    "Excel": 0,
    "PowerPoint": 0,
    "Other": 0,
  };

  for (let i = 1; i < data.length; i++) {
    const type = data[i][1];
    const fileType = data[i][2];
    if (type === "Folder") folders++;
    else if (type === "File") {
      files++;
      if (countMap.hasOwnProperty(fileType)) {
        countMap[fileType]++;
      } else {
        countMap["Other"]++;
      }
    } else if (type === "Tab") tabs++;
  }

  const total = folders + files + tabs;
  summarySheet.appendRow(["Category", "Count"]);
  summarySheet.getRange("A4:B4").setFontWeight("bold").setBackground("#DDEEFF");

  const rows = [
    ["Total Folders", folders],
    ["Total Files", files],
    ["Total Tabs", tabs],
    ["Google Sheets", countMap["Google Sheet"]],
    ["Google Docs", countMap["Google Doc"]],
    ["Google Slides", countMap["Google Slide"]],
    ["PDFs", countMap["PDF"]],
    ["Word Documents", countMap["Word"]],
    ["Excel Files", countMap["Excel"]],
    ["PowerPoint Files", countMap["PowerPoint"]],
    ["Other Files", countMap["Other"]],
    ["Total Items", total],
  ];

  summarySheet.getRange(5, 1, rows.length, 2).setValues(rows);
  summarySheet.autoResizeColumns(1, 2);
  summarySheet.getRange("A1").setFontSize(14).setFontWeight("bold");
}
