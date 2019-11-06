// eslint-disable-next-line import/extensions
import Popup from './popup.js';

const $ = window.jQuery;
const {
  K,
  init,
  notify,
  prepData,
} = Popup;
let galleryData = null;

$(document).ready(() => {
  // clone dynamic content
  const $galleryForm = $(K.UI.GALLERY_FORM).clone();
  const $consentForm = $(K.UI.CONSENT_FORM).clone();
  const $loader = $(K.UI.WAIT).clone();

  // initialize table
  const $dt = $(K.UI.TABLE).DataTable({
    columns: [
      { name: 'name' },
      { name: 'nb_media', type: 'num' },
      { name: 'id' },
    ],
    select: {
      style: 'single',
    },
    dom: 'Bfrtip', // makes buttons visible
    buttons: [
      {
        // adds new gallery
        text: 'Add',
        action: () => {
          // inserts form content in modal
          $(K.UI.MODAL_TITLE).text('Create a new gallery');
          $(K.UI.MODAL_BODY).append($galleryForm);
          // opens modal
          $(K.UI.MODAL).modal('show');
        },
      },
      {
        // deletes existing gallery
        extend: 'selected',
        text: 'Delete',
        action: (e, dt) => {
          console.log(dt.rows({ selected: true }).indexes().length);
        },
      },
      // 'copy',
      'csv',
    ],
  });
  /*
  // common button listener (if needed)
  $dt.on('buttons-action', (e, api) => {
    console.log(`Button ${api.text()} was activated`);
  });
  // select listener
  $dt.on('select', (e, dt, type, idx) => {
    if (type === 'row') {
      const data = $dt.rows(idx).data();
      console.log(data);
    }
  });
  */

  // VIEW

  // show/hide loader
  const toggleLoader = (show) => {
    if (show) {
      $(K.UI.MODAL_TITLE).text('Loading data...');
      $(K.UI.MODAL_BODY).append($loader);
      // opens modal
      $(K.UI.MODAL).modal('show');
      $(K.UI.MODAL).modal('handleUpdate');
    } else {
      setTimeout(() => {
        $(K.UI.MODAL).modal('hide');
      }, 1000);
    }
  };

  // HANDLERS

  // gallery form handler
  const onGalleryFormSubmit = (e) => {
    // override submit behavior
    e.preventDefault();
    // get data and clear form
    const name = $galleryForm.serializeArray()[0].value;
    $galleryForm[0].reset();
    console.log(`creating new gallery '${name}'`);
    // remove form
    $(K.UI.MODAL_BODY).children().detach();
    // show loader
    // TODO: toggleLoader(true);
    // send request
    notify({
      action: K.ACTION.NEW,
      data: name,
    });
  };

  // LISTENERS

  $galleryForm.on('submit', onGalleryFormSubmit);

  // empty modal when closed
  $(K.UI.MODAL).on('hidden.bs.modal', () => {
    $(K.UI.MODAL_BODY).children().detach();
  });

  // Get list of galleries
  $(K.UI.REFRESH_BTN).on('click', () => {
    toggleLoader(true);
    notify({ action: K.ACTION.GET });
  });

  // Create gallery

  // listen for messages from content and popup script
  chrome.runtime.onMessage.addListener((message, sender) => {
    console.log(message, sender);

    // message is targeted to popup
    if (message.target && message.target === K.TARGET.P) {
      switch (message.status) {
        case K.RESPONSE.GET:
          // convert data to table array
          galleryData = prepData(message.data);
          $dt.clear().rows.add(galleryData).draw();
          // dismiss modal if present
          toggleLoader(false);
          break;
        default:
          break;
      }
    }
  });
  init();
});
