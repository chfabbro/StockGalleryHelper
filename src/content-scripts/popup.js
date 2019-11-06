const Popup = (() => {
  // add static constants
  const K = {
    // identifies listener target for message
    TARGET: {
      B: 'background',
      C: 'content',
      P: 'popup',
    },
    UI: {
      TABLE: '#galleryTable',
      MODAL: '#modal',
      MODAL_BODY: '#modal .modal-body',
      MODAL_TITLE: '#modalLabel',
      GALLERY_FORM: '#newGalleryForm',
      GALLERY_FORM_BTN: '#galleryFormSubmit',
      CONSENT_FORM: '#consentForm',
      REFRESH_BTN: '#get-galleries',
      WAIT: '#loader',
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

  /* transforms data from object to array */
  const prepData = ((data) => {
    const tableData = data.galleries.map((obj) => {
      const { id, name, nb_media: media } = obj;
      return [
        name,
        media,
        id,
      ];
    });
    return tableData;
  });

  const notify = (message) => {
    // sends message to background
    chrome.runtime.sendMessage(message);
  };

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
  const getActiveTabs = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // activeTab.windowId = parent window
      notify({
        status: 'POPUP_READY',
        activeTab: tabs[0],
      });
    });
  };

  const init = () => {
    // now get front tab id and notify background
    getActiveTabs();
  };

  return {
    K,
    init,
    notify,
    prepData,
  };
})();

export default Popup;
