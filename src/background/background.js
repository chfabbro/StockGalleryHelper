class Background {
  // static constants
  static CONSTANTS = {
    // identifies listener target for message
    TARGET: {
      B: 'background',
      C: 'content',
      P: 'popup',
    },
    ACTION: {
      GET: 'getGalleries',
      NEW: 'createGallery',
      DEL: 'deleteGallery',
      DIR: 'getContent',
      ADD: 'addContent',
      REM: 'removeContent',
    },
    RESPONSE: {
      GET: 'getGalleriesResponse',
      NEW: 'createGalleryResponse',
      DEL: 'deleteGalleryResponse',
      DIR: 'getContentResponse',
      ADD: 'addContentResponse',
      REM: 'removeContentResponse',
      ERROR: 'Error',
    },
    ENV: {
      PROD: ['stock.adobe', 'contributor.stock.adobe'],
      STAGE: ['primary.stock.stage.adobe', 'staging1.contributors.adobestock', 'sandbox.stock.stage.adobe'],
      DEV: ['adobestock.dev', 'contributors.dev'],
    },
    // key values for local storage
    DATA: {
      getGalleriesResponse: {
        BASE: 'galleries',
        COUNT: 'nb_results',
        MAP: [
          'name',
          'nb_media',
          'id',
        ],
        LIMIT: 100, // api request limit
      },
      getContentResponse: {
        BASE: 'files',
        COUNT: 'nb_results',
        MAP: [
          'id',
          'title',
          'width',
          'height',
          'nb_downloads',
          'thumbnail_url',
          'href',
        ],
        LIMIT: 100, // api request limit
      },
      TOKEN: 'access_token',
      GALLERY: {
        ID: 'galleryId',
        NAME: 'galleryName',
      },
      ENV: 'environment',
      POPUP: 'helper',
      STOCK_TAB: 'stock-window',
    },
    ERROR_CODES: {
      TOKEN_PROBLEM: 999,
    },
  }

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
    const re = /(https?:\/\/)(.*)\.(com|loc)/;
    let env;
    const match = (re.exec(url) && re.exec(url)[2]) ? re.exec(url)[2] : null;
    if (match) {
      Object.entries(Background.CONSTANTS.ENV).forEach(([key, value]) => {
        if (value.includes(match)) {
          env = key;
        }
      });
    }
    return env || 'PROD';
  }

  // makes service call
  static async callStockService(method, input, pageModel) {
    // eslint-disable-next-line no-undef
    const svc = stock;
    const { retrieve, CONSTANTS: K } = Background;
    const env = retrieve(K.DATA.ENV);
    const token = retrieve(K.DATA.TOKEN);
    const args = await Promise.all([
      env, token,
    ]).then(([e, t]) => {
      // if environment is undefined, use PROD
      const environment = (!e) ? 'PROD' : e;
      if (!t) {
        // TODO: Fix response and fix issue where opening Stock site in new tab breaks plugin
        throw svc.http.parseErrors({ code: K.ERROR_CODES.TOKEN_PROBLEM });
      }
      return [environment, t];
    });
    // append any incoming parameters
    args.push(input);
    args.push(pageModel);
    // calls {method} from services
    try {
      const response = await svc[method].apply(null, args);
      console.log(response);
      return response;
    } catch (e) {
      // return either a JS error message or internal error string
      throw (e.message || e);
    }
  }
}

const {
  store,
  retrieve,
  emptyStorage,
  notify,
  callStockService,
  getEnvironment,
  CONSTANTS: K,
} = Background;

// activeTab tracks popup and parent window
let activeTab;

// execute workflows initiated by 'action' message
function actionHandler(msg) {
  const input = msg.data;
  let status;
  let pageModel;
  const { action } = msg;
  switch (msg.action) {
    case K.ACTION.GET: {
      status = K.RESPONSE.GET;
      // attach data object for pagination support
      const { BASE, COUNT, LIMIT } = K.DATA[status];
      pageModel = { BASE, COUNT, LIMIT };
      break;
    }
    case K.ACTION.NEW: {
      status = K.RESPONSE.NEW;
      break;
    }
    case K.ACTION.DEL: {
      status = K.RESPONSE.DEL;
      break;
    }
    case K.ACTION.DIR: {
      status = K.RESPONSE.DIR;
      // store current galleryId and name
      store({ [K.DATA.GALLERY.ID]: input.id });
      store({ [K.DATA.GALLERY.NAME]: input.name });
      // attach data object for pagination support
      const { BASE, COUNT, LIMIT } = K.DATA[status];
      pageModel = { BASE, COUNT, LIMIT };
      break;
    }
    case K.ACTION.ADD: {
      status = K.RESPONSE.ADD;
      break;
    }
    case K.ACTION.REM: {
      status = K.RESPONSE.REM;
      break;
    }
    default:
      console.error(`Unknown action ${action}`);
      break;
  }
  let responseData;
  callStockService(action, input, pageModel)
    .then((data) => {
      responseData = data;
    }).catch((e) => {
      console.error(e);
      status = K.RESPONSE.ERROR;
      responseData = e;
    }).finally(() => {
      const payload = {
        target: K.TARGET.P,
        data: responseData,
        status,
      };
      console.log(payload);
      notify(payload, activeTab);
    });
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
  console.log(message, sender);
  // update window tab
  if (sender.tab) {
    activeTab = sender.tab;
  }
  /* TODO: Figure out how/where to store both Stock page tab ID and popup tab ID separately. Seems to work at first until activeTab is overwritten by popup tab */

  // if message contains an action that needs to be executed
  if (message.action) actionHandler(message);
  // otherwise handle status updates
  switch (message.status) {
    case 'CONTENT_READY':
      notify({ status: 'BACKGROUND_READY' }, activeTab);
      // eslint-disable-next-line no-case-declarations
      const environment = getEnvironment(sender.url);
      notify({ status: 'ENVIRONMENT_READY', data: environment, target: K.TARGET.P }, activeTab);
      store({ [K.DATA.ENV]: environment });
      break;
    case 'POPUP_READY':
      console.log('popup opened');
      // Maybe this will fix issue with activeTab getting overwritten?
      // ({ activeTab } = message); // equiv to activeTab = message.activeTab
      break;
    case 'TOKEN_READY':
      chrome.pageAction.show(sender.tab.id, () => {
        const manifest = chrome.runtime.getManifest();
        const tabId = sender.tab.id;
        chrome.pageAction.setIcon({
          tabId,
          path: manifest.page_action.active_icon,
        });
        chrome.pageAction.setTitle({
          tabId,
          title: manifest.page_action.active_title,
        });
      });
      console.log('token ready');
      break;
    case 'TOKEN_PROBLEM':
      // disable icon button until token available
      chrome.pageAction.hide(sender.tab.id, () => {
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

  // get id for popup tab
  retrieve(K.DATA.POPUP).then((id) => {
    console.log(`switching to tab ${id}`);
    chrome.tabs.get(id, openTab);
  }).catch(() => {
    // create popup and store tab id
    chrome.tabs.create({
      url: chrome.extension.getURL('popup.html'),
      active: true,
    }, (t) => {
      console.log(`created tab with id ${t.id}`);
      store({ [K.DATA.POPUP]: t.id });
    });
  });
});
