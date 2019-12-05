/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// eslint-disable-next-line import/extensions
import Popup from './popup.js';

const $ = window.jQuery;
const {
  notify,
  retrieve,
} = Popup;

$(document).ready(() => {
  const K = {
    EVENTS: {
      OPTIONS: {
        SET: 'options-set',
        RESET: 'options-reset',
      },
    },
    DATA: {
      API_KEY: 'apiKey',
      URL: 'endpoint',
    },
  };
  const formData = {
    [K.DATA.API_KEY]: {
      name: K.DATA.API_KEY,
      value: '',
      id: '',
    },
    [K.DATA.URL]: {
      name: K.DATA.URL,
      value: '',
      id: '',
    },
  };

  const checkAndSaveData = (formVals) => {
    const retVals = formVals.forEach((entry) => {
      const { name } = entry;
      let val;
      if (name === K.DATA.URL) {
        val = new URL(`https://${entry.value}`);
      } else {
        const apiKeyTest = /^[a-zA-Z0-9]+$/;
        if (!apiKeyTest.test(entry.value)) {
          throw Error(`${name} has an illegal value.`);
        } else {
          val = entry.value;
        }
      }
      // store data locally
      formData[name].value = val;
    });
    return retVals;
  };

  const onFormSubmit = ((e) => {
    e.preventDefault();
    const $form = $(e.currentTarget);
    try {
      // validate data and save locally
      checkAndSaveData($form.serializeArray());
      // update in chrome storage
      notify()
    } catch (err) {
      console.error(err);
    }
    // TODO: use notify to store send values to bg script
    // TODO: at startup, check if values already exist and use retrieve
  });
  // check if values exist
  Promise.all([
    retrieve(K.DATA.API_KEY),
    retrieve(K.DATA.URL),
  ]).then((val) => {
    console.log(val);
  });

  $('form').on('submit', onFormSubmit);
});
