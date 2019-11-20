const ignoreList = [
  'popup.js',
  'popup-controller.js',
  'popup.html',
  'popup.css',
  'background.js',
  'services.mjs',
  'other',
];

// get the list of all files in the extension directory (recursively)
const filesInDirectory = (dir) => new Promise((resolve) => dir.createReader().readEntries((entries) => Promise.all(entries.filter((e) => (e.name[0] !== '.' && !ignoreList.includes(e.name[0]))).map((e) => (e.isDirectory
  ? filesInDirectory(e)
  : new Promise((res) => e.file(res)))))
  .then((files) => {
    const myFiles = files.filter((f) => !ignoreList.includes(f.name));
    return [].concat(...myFiles);
  })
  .then(resolve)));

// concatenates the file names and lastModifiedDate of all files
const timestampForFilesInDirectory = (dir) => filesInDirectory(dir)
  .then((files) => files.map((f) => f.name + f.lastModifiedDate).join());

// reloads the active tab
const reload = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { // NB: see https://github.com/xpl/crx-hotreload/issues/5
    if (tabs[0]) { chrome.tabs.reload(tabs[0].id); }

    chrome.runtime.reload();
  });
};

// checks for changes every 1000ms
const watchChanges = (dir, lastTimestamp) => {
  timestampForFilesInDirectory(dir).then((timestamp) => {
    if (!lastTimestamp || (lastTimestamp === timestamp)) {
      setTimeout(() => watchChanges(dir, timestamp), 2000); // retry after 1s
    } else {
      reload();
    }
  });
};

// starts the watchdog targeting the directory with the extension's code, but only in dev mode
chrome.management.getSelf((self) => {
  if (self.installType === 'development') {
    chrome.runtime.getPackageDirectoryEntry((dir) => watchChanges(dir));
  }
});
