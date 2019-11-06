class Content {
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

  // broadcasts messages to chrome runtime
  static notify(message) {
    chrome.runtime.sendMessage(message);
  }

  // check for token value in cookie and extract it
  static getToken() {
    return document.cookie.replace(/(?:(?:^|.*;\s*)c?iat0\s*=\s*([^;]*).*$)|^.*$/, '$1');
  }
}

const { notify, store, getToken } = Content;

function doSetup() {
  const token = getToken();
  if (token !== '') {
    console.log('storing access token');
    store({ access_token: token });
    notify({ status: 'TOKEN_READY' });
  } else {
    console.log('no token found!');
    notify({ status: 'TOKEN_PROBLEM' });
  }
}

// listen for incoming messages from extension
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message, sender);
  switch (message.status) {
    case 'BACKGROUND_READY':
    case 'PAGE_NAVIGATION':
    case 'POPUP_READY':
      break;
    case 'PING': // sends ping back to background
      notify({ status: 'PONG' });
      break;
    default:
      break;
  }
});

doSetup();
notify({ status: 'CONTENT_READY' });
