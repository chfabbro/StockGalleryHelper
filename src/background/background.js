class Background {
  // stores data in local storage
  static store(obj) {
    if (chrome.storage) {
      console.log(obj);
      chrome.storage.local.set(obj, () => {
        const key = Object.keys(obj)[0];
        chrome.storage.local.get(key, (item) => {
          console.log('Stored %s: %s', key, item[key]);
        });
      });
    }
  }

  // gets data and returns promise for chaining
  static retrieve(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (item) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message;
          console.error(msg);
          reject(msg);
        } else {
          resolve(item[key]);
        }
      });
    });
  }

  static emptyStorage() {
    chrome.storage.local.clear();
  }

  // broadcasts messages to chrome runtime
  static notify(message, activeTab) {
    if (activeTab) {
      chrome.tabs.query({ active: true, currentWindow: true }, () => {
        chrome.tabs.sendMessage(activeTab.id, message);
      });
    } else console.log('activeTab not defined yet for: %s', JSON.stringify(message));
  }

  // get runtime environment
  static getEnvironment(url) {
    const BASE = {
      PROD: ['stock.adobe', 'contributor.stock.adobe'],
      STAGE: ['primary.stock.stage.adobe', 'staging1.contributors.adobestock'],
      DEV: ['adobestock.dev', 'contributors.dev'],
    };
    const re = /(https?:\/\/)(.*)\.(com|loc)/;
    let env;
    const match = (re.exec(url) && re.exec(url)[2]) ? re.exec(url)[2] : null;
    if (match) {
      Object.entries(BASE).forEach(([key, value]) => {
        if (value.includes(match)) {
          env = key;
        }
      });
    }
    return env || 'PROD';
  }

  // makes service call
  static async getStockGalleries() {
    // eslint-disable-next-line no-undef
    const svc = stock;
    const { retrieve } = Background;
    const env = retrieve('environment');
    const token = retrieve('access_token');
    const args = await Promise.all([
      env, token,
    ]).then((v) => {
      // if environment is undefined, use PROD
      const values = v;
      values[1] = (!v[1]) ? 'PROD' : v[1];
      return values;
    });
    // get stock product ID and add to end of arguments
    try {
      const galleries = await svc.getGalleries.apply(null, args);
      console.log(galleries);
      return galleries;
    } catch (e) {
      throw (e);
    }
  }
}

// add static constants
Background.CONSTANTS = {
  // identifies listener target for message
  TARGET: {
    B: 'background',
    C: 'content',
    P: 'popup',
  },
  ACTION: {
    GET: 'getGalleries',
    NEW: 'createGalleries',
    DEL: 'deleteGalleries',
  },
  RESPONSE: {
    GET: 'getGalleriesResponse',
  },
};

const {
  store,
  retrieve,
  emptyStorage,
  notify,
  getStockGalleries,
  createStockGallery,
  getEnvironment,
  CONSTANTS: K,
} = Background;

// activeTab tracks popup and parent window
let activeTab;

// execute workflows initiated by 'action' message
function actionHandler(msg) {
  switch (msg.action) {
    case K.ACTION.GET: {
      let statusMsg = K.RESPONSE.GET;
      let responseData;
      getStockGalleries()
        .then((data) => {
          responseData = data;
        }).catch((e) => {
          console.error(e);
          statusMsg = 'ERROR';
          responseData = e;
        }).finally(() => {
          const payload = {
            target: K.TARGET.P,
            data: responseData,
            statusMsg,
          };
          console.log(payload);
          notify(payload, activeTab);
        });
      break;
    }
    case K.ACTION.NEW: {
      const stock = createStockGallery();
      break;
    }
    default:
      break;
  }
}

// LISTENERS

// clear storage on extension update
chrome.runtime.onInstalled.addListener(() => {
  emptyStorage();
});

// listen for tab closing event
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(tabId, removeInfo);
  if (activeTab.id === tabId) {
    console.log('popup closing');
    emptyStorage();
  }
});

// listen for messages from content and popup script
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message);
  // update window tab
  if (sender.tab) activeTab = sender.tab;
  // if message contains an action that needs to be executed
  if (message.action) actionHandler(message);
  switch (message.status) {
    case 'ACTIVE_TAB':
      break;
    case 'CONTENT_READY':
      notify({ status: 'BACKGROUND_READY' }, activeTab);
      store({ environment: getEnvironment(sender.url) });
      break;
    case 'POPUP_READY':
      console.log('popup opened');
      ({ activeTab } = message); // equiv to activeTab = message.activeTab
      break;
    case 'TOKEN_READY':
      chrome.pageAction.show(sender.tab.id, () => {
        const manifest = chrome.runtime.getManifest();
        const tabId = sender.tab.id;
        chrome.pageAction.setIcon({
          tabId,
          path: manifest.page_action.default_icon,
        });
        chrome.pageAction.setTitle({
          tabId,
          title: manifest.page_action.default_title,
        });
      });
      console.log('token ready');
      // store({ access_token: message.access_token });
      break;
    case 'TOKEN_PROBLEM':
      // disable icon button until token available
      chrome.pageAction.hide(sender.tab.id, () => {
        const manifest = chrome.runtime.getManifest();
        const tabId = sender.tab.id;
        chrome.pageAction.setIcon({
          tabId,
          path: manifest.page_action.disabled_icon,
        });
        chrome.pageAction.setTitle({
          tabId,
          title: manifest.page_action.disabled_title,
        });
      });
      console.error('token not ready');
      break;
    default:
      break;
  }
});

// listens for click on extension
chrome.pageAction.onClicked.addListener(() => {
  const openTab = ((tab) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      throw (chrome.runtime.lastError.message);
    } else {
      chrome.tabs.highlight({
        tabs: tab.index,
      });
    }
  });
  // chrome.tabs.get(1234,callback);
  // get id for popup tab
  retrieve('helper').then((id) => {
    console.log(`switching to tab ${id}`);
    chrome.tabs.get(id, openTab);
  }).catch(() => {
    chrome.tabs.create({
      url: chrome.extension.getURL('popup.html'),
      active: true,
    }, (t) => {
      console.log(`created tab with id ${t.id}`);
      store({ helper: t.id });
    });
  });
});
