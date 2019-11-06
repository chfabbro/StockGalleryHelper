const Popup = (() => {
  const $ = window.jQuery;

  const ui = {
    orgId: '#orgId',
    orgName: '#orgName',
    getProfilesBtn: '#get-profiles',
    getUsersBtn: '#get-users',
  };

  const notify = (message) => {
    // sends message to background
    chrome.runtime.sendMessage(message);
  };

  // listen for messages from content and popup script
  const listen = (() => {
    chrome.runtime.onMessage.addListener((message, sender) => {
      console.log(message, sender);
    });
    $(ui.getProfilesBtn).on('click', () => {
      notify({ action: 'getProfiles' });
    });
    $(ui.getUsersBtn).on('click', () => {
      notify({ action: 'getUsers' });
    });
  });

  // stores data in local storage
  const store = (obj) => {
    if (chrome.storage) {
      console.log(obj);
      chrome.storage.local.set(obj, () => {
        const key = Object.keys(obj)[0];
        chrome.storage.local.get(key, (item) => {
          console.log('Stored %s with value %s', key, item[key]);
        });
      });
    }
  };

  // gets data from local storage; returns async function
  const retrieve = (key, cb, params) => {
    chrome.storage.local.get(key, (item) => {
      // create array of arguments to apply to callback
      const args = (params) ? [item[key]].concat(params) : [item[key]];
      cb.apply(this, args);
    });
  };

  // gets tab id of active front tab and sends it to background
  const getFrontTab = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      notify({
        status: 'ACTIVE_TAB',
        activeTab: tabs[0],
      });
    });
  };

  const updateOrg = (data, el) => {
    const id = data || 'unknown';
    $(el).text(id);
  };

  const init = () => {
    // init event listeners
    listen();
    notify({ status: 'POPUP_READY' });
    // now get front tab id
    getFrontTab();
    // retrieve('orgId', updateOrg, [ui.orgId]);
    // retrieve('orgName', updateOrg, [ui.orgName]);
  };

  $(document).ready(init);

  return {
    notify,
    store,
    retrieve,
  };
})();
