const stock = {};

stock.CFG = {
  URL: {
    PROD: '',
    
    
    
  },
  SETID: id => `/${id}`,
  HEADERS: (env, token) => {
    const key = {
      PROD: '',
      
      
    };
    return {
      Accept: 'application/vnd.adobe.stockcontrib.v2',
      'x-api-key': key[env],
      Authorization: `Bearer ${token}`,
    };
  },
};

stock.http = {
  // gets a user-friendly error
  parseErrors: async (res) => {
    let msg = await res;
    const { code } = msg;
    switch (code) {
      case 110:
        msg = 'You are not a Stock Contributor. You first visit <a href="https://contributor.stock.adobe.com">Adobe Stock Contributor</a> to register.';
        break;
      case 111:
        msg = 'You must be signed into Adobe Stock to use this extension. Close the popup and sign into Stock in the main window before re-opening.';
        break;
      case 2401:
        msg = 'Gallery ID is not valid for your account.';
        break;
      case 404:
        msg = 'There is a problem with the URL.';
        break;
      default:
        msg = 'Adobe Stock is reporting an error.';
    }
    return msg;
  },
  // executes fetch and returns promise
  send: (req) => {
    // const { params } = req;
    const url = new URL(req.url);
    // url.search = new URLSearchParams(params);
    const headers = stock.CFG.HEADERS(req.env, req.token);
    const { method } = req; // eslint: method = req.method
    const body = (method === 'POST') ? req.body : null;
    const request = fetch(url, {
      method, headers, body,
    }).then((res) => {
      if (!res.ok) {
        console.error(res.statusText);
        const msg = (res.status === 404)
          // adobe.io returns HTML 404 error!
          // create "code" 404
          ? stock.http.parseErrors({ code: res.status })
          // see https://stackoverflow.com/a/54115314
          : stock.http.parseErrors(res.clone().json());
        msg.then((e) => {
          throw e;
        }).catch((e) => {
          throw e;
        });
      }
      // parse JSON from fetch body
      // see https://developer.mozilla.org/en-US/docs/Web/API/Body/json
      return res.json();
    }).catch((e) => {
      throw e;
    });
    return request;
  },
};

stock.getGalleries = async (env, token) => {
  // for STATIC testing
  const url = chrome.runtime.getURL('/background/other/getgalleries3.json');
  // const url = `${stock.CFG.URL[env]}`;
  const req = {
    url, token, env, method: 'GET',
  };
  const data = await stock.http.send(req);
  return data;
};

stock.createStockGallery = async (env, token) => {
  stock.getGalleries();
};
