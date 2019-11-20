// eslint-disable-next-line import/extensions
import Popup from './popup.js';

const $ = window.jQuery;
const {
  K,
  init,
  notify,
  retrieve,
  prepData,
  arrayToObj,
} = Popup;

$(document).ready(() => {
  // stores environment
  let Env;

  // clone dynamic content
  const $galleryForm = $(K.UI.GALLERY.FORM.ID).clone();

  // VIEW
  // -------------
  // show/hide loader
  const toggleLoader = (show) => {
    const $loader = $(K.UI.WAIT).clone();
    if (show) {
      $(K.UI.MODAL.TITLE).text('Loading data...');
      $(K.UI.MODAL.BODY).append($loader);
      // opens modal
      $(K.UI.MODAL.ID).modal('show');
      $(K.UI.MODAL.ID).modal('handleUpdate');
    } else {
      setTimeout(() => {
        $(K.UI.MODAL.BODY).remove($loader);
        $(K.UI.MODAL.ID).modal('hide');
      }, 1000);
    }
  };

  // show error notification
  const showAlert = ((msg, type) => {
    const { ALERT } = K.UI;
    const $alert = $(ALERT.ID).clone();
    // set color style ('primary' or 'danger')
    $alert.removeClass(`${ALERT.SUCCESS.STYLE} ${ALERT.ERROR.STYLE}`);
    $alert.addClass(type.STYLE);
    // set title ('error' or 'success')
    $alert.find(ALERT.TITLE).text(type.TITLE);
    $alert.find(ALERT.TEXT).text(msg);
    $alert.alert();
    $(ALERT.DIV).append($alert);
  });

  // clear modal
  const emptyModal = (() => {
    $(K.UI.MODAL.BODY).children().detach();
  });

  // toggle banner state and text
  const setStatus = ((state,
    id = K.UI.STATUS.ID.DEFAULT,
    name = K.UI.STATUS.NAME.DEFAULT,
    count = K.UI.STATUS.COUNT.DEFAULT) => {
    const {
      BANNER, BG, ID, NAME, COUNT,
    } = K.UI.STATUS;
    // update text and ID
    $(NAME.ID).text(name);
    $(COUNT.ID).text(count);
    $(ID.ID).attr('data-id', id);
    // set ui state
    const styleState = `STYLE_${state}`;
    [BANNER, BG, NAME, COUNT].forEach((ui) => {
      $(ui.ID).removeClass(`${ui.STYLE_SUCESS} ${ui.STYLE_RESET}`);
      $(ui.ID).addClass(`${ui[styleState]}`);
    });
    console.log(`Status set to STATE_${state}`);
  });

  // HANDLERS
  // -------------
  // new gallery form handler
  const onGalleryFormSubmit = (e) => {
    // override submit behavior
    e.preventDefault();
    // get escaped data and clear form
    const name = $galleryForm.serializeArray()[0].value;
    $galleryForm[0].reset();
    console.log(`creating new gallery '${name}'`);
    // remove form
    emptyModal();
    // show loader
    toggleLoader(true);
    // send request
    notify({
      action: K.ACTION.NEW,
      data: name,
    });
  };

  // get confirmation
  const onApprovalNeeded = (ui, onConfirm, args = []) => {
    emptyModal();
    const $consentForm = $(K.UI.CONSENT.ID).clone();
    $consentForm.find(K.UI.CONSENT.MSG).html(ui.msg);
    $(K.UI.MODAL.TITLE).text(ui.title);
    $(K.UI.MODAL.COLOR).addClass(ui.color);
    $(K.UI.MODAL.BODY).append($consentForm);
    // opens modal
    // $(K.UI.MODAL.ID).modal('show');
    $(K.UI.MODAL.ID).on('shown.bs.modal', () => $consentForm.on('submit', ((e) => {
      e.preventDefault();
      // remove form
      emptyModal();
      // show loader
      toggleLoader(true);
      onConfirm(...args);
    }))).modal('show');
  };

  // delete gallery handler
  const onDeleteRow = (data) => {
    // get confirmation
    const ui = {
      msg: `Please confirm you want to delete gallery "<mark>${data.name}</mark>" with id ${data.id}. This cannot be undone.`,
      title: 'Are you sure?',
      color: 'bg-warning',
    };
    onApprovalNeeded(ui, () => {
      console.log('deleting gallery...');
      // send request
      notify({
        action: K.ACTION.DEL,
        data: data.id,
      });
    });
  };

  // delete content handler
  const onDeleteContent = (data) => {
    // get confirmation
    const ui = {
      msg: `<h6><img src="${data.thumbnail_url}" class="img-fluid img-thumbnail float-sm-right">Please confirm you want to remove asset <mark>${data.id}</mark>, ${data.title}</h6>`,
      title: 'Confirm removal',
      color: 'bg-warning',
    };
    // extract gallery guid
    const galleryId = null || data.href.match(/\/(\w+)\/\d+$/)[1];
    onApprovalNeeded(ui, () => {
      console.log('deleting content...');
      // send request
      notify({
        action: K.ACTION.REM,
        data: {
          contentId: data.id,
          id: galleryId,
        },
      });
    });
  };

  // handles refresh of gallery content
  // could be triggered by button or link click
  const refreshContents = ((row) => {
    retrieve(K.DATA.ENV).then((data) => {
      Env = data;
      console.log(`updating environment to ${data}`);
      emptyModal();
      toggleLoader(true);
      return notify({
        action: K.ACTION.DIR,
        data: {
          id: row.id,
          name: row.name,
        },
      });
    });
  });

  // handles click of button and fetches data needed
  const onContentRefreshClick = (() => {
    Promise.all([
      retrieve(K.DATA.GALLERY.ID),
      retrieve(K.DATA.GALLERY.NAME),
    ]).then(([id, name]) => {
      if (!id) {
        const warning = 'No gallery selected';
        console.warn(warning);
        showAlert(warning, K.UI.ALERT.WARNING);
      } else {
        // cast data as object
        const row = { id, name };
        // now call refresh
        console.log(row);
        refreshContents(row);
      }
    });
  });

  // LISTENERS
  // -------------
  // gallery form submission
  $galleryForm.on('submit', onGalleryFormSubmit);

  // refresh table size when tab is viewed
  $('a[data-toggle="tab"]').on('shown.bs.tab', () => {
    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    console.log('adjusted');
  });

  // gallery refresh button
  $(K.UI.GALLERY.REFRESH).on('click', () => {
    emptyModal();
    toggleLoader(true);
    notify({ action: K.ACTION.GET });
  });

  // gallery link selector
  /* disabled for now: will use table row selector
  $(K.UI.GALLERY.LINK.DEL).on('click', K.UI.GALLERY.LINK.TARG, (e) => {
    e.preventDefault();
    // get link name and id
    // TODO
    console.log(console.log(e.currentTarget));
    // switch to View tab
    $(K.UI.CONTENTS.TAB).tab('show');
    onContentsRefresh();
  });
  */

  // content list refresh button
  $(K.UI.CONTENTS.REFRESH).on('click', onContentRefreshClick);

  // empty modal when closed
  $(K.UI.MODAL.ID).on('hidden.bs.modal', () => {
    emptyModal();
  });

  // common table options
  const dtConfig = {
    // scrollY: '100vh',
    // scrollCollapse: true,
    fixedHeader: true,
    autoWidth: false,
    responsive: true,
    paging: true,
    pageLength: 50,
    lengthMenu: [[25, 50, 100, -1], [25, 50, 100, 'All']],
    select: {
      style: 'single',
      className: 'rowSelect',
    },
    dom: 'lBfrtip', // makes buttons visible
  };

  // content table
  const $ct = $(K.UI.CONTENTS.TABLE.ID).DataTable({
    ...dtConfig,
    // input data is plain array
    columnDefs: [
      {
        name: 'thumb',
        targets: [0],
        data: 5,
        render: ((url) => `<img class="table-thumb" src="${url}">`),
      },
      {
        // name when referencing the data
        name: 'id',
        targets: [1],
        data: 0,
        render: ((id) => `<a class="bg-white" href="${K.STOCK_URL[Env]}${id}" target="_blank" title="Open in new tab">${id}</a>`),
      },
      {
        name: 'title',
        targets: [2],
        data: 1,
        // https://datatables.net/blog/2016-02-26
        render: (data) => ((data && data.length > 20) ? `${data.substr(0, 20)}…` : data),
      },
      {
        // combines columns 2 and 3 (width/height)
        name: 'size',
        data: 2,
        targets: [3],
        render: ((...[width, , row]) => {
          const height = row[3];
          return `${width}&nbsp;&times;&nbsp;${height}`;
        }),
      },
      {
        name: 'downloads',
        targets: [4],
        // column 3 (height) is skipped
        data: 4,
        type: 'num',
      },
      {
        // hide href column
        name: 'href',
        data: 7,
        visible: false,
      },
    ],
    buttons: [
      // deletes item
      {
        // connects to 'select' API
        extend: 'selected',
        text: 'Remove',
        action: (e, ct) => {
          const row = ct.rows({ selected: true }).data()[0];
          // cast row array to object
          const data = arrayToObj(K.DATA.getContentResponse.MAP, row);
          console.log('selected', data);
          onDeleteContent(data);
        },
      },
      {
        extend: 'csv',
        text: 'Export CSV',
        filename: 'Adobe_Stock_Gallery_Content',
      },
      // 'colvis',
    ],
    language: {
      emptyTable: 'Selected gallery is empty.',
    },
  });

  // initialize gallery table
  const $gt = $(K.UI.GALLERY.TABLE.ID).DataTable({
    ...dtConfig,
    columns: [
      {
        name: 'name',
        // render as hyperlink
        // eslint-disable-next-line max-len
        // render: ((name) => `<a class="bg-white" rel="next" href="#${name}" title="View gallery">${name}</a>`),
      },
      { name: 'nb_media', type: 'num' },
      {
        name: 'id',
      },
    ],
    buttons: [
      {
        // adds new gallery
        text: 'Add',
        action: () => {
          emptyModal();
          // inserts form content in modal
          $(K.UI.MODAL.TITLE).text('Create a new gallery');
          $(K.UI.MODAL.BODY).append($galleryForm);
          // opens modal
          $(K.UI.MODAL.ID).modal('show');
        },
      },
      {
        // deletes existing gallery
        extend: 'selected',
        text: 'Delete',
        action: (e, gt) => {
          const row = gt.rows({ selected: true }).data()[0];
          // cast row array to object
          const data = arrayToObj(K.DATA.getGalleriesResponse.MAP, row);
          console.log('selected', data);
          onDeleteRow(data);
        },
      },
      {
        extend: 'csv',
        text: 'Export CSV',
        filename: 'Adobe_Stock_Gallery_List',
      },
      // 'copy',
      // 'colvis',
    ],
  });

  // listen for selection events
  $gt.on('select', (e, dt, type, indexes) => {
    if (type === 'row') {
      const row = dt.rows().data()[indexes];
      const data = arrayToObj(K.DATA.getGalleriesResponse.MAP, row);
      console.log('selected', data);
      // update UI with selected gallery
      refreshContents(data);
    }
  });

  // listen for messages from content and popup script
  chrome.runtime.onMessage.addListener((message, sender) => {
    console.log(message, sender);

    // message is targeted to popup
    if (message.target && message.target === K.TARGET.P) {
      const { data, status } = message;
      switch (status) {
        case K.RESPONSE.GET:
          // convert data to table array
          $gt.clear().rows.add(prepData(data, status)).draw();
          // dismiss modal if present
          toggleLoader(false);
          break;
        case K.RESPONSE.NEW:
          // dismiss modal
          toggleLoader(false);
          // eslint-disable-next-line no-case-declarations
          const { title } = (data.gallery && data.gallery.title) ? data.gallery : { title: 'unknown' };
          showAlert(`New gallery ${title} created.`, K.UI.ALERT.SUCCESS);
          // show success message and refresh
          setTimeout(() => {
            toggleLoader(true);
            notify({ action: K.ACTION.GET });
          }, 1500);
          break;
        case K.RESPONSE.DIR: {
          $ct.clear()
            .rows.add(prepData(data, status))
            .draw()
            .columns.adjust();
          // get current gallery and update ui
          const count = data[K.DATA.COUNT] || 0;
          Promise.all([
            retrieve(K.DATA.GALLERY.ID),
            retrieve(K.DATA.GALLERY.NAME),
          ]).then(([id, name]) => {
            setStatus(K.UI.STATUS.STATE.SUCCESS, id, name, count);
            // update status banner on Stock site (content script)
            notify({
              target: K.TARGET.C,
              status: K.UI.STATUS.STATE.SUCCESS,
              data: { id, name, count },
            });
          });
          toggleLoader(false);
          break;
        }
        case K.RESPONSE.REM:
          $ct.rows().deselect();
          onContentRefreshClick();
          break;
        case K.RESPONSE.DEL:
          $gt.rows().deselect();
          // TODO: Finish this and update local storage data
          setStatus(K.UI.STATUS.STATE.RESET);
          notify({ action: K.ACTION.GET });
          break;
        case K.RESPONSE.ERROR:
          // dismiss modal
          toggleLoader(false);
          // show error
          showAlert(message.data, K.UI.ALERT.ERROR);
          break;
        default:
          console.log('other:', status, data);
          break;
      }
    }
  });
  init();
});
