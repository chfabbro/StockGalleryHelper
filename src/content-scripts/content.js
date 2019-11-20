class Content {
  static CONSTANTS = {
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
    // key values for local storage
    DATA: {
      TOKEN: 'access_token',
      GALLERY: {
        ID: 'galleryId',
        NAME: 'galleryName',
      },
      ENV: 'environment',
      POPUP: 'helper',
    },
    UI: {
      THUMB: {
        /* thumb icon parent */
        TARGET_ID: 'div.thumb-frame',
        /* icon grandparent */
        TARGET_PARENT: 'div.search-result-cell',
        /* data element with id */
        CONTENT: 'content-id',
        CLASS: 'gal',
        TITLE: 'Click to add to selected gallery',
      },
      MODAL_PARENT: {
        ID: '.all-content-wrapper',
      },
      STATUS: {
        TARGET_ID: 'div.lib-header-menu',
        CLASS_DEFAULT: 'gallery-banner',
        CLASS_ON: 'gallery-selected',
        TEXT_ID: '#galStatus',
        HTML: '<div class="gallery-banner"><div class="subheading">Gallery:<span id="galStatus">None</span></div></div>',
        STATE: {
          RESET: 0,
          SUCCESS: 1,
        },
      },
    },
  }

  // stores data in local storage
  static store(obj) {
    if (chrome.storage) {
      console.log(obj);
      chrome.storage.local.set(obj, () => {
        const key = Object.keys(obj)[0];
        chrome.storage.local.get(key, () => {
          console.log('Storing %s', key);
        });
      });
    }
  }

  // broadcasts messages to chrome runtime
  static notify(message) {
    chrome.runtime.sendMessage(message);
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

  // check for token value in cookie and extract it
  static getToken() {
    return document.cookie.replace(/(?:(?:^|.*;\s*)c?iat0\s*=\s*([^;]*).*$)|^.*$/, '$1');
  }
}

const {
  notify,
  store,
  getToken,
  retrieve,
  CONSTANTS: K,
} = Content;

async function doSetup() {
  const token = getToken();
  if (token !== '') {
    console.log('storing access token');
    store({ [K.DATA.TOKEN]: token });
    notify({ status: 'TOKEN_READY' });
  } else {
    console.log('no token found!');
    notify({ status: 'TOKEN_PROBLEM' });
  }
}

async function getCurrentGallery() {
  const id = await retrieve(K.DATA.GALLERY.ID);
  if (!id) {
    throw Error('No gallery selected in extension.');
  }
  return id;
}

// listen for incoming messages from extension
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message, sender);
  const { status } = message;
  switch (status) {
    case 'BACKGROUND_READY':
    case 'POPUP_READY':
      break;
    case K.UI.STATUS.STATE.SUCCESS:
      // notify listener to update banner
      document.dispatchEvent(new Event(status));
      break;
    case K.UI.STATUS.STATE.RESET:
      document.dispatchEvent(new Event(status));
      break;
    case 'PING': // sends ping back to background
      notify({ status: 'PONG' });
      break;
    default:
      break;
  }
});

doSetup().then(() => {
  notify({ status: 'CONTENT_READY' });
});

const $ = window.jQuery;
$(document).ready(() => {
  console.log('jQuery ready in content');

  const updateStatus = () => {};

  // opens modal
  // see https://www.webdesignerdepot.com/2012/10/creating-a-modal-window-with-html5-and-css3/
  const openModal = ((title, message) => {
    const { MODAL_PARENT: WINDOW } = K.UI;
    // html for modal
    const getModalHtml = () => `<div id="galleryHelperModal" class="modalDialog"><div><a href="#" title="Close" class="close">&times;</a><h1>${title}</h1><p>${message}</p></div></div>`;
    // create jquery obj
    const $modal = $(getModalHtml());
    // add close handler
    $(WINDOW.ID).on('click', '.modalDialog', (e) => {
      e.preventDefault();
      $modal.remove();
    });
    $modal.appendTo(WINDOW.ID);
  });

  // handles add event
  const onGalleryAdded = (e) => {
    e.stopPropagation();
    const $clicked = $(e.currentTarget);
    // get current gallery id
    getCurrentGallery()
      .then((id) => {
        notify({
          target: K.TARGET.B,
          data: {
            contentIds: $clicked.data(K.UI.THUMB.CONTENT),
            id,
          },
          action: K.ACTION.ADD,
        });
      }).catch((err) => {
        openModal('Warning', err.message);
      });
  };

  // inserts star icon button on each thumb
  // https://swizec.com/blog/how-to-properly-wait-for-dom-elements-to-show-up-in-modern-browsers/swizec/6663
  const insertThumbUi = () => {
    const {
      CONTENT, CLASS, TARGET_PARENT: PARENT, TARGET_ID: TARGET, TITLE,
    } = K.UI.THUMB;
    // recursively check if element exists
    if (!$(TARGET).length) {
      window.requestAnimationFrame(insertThumbUi);
    } else {
      // insert icon on thumbs and add listener
      const $parent = $(PARENT);
      $parent.append((idx) => {
        const id = $($parent.get(idx)).data(CONTENT);
        const $galBtn = $(document.createElement('div'));
        $galBtn.addClass(CLASS);
        $galBtn.attr('title', TITLE);
        $galBtn.on('click', onGalleryAdded);
        $galBtn.attr(`data-${CONTENT}`, id);
        return $galBtn;
      });
    }
  };

  // adds gallery status banner to Library page
  const insertStatusUi = () => {
    const {
      TARGET_ID: TARGET, HTML,
    } = K.UI.STATUS;
    if (!$(TARGET).length) {
      window.requestAnimationFrame(insertStatusUi);
    } else {
      // insert status element
      const $banner = $(TARGET).append(HTML);
      const { SUCCESS, RESET } = K.UI.STATUS.STATE;
      $banner.on(`${SUCCESS} ${RESET}`, (e) => {
        console.log('status event:', e);
      });
    }
  };

  insertThumbUi();
  insertStatusUi();
});
